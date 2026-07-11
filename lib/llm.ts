import type { AISettings, FieldDef, PageData, Template } from './types';
import { DEFAULT_PROMPT } from './presets';
import { pageToPromptBlock } from './extract';

function fieldsToPromptBlock(fields: FieldDef[]): string {
  return fields
    .map((f) => {
      const opt = f.options?.length ? `（只能从这些值中选：${f.options.join(' / ')}）` : '';
      return `- ${f.key}（${f.type}）：${f.aiHint ?? f.label}${opt}`;
    })
    .join('\n');
}

export function buildPrompt(template: Template, page: PageData): string {
  const base = template.prompt?.trim() || DEFAULT_PROMPT;
  return base
    .replaceAll('{{fields}}', fieldsToPromptBlock(template.fields))
    .replaceAll('{{page}}', pageToPromptBlock(page));
}

/** 宽容解析：兼容被 ```json 包裹或前后带说明文字的输出 */
function parseJsonLoose(raw: string): Record<string, unknown> {
  const stripped = raw.replace(/```json|```/g, '').trim();
  const start = stripped.indexOf('{');
  const end = stripped.lastIndexOf('}');
  if (start === -1 || end === -1) throw new Error('AI 未返回 JSON');
  return JSON.parse(stripped.slice(start, end + 1));
}

export async function extractWithAI(
  ai: AISettings,
  template: Template,
  page: PageData,
): Promise<Record<string, string>> {
  if (!ai.apiKey) throw new Error('请先在「设置」里填写 AI API Key');
  const resp = await fetch(`${ai.baseUrl.replace(/\/$/, '')}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${ai.apiKey}`,
    },
    body: JSON.stringify({
      model: ai.model,
      messages: [{ role: 'user', content: buildPrompt(template, page) }],
      temperature: 0.1,
    }),
  });
  if (!resp.ok) {
    const body = await resp.text();
    throw new Error(`AI 请求失败 (${resp.status}): ${body.slice(0, 200)}`);
  }
  const data = await resp.json();
  const content: string = data.choices?.[0]?.message?.content ?? '';
  const parsed = parseJsonLoose(content);
  const values: Record<string, string> = {};
  for (const f of template.fields) {
    const v = parsed[f.key];
    values[f.key] = v == null ? '' : String(v);
  }
  return values;
}
