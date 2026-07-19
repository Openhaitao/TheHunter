import { useEffect, useState } from 'react';
import {
  AI_CONFIG_KEY,
  AI_PROMPT_KEY,
  COMPANY_FEISHU_FIELD_MAPPING_KEY,
  COMPANY_FEISHU_TARGET_KEY,
  COMPANY_FEISHU_WEBHOOK_KEY,
  DEFAULT_AI_PROMPT,
  DEFAULT_COMPANY_FEISHU_FIELD_MAPPING,
  DEFAULT_FEISHU_FIELD_MAPPING,
  FEISHU_FIELD_MAPPING_KEY,
  FEISHU_TARGET_KEY,
  FEISHU_WEBHOOK_KEY,
  getLocalValue,
  setLocalValue,
  type AiConfig,
  type FeishuTarget,
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

function SettingsSection({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <details className="group border-b border-[#dfded8] py-1">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-3.5 [&::-webkit-details-marker]:hidden">
        <span>
          <span className="block text-[12px] font-medium text-[#2c2c28]">{title}</span>
          <span className="mt-1 block text-[10px] leading-4 text-[#9a9993]">{description}</span>
        </span>
        <span
          aria-hidden="true"
          className="shrink-0 text-[14px] text-[#8f8e88] transition-transform group-open:rotate-180"
        >
          ⌄
        </span>
      </summary>
      <div className="pb-5 pt-2">{children}</div>
    </details>
  );
}

function normalizeHttpsUrl(value: string) {
  const url = new URL(value.trim());
  if (url.protocol !== 'https:') throw new Error('HTTPS required');
  return url.toString().replace(/\/+$/, '');
}

function parseFeishuTargetUrl(value: string): FeishuTarget {
  const url = new URL(value.trim());
  if (url.protocol !== 'https:' || !/(?:feishu\.cn|larksuite\.com)$/.test(url.hostname)) {
    throw new Error('Invalid Feishu URL');
  }
  const resourceMatch = url.pathname.match(/^\/(?:wiki|base)\/([^/]+)/);
  const tableId = url.searchParams.get('table') ?? '';
  const viewId = url.searchParams.get('view') ?? '';
  if (!resourceMatch || !/^tbl[A-Za-z0-9]+$/.test(tableId)) {
    throw new Error('Target table ID required');
  }
  if (viewId && !/^vew[A-Za-z0-9]+$/.test(viewId)) throw new Error('Invalid view ID');
  return {
    url: url.toString(),
    resourceToken: resourceMatch[1],
    tableId,
    viewId,
  };
}

export default function SettingsPage() {
  const [aiConfig, setAiConfig] = useState<AiConfig>(EMPTY_AI_CONFIG);
  const [targetUrl, setTargetUrl] = useState('');
  const [webhookUrl, setWebhookUrl] = useState('');
  const [fieldMappingText, setFieldMappingText] = useState(
    JSON.stringify(DEFAULT_FEISHU_FIELD_MAPPING, null, 2),
  );
  const [promptConfig, setPromptConfig] = useState<PromptConfig>({
    content: DEFAULT_AI_PROMPT,
    updatedAt: '',
  });
  const [companyTargetUrl, setCompanyTargetUrl] = useState('');
  const [companyWebhookUrl, setCompanyWebhookUrl] = useState('');
  const [companyFieldMappingText, setCompanyFieldMappingText] = useState(
    JSON.stringify(DEFAULT_COMPANY_FEISHU_FIELD_MAPPING, null, 2),
  );
  const [aiSaveState, setAiSaveState] = useState<ActionState>('idle');
  const [testState, setTestState] = useState<ActionState>('idle');
  const [webhookSaveState, setWebhookSaveState] = useState<ActionState>('idle');
  const [companyWebhookSaveState, setCompanyWebhookSaveState] = useState<ActionState>('idle');
  const [promptSaveState, setPromptSaveState] = useState<ActionState>('idle');

  useEffect(() => {
    void Promise.all([
      getLocalValue<AiConfig>(AI_CONFIG_KEY),
      getLocalValue<string>(FEISHU_WEBHOOK_KEY),
      getLocalValue<FeishuTarget>(FEISHU_TARGET_KEY),
      getLocalValue<Record<string, string>>(FEISHU_FIELD_MAPPING_KEY),
      getLocalValue<string>(COMPANY_FEISHU_WEBHOOK_KEY),
      getLocalValue<FeishuTarget>(COMPANY_FEISHU_TARGET_KEY),
      getLocalValue<Record<string, string>>(COMPANY_FEISHU_FIELD_MAPPING_KEY),
      getLocalValue<PromptConfig>(AI_PROMPT_KEY),
    ]).then(([
      savedAiConfig,
      savedWebhook,
      savedTarget,
      savedMapping,
      savedCompanyWebhook,
      savedCompanyTarget,
      savedCompanyMapping,
      savedPrompt,
    ]) => {
      if (savedAiConfig) setAiConfig({ ...EMPTY_AI_CONFIG, ...savedAiConfig });
      if (typeof savedWebhook === 'string') setWebhookUrl(savedWebhook);
      if (savedTarget?.url) setTargetUrl(savedTarget.url);
      if (savedMapping) setFieldMappingText(JSON.stringify(savedMapping, null, 2));
      if (typeof savedCompanyWebhook === 'string') setCompanyWebhookUrl(savedCompanyWebhook);
      if (savedCompanyTarget?.url) setCompanyTargetUrl(savedCompanyTarget.url);
      if (savedCompanyMapping) {
        setCompanyFieldMappingText(JSON.stringify(savedCompanyMapping, null, 2));
      }
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
      const target = parseFeishuTargetUrl(targetUrl);
      const mapping = JSON.parse(fieldMappingText) as unknown;
      if (!mapping || typeof mapping !== 'object' || Array.isArray(mapping)) {
        throw new Error('Invalid mapping');
      }
      const allowedFields = new Set([
        'name',
        'title',
        'company',
        'tag',
        'linkedinUrl',
        'experience',
        'education',
        'contact',
        'attention',
        'notes',
      ]);
      const normalizedMapping = Object.fromEntries(
        Object.entries(mapping).map(([fieldName, template]) => [
          fieldName,
          typeof template === 'string' && allowedFields.has(template)
            ? `{{${template}}}`
            : template,
        ]),
      );
      if (!Object.entries(normalizedMapping).every(([fieldName, template]) => {
        if (!fieldName.trim() || typeof template !== 'string' || !template.trim()) return false;
        return Array.from(template.matchAll(/{{\s*([A-Za-z][A-Za-z0-9]*)\s*}}/g)).every(
          (match) => allowedFields.has(match[1]),
        );
      })) {
        throw new Error('Invalid mapping fields');
      }
      await requestOriginPermission(normalizedUrl);
      await setLocalValue(FEISHU_WEBHOOK_KEY, normalizedUrl);
      await setLocalValue(FEISHU_TARGET_KEY, target);
      await setLocalValue(
        FEISHU_FIELD_MAPPING_KEY,
        normalizedMapping as Record<string, string>,
      );
      setWebhookUrl(normalizedUrl);
      setTargetUrl(target.url);
      setFieldMappingText(JSON.stringify(normalizedMapping, null, 2));
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

  const saveCompanyWebhook = async () => {
    setCompanyWebhookSaveState('working');
    try {
      const normalizedUrl = normalizeHttpsUrl(companyWebhookUrl);
      const target = parseFeishuTargetUrl(companyTargetUrl);
      const mapping = JSON.parse(companyFieldMappingText) as unknown;
      if (!mapping || typeof mapping !== 'object' || Array.isArray(mapping)) {
        throw new Error('Invalid mapping');
      }
      const allowedFields = new Set([
        'companyName',
        'tagline',
        'description',
        'foundedDate',
        'region',
        'linkedinUrl',
        'website',
        'track',
        'attention',
        'legalName',
        'founderIntro',
      ]);
      const normalizedMapping = Object.fromEntries(
        Object.entries(mapping).map(([fieldName, template]) => [
          fieldName,
          typeof template === 'string' && allowedFields.has(template)
            ? `{{${template}}}`
            : template,
        ]),
      );
      if (!Object.entries(normalizedMapping).every(([fieldName, template]) => {
        if (!fieldName.trim() || typeof template !== 'string' || !template.trim()) return false;
        return Array.from(template.matchAll(/{{\s*([A-Za-z][A-Za-z0-9]*)\s*}}/g)).every(
          (match) => allowedFields.has(match[1]),
        );
      })) {
        throw new Error('Invalid mapping fields');
      }
      await requestOriginPermission(normalizedUrl);
      await setLocalValue(COMPANY_FEISHU_WEBHOOK_KEY, normalizedUrl);
      await setLocalValue(COMPANY_FEISHU_TARGET_KEY, target);
      await setLocalValue(
        COMPANY_FEISHU_FIELD_MAPPING_KEY,
        normalizedMapping as Record<string, string>,
      );
      setCompanyWebhookUrl(normalizedUrl);
      setCompanyTargetUrl(target.url);
      setCompanyFieldMappingText(JSON.stringify(normalizedMapping, null, 2));
      setCompanyWebhookSaveState('success');
    } catch {
      setCompanyWebhookSaveState('error');
    }
  };

  const mappingPreview = (() => {
    try {
      const mapping = JSON.parse(fieldMappingText) as Record<string, string>;
      const target = parseFeishuTargetUrl(targetUrl);
      return JSON.stringify(
        {
          _thehunter: {
            expected_table_id: target.tableId,
            expected_view_id: target.viewId,
          },
          fields: mapping,
        },
        null,
        2,
      );
    } catch {
      return '字段映射 JSON 无效';
    }
  })();

  const targetSummary = (() => {
    try {
      const target = parseFeishuTargetUrl(targetUrl);
      return `已锁定表 ${target.tableId}${target.viewId ? ` · 视图 ${target.viewId}` : ''}`;
    } catch {
      return '请填写包含 table 参数的飞书多维表格链接';
    }
  })();

  const companyMappingPreview = (() => {
    try {
      const mapping = JSON.parse(companyFieldMappingText) as Record<string, string>;
      const target = parseFeishuTargetUrl(companyTargetUrl);
      return JSON.stringify(
        {
          _thehunter: {
            entity_type: 'company',
            expected_table_id: target.tableId,
            expected_view_id: target.viewId,
          },
          fields: mapping,
        },
        null,
        2,
      );
    } catch {
      return '字段映射 JSON 无效';
    }
  })();

  const companyTargetSummary = (() => {
    try {
      const target = parseFeishuTargetUrl(companyTargetUrl);
      return `已锁定公司表 ${target.tableId}${target.viewId ? ` · 视图 ${target.viewId}` : ''}`;
    } catch {
      return '请填写“公司追踪名单”的完整链接';
    }
  })();

  const aiReady = Boolean(
    aiConfig.baseUrl.trim() && aiConfig.apiKey.trim() && aiConfig.model.trim(),
  );

  return (
    <div className="scrollbar-hidden h-full overflow-y-auto px-4 py-4">
      <div className="mx-auto max-w-[460px]">
        <SettingsSection
          title="AI 解析"
          description="OpenAI-compatible API；仅在点击 AI 解析时发送当前人物或公司页内容。"
        >
          <div className="space-y-3.5">
            <SettingField
              label="API 地址（Base URL）"
              type="url"
              value={aiConfig.baseUrl}
              placeholder="https://api.openai.com/v1"
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
              placeholder="例如：gpt-5.6"
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
        </SettingsSection>

        <SettingsSection
          title="飞书 · 人员主表"
          description="锁定人员目标表，并配置 Webhook 与字段模板。"
        >
          <SettingField
            label="目标多维表格链接"
            type="url"
            value={targetUrl}
            placeholder="https://...feishu.cn/wiki/...?table=tbl...&view=vew..."
            onChange={(value) => {
              setTargetUrl(value);
              setWebhookSaveState('idle');
            }}
          />
          <p className="mb-3.5 mt-1.5 text-[10px] leading-4 text-[#9a9993]">{targetSummary}</p>

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
              disabled={!targetUrl.trim() || !webhookUrl.trim() || webhookSaveState === 'working'}
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
        </SettingsSection>

        <SettingsSection
          title="飞书 · 公司追踪表"
          description="公司解析使用独立目标表、Webhook 和字段模板。"
        >
          <SettingField
            label="公司追踪名单链接"
            type="url"
            value={companyTargetUrl}
            placeholder="https://...feishu.cn/wiki/...?table=tbl...&view=vew..."
            onChange={(value) => {
              setCompanyTargetUrl(value);
              setCompanyWebhookSaveState('idle');
            }}
          />
          <p className="mb-3.5 mt-1.5 text-[10px] leading-4 text-[#9a9993]">
            {companyTargetSummary}
          </p>

          <SettingField
            label="公司 Webhook"
            type="url"
            value={companyWebhookUrl}
            placeholder="https://..."
            onChange={(value) => {
              setCompanyWebhookUrl(value);
              setCompanyWebhookSaveState('idle');
            }}
          />

          <div className="mt-3.5">
            <SettingTextarea
              label="公司请求体字段映射（JSON）"
              value={companyFieldMappingText}
              rows={11}
              onChange={(value) => {
                setCompanyFieldMappingText(value);
                setCompanyWebhookSaveState('idle');
              }}
            />
          </div>

          <details className="mt-3 text-[10px] text-[#777670]">
            <summary className="cursor-pointer select-none hover:text-[#242421]">请求体预览</summary>
            <pre className="scrollbar-hidden mt-2 max-h-56 overflow-auto whitespace-pre-wrap rounded-[9px] border border-[#dfded8] bg-[#fbfaf7] p-3 font-mono text-[10px] leading-4 text-[#65645f]">
              {companyMappingPreview}
            </pre>
          </details>

          <div className="mt-2 flex items-start justify-between gap-4">
            <p className="m-0 text-[10px] leading-4 text-[#9a9993]">
              公司配置独立保存在本机。
            </p>
            <button
              type="button"
              onClick={() => void saveCompanyWebhook()}
              disabled={
                !companyTargetUrl.trim() ||
                !companyWebhookUrl.trim() ||
                companyWebhookSaveState === 'working'
              }
              className="shrink-0 text-[11px] text-[#65645f] underline decoration-[#c7c6c0] underline-offset-4 hover:text-[#242421] disabled:cursor-default disabled:opacity-40"
            >
              {companyWebhookSaveState === 'working'
                ? '保存中…'
                : companyWebhookSaveState === 'success'
                  ? '已保存'
                  : companyWebhookSaveState === 'error'
                    ? '保存失败'
                    : '保存'}
            </button>
          </div>
        </SettingsSection>

        <SettingsSection
          title="提示词管理"
          description="控制有效 DOM 如何映射为人才字段；解析结果仍需人工确认。"
        >
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
        </SettingsSection>
      </div>
    </div>
  );
}
