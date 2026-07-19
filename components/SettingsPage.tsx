import { useEffect, useState } from 'react';
import {
  AI_CONFIG_KEY,
  AI_PROMPT_KEY,
  DEFAULT_AI_PROMPT,
  DEFAULT_FEISHU_FIELD_MAPPING,
  FEISHU_FIELD_MAPPING_KEY,
  FEISHU_WEBHOOK_KEY,
  getLocalValue,
  setLocalValue,
  type AiConfig,
  type PromptConfig,
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

function SettingTextarea({
  label,
  value,
  rows,
  onChange,
}: {
  label: string;
  value: string;
  rows: number;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[11px] font-medium text-[#65645f]">{label}</span>
      <textarea
        rows={rows}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="scrollbar-hidden w-full resize-y rounded-[9px] border border-[#d9d8d2] bg-[#fbfaf7] px-3 py-2.5 font-mono text-[11px] leading-5 text-[#22221f] transition-colors hover:border-[#c8c7c1] focus:border-[#96958f] focus:outline-none"
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
  const [fieldMappingText, setFieldMappingText] = useState(
    JSON.stringify(DEFAULT_FEISHU_FIELD_MAPPING, null, 2),
  );
  const [promptConfig, setPromptConfig] = useState<PromptConfig>({
    content: DEFAULT_AI_PROMPT,
    updatedAt: '',
  });
  const [aiSaveState, setAiSaveState] = useState<ActionState>('idle');
  const [testState, setTestState] = useState<ActionState>('idle');
  const [webhookSaveState, setWebhookSaveState] = useState<ActionState>('idle');
  const [promptSaveState, setPromptSaveState] = useState<ActionState>('idle');

  useEffect(() => {
    void Promise.all([
      getLocalValue<AiConfig>(AI_CONFIG_KEY),
      getLocalValue<string>(FEISHU_WEBHOOK_KEY),
      getLocalValue<Record<string, string>>(FEISHU_FIELD_MAPPING_KEY),
      getLocalValue<PromptConfig>(AI_PROMPT_KEY),
    ]).then(([savedAiConfig, savedWebhook, savedMapping, savedPrompt]) => {
      if (savedAiConfig) setAiConfig({ ...EMPTY_AI_CONFIG, ...savedAiConfig });
      if (typeof savedWebhook === 'string') setWebhookUrl(savedWebhook);
      if (savedMapping) setFieldMappingText(JSON.stringify(savedMapping, null, 2));
      if (savedPrompt?.content) setPromptConfig(savedPrompt);
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
      const mapping = JSON.parse(fieldMappingText) as unknown;
      if (!mapping || typeof mapping !== 'object' || Array.isArray(mapping)) {
        throw new Error('Invalid mapping');
      }
      const allowedFields = new Set([
        'name',
        'title',
        'company',
        'linkedinUrl',
        'experience',
        'education',
        'contact',
        'attention',
        'notes',
      ]);
      if (
        !Object.entries(mapping).every(
          ([fieldName, internalName]) =>
            fieldName.trim() && typeof internalName === 'string' && allowedFields.has(internalName),
        )
      ) {
        throw new Error('Invalid mapping fields');
      }
      await requestOriginPermission(normalizedUrl);
      await setLocalValue(FEISHU_WEBHOOK_KEY, normalizedUrl);
      await setLocalValue(FEISHU_FIELD_MAPPING_KEY, mapping as Record<string, string>);
      setWebhookUrl(normalizedUrl);
      setFieldMappingText(JSON.stringify(mapping, null, 2));
      setWebhookSaveState('success');
    } catch {
      setWebhookSaveState('error');
    }
  };

  const savePrompt = async (content = promptConfig.content) => {
    setPromptSaveState('working');
    try {
      if (!content.trim()) throw new Error('Prompt required');
      const nextPrompt = { content: content.trim(), updatedAt: new Date().toISOString() };
      await setLocalValue(AI_PROMPT_KEY, nextPrompt);
      setPromptConfig(nextPrompt);
      setPromptSaveState('success');
    } catch {
      setPromptSaveState('error');
    }
  };

  const mappingPreview = (() => {
    try {
      const mapping = JSON.parse(fieldMappingText) as Record<string, string>;
      return JSON.stringify(
        Object.fromEntries(
          Object.entries(mapping).map(([fieldName, internalName]) => [
            fieldName,
            `{{${internalName}}}`,
          ]),
        ),
        null,
        2,
      );
    } catch {
      return '字段映射 JSON 无效';
    }
  })();

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
          <div className="mb-4">
            <h2 className="m-0 text-[12px] font-medium text-[#2c2c28]">飞书多维表格</h2>
            <p className="mb-0 mt-1 text-[10px] leading-4 text-[#9a9993]">
              配置 Webhook，并将飞书字段名映射到插件内部字段。
            </p>
          </div>

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

          <div className="mt-3.5">
            <SettingTextarea
              label="请求体字段映射（JSON）"
              value={fieldMappingText}
              rows={10}
              onChange={(value) => {
                setFieldMappingText(value);
                setWebhookSaveState('idle');
              }}
            />
          </div>

          <details className="mt-3 text-[10px] text-[#777670]">
            <summary className="cursor-pointer select-none hover:text-[#242421]">请求体预览</summary>
            <pre className="scrollbar-hidden mt-2 max-h-56 overflow-auto whitespace-pre-wrap rounded-[9px] border border-[#dfded8] bg-[#fbfaf7] p-3 font-mono text-[10px] leading-4 text-[#65645f]">
              {mappingPreview}
            </pre>
          </details>

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

        <section className="border-t border-[#dfded8] pt-5">
          <div className="mb-4">
            <h2 className="m-0 text-[12px] font-medium text-[#2c2c28]">提示词管理</h2>
            <p className="mb-0 mt-1 text-[10px] leading-4 text-[#9a9993]">
              控制有效 DOM 如何映射为人才字段；解析结果仍需人工确认。
            </p>
          </div>

          <SettingTextarea
            label="系统提示词"
            value={promptConfig.content}
            rows={14}
            onChange={(value) => {
              setPromptConfig((current) => ({ ...current, content: value }));
              setPromptSaveState('idle');
            }}
          />

          <div className="mt-3 flex items-start justify-between gap-4">
            <p className="m-0 text-[10px] leading-4 text-[#9a9993]">
              {promptConfig.updatedAt
                ? `最后修改：${new Date(promptConfig.updatedAt).toLocaleString('zh-CN')}`
                : '当前使用默认提示词 v1'}
            </p>
            <div className="flex shrink-0 items-center gap-4 text-[11px]">
              <button
                type="button"
                onClick={() => void savePrompt(DEFAULT_AI_PROMPT)}
                disabled={promptSaveState === 'working'}
                className="text-[#65645f] underline decoration-[#c7c6c0] underline-offset-4 hover:text-[#242421] disabled:opacity-40"
              >
                恢复默认
              </button>
              <button
                type="button"
                onClick={() => void savePrompt()}
                disabled={!promptConfig.content.trim() || promptSaveState === 'working'}
                className="text-[#65645f] underline decoration-[#c7c6c0] underline-offset-4 hover:text-[#242421] disabled:opacity-40"
              >
                {promptSaveState === 'working'
                  ? '保存中…'
                  : promptSaveState === 'success'
                    ? '已保存'
                    : promptSaveState === 'error'
                      ? '保存失败'
                      : '保存'}
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
