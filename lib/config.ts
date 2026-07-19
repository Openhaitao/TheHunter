export const PROFILE_DRAFT_KEY = 'thehunter.profileDraft.v1';
export const FEISHU_WEBHOOK_KEY = 'thehunter.feishuWebhookUrl.v1';
export const AI_CONFIG_KEY = 'thehunter.aiConfig.v1';

export type AiConfig = {
  baseUrl: string;
  apiKey: string;
  model: string;
};

function storageArea() {
  return browser.storage?.local;
}

export async function getLocalValue<T>(key: string): Promise<T | undefined> {
  const area = storageArea();
  if (area) {
    const stored = await area.get(key);
    return stored[key] as T | undefined;
  }

  const rawValue = window.localStorage.getItem(key);
  if (!rawValue) return undefined;
  try {
    return JSON.parse(rawValue) as T;
  } catch {
    return undefined;
  }
}

export async function setLocalValue<T>(key: string, value: T) {
  const area = storageArea();
  if (area) {
    await area.set({ [key]: value });
    return;
  }
  window.localStorage.setItem(key, JSON.stringify(value));
}

export async function removeLocalValue(key: string) {
  const area = storageArea();
  if (area) {
    await area.remove(key);
    return;
  }
  window.localStorage.removeItem(key);
}
