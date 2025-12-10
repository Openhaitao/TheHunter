import OpenAI from 'openai';

interface Config {
  siliconFlowBaseUrl: string;
  siliconFlowApiKey: string;
  siliconFlowModel: string;
}

const getConfig = async (): Promise<Config> => {
  return new Promise((resolve) => {
    chrome.storage.local.get(
      ['siliconFlowBaseUrl', 'siliconFlowApiKey', 'siliconFlowModel'],
      (items) => {
        resolve({
          siliconFlowBaseUrl: items.siliconFlowBaseUrl || 'https://api.siliconflow.cn/v1',
          siliconFlowApiKey: items.siliconFlowApiKey || '',
          siliconFlowModel: items.siliconFlowModel || 'deepseek-ai/DeepSeek-V2.5',
        });
      }
    );
  });
};

export const analyzeContent = async (
  type: 'contact' | 'product',
  data: { title: string; url: string; content: string }
) => {
  const config = await getConfig();

  if (!config.siliconFlowApiKey) {
    throw new Error('请先在设置页面配置 API Key');
  }

  const client = new OpenAI({
    baseURL: config.siliconFlowBaseUrl,
    apiKey: config.siliconFlowApiKey,
    dangerouslyAllowBrowser: true, // Required for running in browser extension
  });

  const systemPrompt = `You are a helpful assistant that extracts structured information from web pages for an investor.
Output strictly in valid JSON format. Do not include markdown formatting (like \`\`\`json).
If information is missing, use null or empty string.`;

  let userPrompt = '';

  if (type === 'contact') {
    userPrompt = `我会发给你一位用户的 Linkedin 或其他社交媒体的主页信息，请你提取信息并整理。

目标字段 (Target Fields):
- name: 人员名称（从页面内容中提取真实姓名，不能为空）
- summary: 个人简介（一段话，包含：个人名称+教育背景+工作经历。格式示例：海涛，XX 公司 CEO，毕业于 XX 大学，曾就职于：XX，担任 XX 职位。不能为空）
- url: "${data.url}"

页面内容 (Page Content):
${data.content.substring(0, 10000)}${data.content.length > 10000 ? '\n...(内容已截断)' : ''}`;
  } else {
    userPrompt = `我会给你这个产品的信息，请你帮助我总结出这个产品介绍。

目标字段 (Target Fields):
- product_name: 产品名称（从页面内容中提取，不能为空）
- summary: 产品简介（100-200字，描述产品是什么、有什么功能、解决什么问题。注意：语言要客观，不要有倾向性。不能为空）
- url: "${data.url}"

页面内容 (Page Content):
${data.content.substring(0, 10000)}${data.content.length > 10000 ? '\n...(内容已截断)' : ''}`;
  }

  const completion = await client.chat.completions.create({
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    model: config.siliconFlowModel,
    response_format: { type: "json_object" },
    max_tokens: 1000, // 限制响应长度
  });

  const content = completion.choices[0].message.content;
  if (!content) throw new Error('No response from LLM');

  // 清理可能的 markdown 代码块标记
  let cleanedContent = content.trim();
  if (cleanedContent.startsWith('```json')) {
    cleanedContent = cleanedContent.replace(/^```json\s*/, '').replace(/\s*```$/, '');
  } else if (cleanedContent.startsWith('```')) {
    cleanedContent = cleanedContent.replace(/^```\s*/, '').replace(/\s*```$/, '');
  }

  try {
    const parsed = JSON.parse(cleanedContent);
    
    // 验证必要字段并确保 url 存在
    if (type === 'contact') {
      if (!parsed.url) {
        parsed.url = data.url;
      }
      // 如果 name 或 summary 为空，给出警告
      if (!parsed.name || parsed.name.trim() === '') {
        console.warn('警告: name 字段为空');
      }
      if (!parsed.summary || parsed.summary.trim() === '') {
        console.warn('警告: summary 字段为空');
      }
    } else {
      if (!parsed.url) {
        parsed.url = data.url;
      }
      if (!parsed.product_name || parsed.product_name.trim() === '') {
        console.warn('警告: product_name 字段为空');
      }
      if (!parsed.summary || parsed.summary.trim() === '') {
        console.warn('警告: summary 字段为空');
      }
    }
    
    return parsed;
  } catch (e) {
    console.error('Failed to parse JSON:', content);
    console.error('Cleaned content:', cleanedContent);
    throw new Error('LLM output was not valid JSON');
  }
};

