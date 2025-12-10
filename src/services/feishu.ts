import axios from 'axios';

interface Config {
  feishuContactWebhook: string;
  feishuProductWebhook: string;
}

const getConfig = async (): Promise<Config> => {
  return new Promise((resolve) => {
    chrome.storage.local.get(
      ['feishuContactWebhook', 'feishuProductWebhook'],
      (items) => {
        resolve({
          feishuContactWebhook: items.feishuContactWebhook || '',
          feishuProductWebhook: items.feishuProductWebhook || '',
        });
      }
    );
  });
};

export const sendToFeishu = async (type: 'contact' | 'product', data: any) => {
  const config = await getConfig();
  
  let webhookUrl = '';
  if (type === 'contact') {
    webhookUrl = config.feishuContactWebhook;
  } else {
    webhookUrl = config.feishuProductWebhook;
  }

  if (!webhookUrl) {
    throw new Error(`未配置 ${type === 'contact' ? '联系人' : '产品'} Webhook 地址`);
  }

  // Wrap data if necessary, or send as is. 
  // Usually for Feishu Base Automation, sending a JSON object is fine.
  // We'll send the data object directly.
  try {
    await axios.post(webhookUrl, data);
    return true;
  } catch (error) {
    console.error('Feishu Webhook Error:', error);
    throw new Error('推送到飞书失败，请检查 Webhook 地址是否有效');
  }
};

