import { useEffect, useState } from 'react';
import {
  AI_CONFIG_KEY,
  FEISHU_WEBHOOK_KEY,
  getLocalValue,
  setLocalValue,
  type AiConfig,
} from '../lib/config';

type ActionState = 'idle' | 'working' | 'success' | 'error';

const EMPTY_AI_CONFIG: AiConfig = {
  baseUrl: '',
  apiKey: '',
  model: '',
};

const inputClass =
  'h-9 w-full rounded-[9px] border border-[#d9d8d2] bg-[#fbfaf7] px-3 text-[13px] text-[#22221f] placeholder:text-[#b1b0aa] transition-colors hover:border-[#c8c7c1] focus:border-[#96958f] focus:outline-none';

function SettingField({
  label,
  value,
  placeholder,
  type = 'text',
  onChange,
}: {
  label: string;
  value: string;
  placeholder: string;
  type?: 'text' | 'url' | 'password';
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[11px] font-medium text-[#65645f]">{label}</span>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        autoComplete={type === 'password' ? 'off' : undefined}
        onChange={(event) => onChange(event.target.value)}
        className={inputClass}
      />
    </label>
  );
}

function normalizeHttpsUrl(value: string) {
  const url = new URL(value.trim());
  if (url.protocol !== 'https:') throw new Error('HTTPS required');
  return url.toString().replace(/\/+$/, '');
}

export default function SettingsPage() {
  const [aiConfig, setAiConfig] = useState<AiConfig>(EMPTY_AI_CONFIG);
  const [webhookUrl, setWebhookUrl] = useState('');
  const [aiSaveState, setAiSaveState] = useState<ActionState>('idle');
  const [testState, setTestState] = useState<ActionState>('idle');
  const [webhookSaveState, setWebhookSaveState] = useState<ActionState>('idle');

  useEffect(() => {
    void Promise.all([
      getLocalValue<AiConfig>(AI_CONFIG_KEY),
      getLocalValue<string>(FEISHU_WEBHOOK_KEY),
    ]).then(([savedAiConfig, savedWebhook]) => {
      if (savedAiConfig) setAiConfig({ ...EMPTY_AI_CONFIG, ...savedAiConfig });
      if (typeof savedWebhook === 'string') setWebhookUrl(savedWebhook);
    });
  }, []);

  const updateAiConfig = (key: keyof AiConfig, value: string) => {
    setAiConfig((current) => ({ ...current, [key]: value }));
    setAiSaveState('idle');
    setTestState('idle');
  };

  const validatedAiConfig = () => ({
    baseUrl: normalizeHttpsUrl(aiConfig.baseUrl),
    apiKey: aiConfig.apiKey.trim(),
    model: aiConfig.model.trim(),
  });

  const requestOriginPermission = async (urlString: string) => {
    const url = new URL(urlString);
    const granted = await browser.permissions.request({ origins: [`${url.origin}/*`] });
    if (!granted) throw new Error('Host permission denied');
  };

  const saveAiConfig = async () => {
    setAiSaveState('working');
    try {
      const config = validatedAiConfig();
      if (!config.apiKey || !config.model) throw new Error('Missing AI config');
      await requestOriginPermission(config.baseUrl);
      await setLocalValue(AI_CONFIG_KEY, config);
      setAiConfig(config);
      setAiSaveState('success');
    } catch {
      setAiSaveState('error');
    }
  };

  const testAiConnection = async () => {
    setTestState('working');
    try {
      const config = validatedAiConfig();
      if (!config.apiKey || !config.model) throw new Error('Missing AI config');
      await requestOriginPermission(config.baseUrl);

      const response = await fetch(`${config.baseUrl}/models`, {
        headers: { Authorization: `Bearer ${config.apiKey}` },
      });
      if (!response.ok) throw new Error('Connection failed');

      await setLocalValue(AI_CONFIG_KEY, config);
      setAiConfig(config);
      setAiSaveState('success');
      setTestState('success');
    } catch {
      setTestState('error');
    }
  };

  const saveWebhook = async () => {
    setWebhookSaveState('working');
    try {
      const normalizedUrl = normalizeHttpsUrl(webhookUrl);
      await requestOriginPermission(normalizedUrl);
      await setLocalValue(FEISHU_WEBHOOK_KEY, normalizedUrl);
      setWebhookUrl(normalizedUrl);
      setWebhookSaveState('success');
    } catch {
      setWebhookSaveState('error');
    }
  };

  const aiReady = Boolean(
    aiConfig.baseUrl.trim() && aiConfig.apiKey.trim() && aiConfig.model.trim(),
  );

  return (
    <div className="scrollbar-hidden h-full overflow-y-auto px-4 py-4">
      <div className="mx-auto max-w-[460px] space-y-7">
        <section>
          <div className="mb-4">
            <h2 className="m-0 text-[12px] font-medium text-[#2c2c28]">AI 解析</h2>
            <p className="mb-0 mt-1 text-[10px] leading-4 text-[#9a9993]">
              支持 OpenAI-compatible API；人物页内容仅在点击 AI 解析时发送。
            </p>
          </div>

          <div className="space-y-3.5">
            <SettingField
              label="API 地址（Base URL）"
              type="url"
              value={aiConfig.baseUrl}
              placeholder="https://api.siliconflow.cn/v1"
              onChange={(value) => updateAiConfig('baseUrl', value)}
            />
            <SettingField
              label="API Key"
              type="password"
              value={aiConfig.apiKey}
              placeholder="sk-..."
              onChange={(value) => updateAiConfig('apiKey', value)}
            />
            <SettingField
              label="Model ID"
              value={aiConfig.model}
              placeholder="例如：Qwen/Qwen3-8B"
              onChange={(value) => updateAiConfig('model', value)}
            />
          </div>

          <div className="mt-3 flex items-center justify-between gap-4">
            <p className="m-0 text-[10px] leading-4 text-[#9a9993]">
              API Key 仅保存在本机，不同步、不写入日志。
            </p>
            <div className="flex shrink-0 items-center gap-4 text-[11px]">
              <button
                type="button"
                onClick={() => void testAiConnection()}
                disabled={!aiReady || testState === 'working'}
                className="text-[#65645f] underline decoration-[#c7c6c0] underline-offset-4 hover:text-[#242421] disabled:cursor-default disabled:opacity-40"
              >
                {testState === 'working'
                  ? '测试中…'
                  : testState === 'success'
                    ? '连接成功'
                    : testState === 'error'
                      ? '连接失败'
                      : '测试连接'}
              </button>
              <button
                type="button"
                onClick={() => void saveAiConfig()}
                disabled={!aiReady || aiSaveState === 'working'}
                className="text-[#65645f] underline decoration-[#c7c6c0] underline-offset-4 hover:text-[#242421] disabled:cursor-default disabled:opacity-40"
              >
                {aiSaveState === 'working'
                  ? '保存中…'
                  : aiSaveState === 'success'
                    ? '已保存'
                    : aiSaveState === 'error'
                      ? '保存失败'
                      : '保存'}
              </button>
            </div>
          </div>
        </section>

        <section className="border-t border-[#dfded8] pt-5">
          <SettingField
            label="飞书 Webhook"
            type="url"
            value={webhookUrl}
            placeholder="https://..."
            onChange={(value) => {
              setWebhookUrl(value);
              setWebhookSaveState('idle');
            }}
          />

          <div className="mt-2 flex items-start justify-between gap-4">
            <p className="m-0 text-[10px] leading-4 text-[#9a9993]">
              仅保存在本机，不同步、不写入日志。
            </p>
            <button
              type="button"
              onClick={() => void saveWebhook()}
              disabled={!webhookUrl.trim() || webhookSaveState === 'working'}
              className="shrink-0 text-[11px] text-[#65645f] underline decoration-[#c7c6c0] underline-offset-4 hover:text-[#242421] disabled:cursor-default disabled:opacity-40"
            >
              {webhookSaveState === 'working'
                ? '保存中…'
                : webhookSaveState === 'success'
                  ? '已保存'
                  : webhookSaveState === 'error'
                    ? '保存失败'
                    : '保存'}
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
