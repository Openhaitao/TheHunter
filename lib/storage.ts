import { useEffect, useState } from 'react';
import type { Settings, Template } from './types';
import { PRESET_TEMPLATES } from './presets';

export const DEFAULT_SETTINGS: Settings = {
  ai: {
    baseUrl: 'https://api.siliconflow.cn/v1',
    apiKey: '',
    model: 'Qwen/Qwen2.5-72B-Instruct',
  },
  manageEmbedUrl: '',
};

const KEY_SETTINGS = 'settings';
const KEY_TEMPLATES = 'templates';

export async function loadSettings(): Promise<Settings> {
  const res = await browser.storage.sync.get(KEY_SETTINGS);
  return { ...DEFAULT_SETTINGS, ...(res[KEY_SETTINGS] ?? {}) };
}

export async function saveSettings(s: Settings): Promise<void> {
  await browser.storage.sync.set({ [KEY_SETTINGS]: s });
}

export async function loadTemplates(): Promise<Template[]> {
  const res = await browser.storage.sync.get(KEY_TEMPLATES);
  const stored = res[KEY_TEMPLATES] as Template[] | undefined;
  if (!stored || stored.length === 0) return PRESET_TEMPLATES;
  return stored;
}

export async function saveTemplates(templates: Template[]): Promise<void> {
  await browser.storage.sync.set({ [KEY_TEMPLATES]: templates });
}

/** React hook：读取并订阅 storage.sync 中的值 */
function useStoredValue<T>(load: () => Promise<T>, watchKey: string): [T | null, () => void] {
  const [value, setValue] = useState<T | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let alive = true;
    load().then((v) => alive && setValue(v));
    const listener = (changes: Record<string, unknown>, area: string) => {
      if (area === 'sync' && watchKey in changes) load().then((v) => alive && setValue(v));
    };
    browser.storage.onChanged.addListener(listener);
    return () => {
      alive = false;
      browser.storage.onChanged.removeListener(listener);
    };
  }, [tick]);

  return [value, () => setTick((t) => t + 1)];
}

export function useSettings() {
  return useStoredValue<Settings>(loadSettings, KEY_SETTINGS);
}

export function useTemplates() {
  return useStoredValue<Template[]>(loadTemplates, KEY_TEMPLATES);
}
