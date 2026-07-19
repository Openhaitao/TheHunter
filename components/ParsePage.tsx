import { useCallback, useEffect, useRef, useState } from 'react';
import {
  AI_CONFIG_KEY,
  AI_PROMPT_KEY,
  DEFAULT_AI_PROMPT,
  DEFAULT_FEISHU_FIELD_MAPPING,
  FEISHU_FIELD_MAPPING_KEY,
  FEISHU_TARGET_KEY,
  FEISHU_WEBHOOK_KEY,
  PROFILE_DRAFT_KEY,
  getLocalValue,
  removeLocalValue,
  setLocalValue,
  type AiConfig,
  type FeishuTarget,
  type PromptConfig,
} from '../lib/config';
import { mapSnapshotWithAi } from '../lib/ai';
import { collectLinkedInSemanticSnapshot } from '../lib/linkedin';

type PageStatus =
  | 'checking'
  | 'ready'
  | 'extracting'
  | 'detected'
  | 'extractError'
  | 'unsupported'
  | 'error';
type SubmitStatus = 'idle' | 'submitting' | 'success' | 'targetError' | 'error';

type ProfileDraft = {
  name: string;
  title: string;
  company: string;
  tag: string;
  linkedinUrl: string;
  experience: string;
  education: string;
  contact: string;
  attention: string;
  notes: string;
};

const EMPTY_DRAFT: ProfileDraft = {
  name: '',
  title: '',
  company: '',
  tag: '',
  linkedinUrl: '',
  experience: '',
  education: '',
  contact: '',
  attention: '',
  notes: '',
};

function normalizeLinkedInProfileUrl(rawUrl: string) {
  try {
    const url = new URL(rawUrl);
    const isLinkedIn = url.hostname === 'linkedin.com' || url.hostname.endsWith('.linkedin.com');
    const profileMatch = url.pathname.match(/^\/in\/([^/]+)(?:\/overlay\/contact-info)?\/?$/);
    return isLinkedIn && profileMatch ? `${url.origin}/in/${profileMatch[1]}/` : null;
  } catch {
    return null;
  }
}

function Field({
  label,
  value,
  onChange,
  multiline = false,
  rows = 3,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  multiline?: boolean;
  rows?: number;
  placeholder?: string;
}) {
  const fieldClass =
    'w-full rounded-[9px] border border-[#d9d8d2] bg-[#fbfaf7] px-3 text-[13px] text-[#22221f] placeholder:text-[#b1b0aa] transition-colors hover:border-[#c8c7c1] focus:border-[#96958f] focus:outline-none';

  return (
    <label className="block">
      <span className="mb-1.5 block text-[11px] font-medium text-[#65645f]">{label}</span>
      {multiline ? (
        <textarea
          rows={rows}
          value={value}
          placeholder={placeholder}
          onChange={(event) => onChange(event.target.value)}
          className={`${fieldClass} scrollbar-hidden resize-y py-2.5 leading-5`}
        />
      ) : (
        <input
          value={value}
          placeholder={placeholder}
          onChange={(event) => onChange(event.target.value)}
          className={`${fieldClass} h-9`}
        />
      )}
    </label>
  );
}

function SelectField({
  label,
  value,
  onChange,
  children,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  children: React.ReactNode;
}) {
  return (
    <label className="block min-w-0">
      <span className="mb-1.5 block text-[11px] font-medium text-[#65645f]">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-9 w-full rounded-[9px] border border-[#d9d8d2] bg-[#fbfaf7] px-2.5 text-[12px] text-[#22221f] transition-colors hover:border-[#c8c7c1] focus:border-[#96958f] focus:outline-none"
      >
        {children}
      </select>
    </label>
  );
}

export default function ParsePage({
  resetToken,
  onOpenSettings,
}: {
  resetToken: number;
  onOpenSettings: () => void;
}) {
  const [status, setStatus] = useState<PageStatus>('checking');
  const [draft, setDraft] = useState<ProfileDraft>(EMPTY_DRAFT);
  const [manualOpen, setManualOpen] = useState(true);
  const [hydrated, setHydrated] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<SubmitStatus>('idle');
  const extractionRequest = useRef(0);
  const previousResetToken = useRef(0);
  const successTimer = useRef<number>();

  const updateDraft = <K extends keyof ProfileDraft>(key: K, value: ProfileDraft[K]) => {
    setDraft((current) => ({ ...current, [key]: value }));
  };

  const readActiveTabUrl = useCallback(async () => {
    const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) return '';
    if (tab.url) return tab.url;

    try {
      const [result] = await browser.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => window.location.href,
      });
      return typeof result?.result === 'string' ? result.result : '';
    } catch {
      return '';
    }
  }, []);

  const extractProfile = useCallback(async (profileUrl: string) => {
    const requestId = ++extractionRequest.current;
    setStatus('extracting');

    try {
      const [aiConfig, promptConfig] = await Promise.all([
        getLocalValue<AiConfig>(AI_CONFIG_KEY),
        getLocalValue<PromptConfig>(AI_PROMPT_KEY),
      ]);
      if (!aiConfig?.baseUrl || !aiConfig.apiKey || !aiConfig.model) {
        setStatus('error');
        onOpenSettings();
        return;
      }

      const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
      if (!tab?.id) throw new Error('No active tab');

      const [execution] = await browser.scripting.executeScript({
        target: { tabId: tab.id },
        func: collectLinkedInSemanticSnapshot,
      });

      if (requestId !== extractionRequest.current) return;
      const snapshot = execution?.result;
      if (!snapshot) throw new Error('No semantic snapshot');
      const profile = await mapSnapshotWithAi(
        snapshot,
        aiConfig,
        promptConfig?.content || DEFAULT_AI_PROMPT,
      );
      if (requestId !== extractionRequest.current) return;

      const confidentValue = (key: string, value: string, threshold = 0.55) =>
        (profile.confidence[key] ?? 0) >= threshold && profile.sourceExcerpt[key]?.trim()
          ? value
          : '';
      const name = confidentValue('name', profile.name);
      const title = confidentValue('title', profile.title, 0.6);
      const company = confidentValue('company', profile.company, 0.6);
      const experience = confidentValue('experience', profile.experience, 0.5);
      const education = confidentValue('education', profile.education, 0.5);

      setDraft((current) => {
        const sameProfile = current.linkedinUrl === profileUrl;
        return {
          ...(sameProfile ? current : EMPTY_DRAFT),
          name,
          title,
          company,
          linkedinUrl: profileUrl,
          experience,
          education,
        };
      });
      setStatus(
        name && title && company && experience ? 'detected' : 'extractError',
      );
    } catch {
      if (requestId === extractionRequest.current) setStatus('error');
    }
  }, [onOpenSettings]);

  const inspectActiveTab = useCallback(async (showChecking = false) => {
    if (showChecking) setStatus('checking');

    try {
      const profileUrl = normalizeLinkedInProfileUrl(await readActiveTabUrl());

      if (!profileUrl) {
        extractionRequest.current += 1;
        setStatus('unsupported');
        return;
      }

      setDraft((current) =>
        current.linkedinUrl === profileUrl
          ? current
          : { ...EMPTY_DRAFT, linkedinUrl: profileUrl },
      );
      setStatus('ready');
    } catch {
      setStatus('error');
    }
  }, [readActiveTabUrl]);

  const parseActiveProfile = useCallback(async () => {
    const profileUrl = normalizeLinkedInProfileUrl(await readActiveTabUrl());
    if (!profileUrl) {
      setStatus('unsupported');
      return;
    }
    setDraft((current) =>
      current.linkedinUrl === profileUrl
        ? current
        : { ...EMPTY_DRAFT, linkedinUrl: profileUrl },
    );
    await extractProfile(profileUrl);
  }, [extractProfile, readActiveTabUrl]);

  useEffect(() => {
    let cancelled = false;

    void getLocalValue<ProfileDraft>(PROFILE_DRAFT_KEY).then(async (savedDraft) => {
      if (cancelled) return;

      if (savedDraft?.linkedinUrl || savedDraft?.name) {
        setDraft({ ...EMPTY_DRAFT, ...savedDraft });
        setStatus('detected');
      } else {
        await inspectActiveTab(true);
      }

      if (!cancelled) setHydrated(true);
    });

    return () => {
      cancelled = true;
    };
  }, [inspectActiveTab]);

  useEffect(() => {
    if (!hydrated) return;
    const timeout = window.setTimeout(() => {
      void setLocalValue(PROFILE_DRAFT_KEY, draft);
    }, 180);
    return () => window.clearTimeout(timeout);
  }, [draft, hydrated]);

  useEffect(() => {
    if (resetToken === previousResetToken.current) return;
    previousResetToken.current = resetToken;

    void (async () => {
      extractionRequest.current += 1;
      setHydrated(false);
      setSubmitStatus('idle');
      setManualOpen(true);
      setDraft(EMPTY_DRAFT);
      await removeLocalValue(PROFILE_DRAFT_KEY);
      await parseActiveProfile();
      setHydrated(true);
    })();
  }, [parseActiveProfile, resetToken]);

  useEffect(() => () => window.clearTimeout(successTimer.current), []);

  const submitToFeishu = async () => {
    const [webhookUrl, target] = await Promise.all([
      getLocalValue<string>(FEISHU_WEBHOOK_KEY),
      getLocalValue<FeishuTarget>(FEISHU_TARGET_KEY),
    ]);
    if (typeof webhookUrl !== 'string' || !webhookUrl || !target?.tableId) {
      onOpenSettings();
      return;
    }

    setSubmitStatus('submitting');
    try {
      const fieldMapping =
        (await getLocalValue<Record<string, string>>(FEISHU_FIELD_MAPPING_KEY)) ??
        DEFAULT_FEISHU_FIELD_MAPPING;
      const internalValues: Record<string, string> = {
        name: draft.name,
        title: draft.title,
        company: draft.company,
        tag: draft.tag,
        linkedinUrl: draft.linkedinUrl,
        experience: draft.experience,
        education: draft.education,
        contact: draft.contact,
        attention: draft.attention,
        notes: draft.notes,
      };
      const renderTemplate = (template: string) =>
        internalValues[template] ?? template.replace(/{{\s*([A-Za-z][A-Za-z0-9]*)\s*}}/g, (_, key: string) =>
          internalValues[key] ?? '',
        );
      const fields = Object.fromEntries(
        Object.entries(fieldMapping).map(([fieldName, template]) => [
          fieldName,
          renderTemplate(template),
        ]),
      );
      const requestBody = {
        _thehunter: {
          expected_table_id: target.tableId,
          expected_view_id: target.viewId,
          source_profile_url: draft.linkedinUrl,
        },
        fields,
      };
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      const responseText = await response.text();
      let responseJson: Record<string, any> = {};
      try {
        responseJson = JSON.parse(responseText) as Record<string, any>;
      } catch {
        responseJson = {};
      }

      if (!response.ok || (typeof responseJson.code === 'number' && responseJson.code !== 0)) {
        throw new Error('Webhook request failed');
      }
      const actualTableId =
        responseJson.table_id ?? responseJson.data?.table_id ?? responseJson.data?.record?.table_id;
      const recordId =
        responseJson.record_id ?? responseJson.data?.record_id ?? responseJson.data?.record?.record_id;
      if (actualTableId !== target.tableId || typeof recordId !== 'string' || !recordId) {
        throw new Error('TARGET_MISMATCH');
      }

      setSubmitStatus('success');
      window.clearTimeout(successTimer.current);
      successTimer.current = window.setTimeout(() => setSubmitStatus('idle'), 2600);
    } catch (error) {
      setSubmitStatus(error instanceof Error && error.message === 'TARGET_MISMATCH' ? 'targetError' : 'error');
    }
  };

  const statusLabel =
    status === 'checking'
      ? '正在检测当前页面…'
      : status === 'ready'
        ? 'LinkedIn 页面已就绪'
      : status === 'extracting'
        ? '正在使用 AI 解析…'
        : status === 'extractError'
          ? 'AI 解析不完整，可编辑或重试'
          : status === 'unsupported'
            ? '当前不是 LinkedIn 人物页，可手动填写'
            : status === 'error'
              ? 'AI 解析失败，请检查设置'
              : 'AI 解析完成，请确认';

  const canSubmit = Boolean(draft.name.trim() && draft.linkedinUrl.trim() && draft.tag);

  return (
    <div className="flex h-full flex-col">
      <div className="scrollbar-hidden min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto max-w-[460px] px-4 pb-8 pt-3.5">
        <div className="mb-5 flex items-center justify-between gap-3 text-[11px]">
          <span className="flex items-center gap-2 text-[#777670]">
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                status === 'extractError'
                  ? 'bg-[#b28a64]'
                  : status === 'extracting'
                    ? 'animate-pulse bg-[#9a9993]'
                    : 'bg-[#6f8d70]'
              }`}
            />
            {statusLabel}
          </span>
          <button
            type="button"
            onClick={() => void parseActiveProfile()}
            disabled={status === 'extracting' || status === 'unsupported'}
            className="shrink-0 text-[#65645f] underline decoration-[#c7c6c0] underline-offset-4 hover:text-[#242421] disabled:cursor-default disabled:opacity-40"
          >
            {status === 'extracting' ? '解析中…' : 'AI 解析'}
          </button>
        </div>

        <div className="space-y-3.5">
          <Field label="姓名" value={draft.name} onChange={(value) => updateDraft('name', value)} />
          <Field label="职位" value={draft.title} onChange={(value) => updateDraft('title', value)} />
          <Field label="公司名称" value={draft.company} onChange={(value) => updateDraft('company', value)} />
          <Field
            label="LinkedIn 链接"
            value={draft.linkedinUrl}
            onChange={(value) => updateDraft('linkedinUrl', value)}
          />
          <Field
            label="个人经历"
            value={draft.experience}
            onChange={(value) => updateDraft('experience', value)}
            multiline
            rows={5}
            placeholder="解析后自动填入经历摘要"
          />
          <Field
            label="教育背景"
            value={draft.education}
            onChange={(value) => updateDraft('education', value)}
            multiline
            rows={3}
            placeholder="解析后自动填入教育经历"
          />
        </div>

        <div className="mt-6 border-t border-[#dfded8] pt-4">
          <button
            type="button"
            aria-expanded={manualOpen}
            onClick={() => setManualOpen((open) => !open)}
            className="flex w-full items-center justify-between text-[11px] font-medium text-[#777670] hover:text-[#242421]"
          >
            <span>人工补充</span>
            <span aria-hidden="true" className={`transition-transform ${manualOpen ? 'rotate-180' : ''}`}>⌄</span>
          </button>

          {manualOpen && (
            <div className="mt-4 space-y-3.5">
              <SelectField
                label="标签（必选）"
                value={draft.tag}
                onChange={(value) => updateDraft('tag', value)}
              >
                <option value="">未选择</option>
                <option value="Founder">Founder</option>
                <option value="初创 Talent">初创 Talent</option>
                <option value="大厂高 P">大厂高 P</option>
              </SelectField>

              <Field
                label="联系方式"
                value={draft.contact}
                onChange={(value) => updateDraft('contact', value)}
                multiline
                rows={3}
                placeholder="手动填写邮箱、电话或网站"
              />

              <SelectField
                label="关注度"
                value={draft.attention}
                onChange={(value) => updateDraft('attention', value)}
              >
                <option value="">未选择</option>
                <option value="P0">P0</option>
                <option value="P1">P1</option>
                <option value="P2">P2</option>
              </SelectField>

              <Field
                label="备注"
                value={draft.notes}
                onChange={(value) => updateDraft('notes', value)}
                multiline
                rows={3}
              />
            </div>
          )}
        </div>
      </div>
      </div>

      <button
        type="button"
        onClick={() => void submitToFeishu()}
        disabled={!canSubmit || submitStatus === 'submitting'}
        className={`h-11 w-full shrink-0 border-t border-[#cfcec8] text-[12px] font-medium transition-colors disabled:cursor-default ${
          submitStatus === 'success'
            ? 'bg-[#dce5da] text-[#365039]'
            : submitStatus === 'targetError'
              ? 'bg-[#eaded8] text-[#70483e]'
            : submitStatus === 'error'
              ? 'bg-[#eaded8] text-[#70483e]'
              : 'bg-[#deddd8] text-[#292925] hover:bg-[#d4d3cd] disabled:bg-[#e9e8e3] disabled:text-[#aaa9a3]'
        }`}
      >
        {submitStatus === 'submitting'
          ? '正在提交…'
          : submitStatus === 'success'
            ? '提交成功'
            : submitStatus === 'targetError'
              ? '目标表未验证，检查设置'
            : submitStatus === 'error'
              ? '提交失败，点击重试'
              : '提交到飞书多维表格'}
      </button>
    </div>
  );
}
