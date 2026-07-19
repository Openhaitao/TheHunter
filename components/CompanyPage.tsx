import { useCallback, useEffect, useRef, useState } from 'react';
import {
  AI_CONFIG_KEY,
  COMPANY_DRAFT_KEY,
  COMPANY_FEISHU_FIELD_MAPPING_KEY,
  COMPANY_FEISHU_TARGET_KEY,
  COMPANY_FEISHU_WEBHOOK_KEY,
  DEFAULT_COMPANY_AI_PROMPT,
  DEFAULT_COMPANY_FEISHU_FIELD_MAPPING,
  getLocalValue,
  removeLocalValue,
  setLocalValue,
  type AiConfig,
  type FeishuTarget,
} from '../lib/config';
import { mapCompanySnapshotWithAi } from '../lib/ai';
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

type CompanyDraft = {
  companyName: string;
  tagline: string;
  description: string;
  foundedDate: string;
  region: string;
  linkedinUrl: string;
  website: string;
  track: string;
  attention: string;
  legalName: string;
  founderIntro: string;
};

const EMPTY_DRAFT: CompanyDraft = {
  companyName: '',
  tagline: '',
  description: '',
  foundedDate: '',
  region: '',
  linkedinUrl: '',
  website: '',
  track: '',
  attention: '',
  legalName: '',
  founderIntro: '',
};

function normalizeLinkedInCompanyUrl(rawUrl: string) {
  try {
    const url = new URL(rawUrl);
    const isLinkedIn = url.hostname === 'linkedin.com' || url.hostname.endsWith('.linkedin.com');
    const match = url.pathname.match(/^\/company\/([^/]+)/);
    return isLinkedIn && match ? `${url.origin}/company/${match[1]}/about/` : null;
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

export default function CompanyPage({
  resetToken,
  onOpenSettings,
}: {
  resetToken: number;
  onOpenSettings: () => void;
}) {
  const [status, setStatus] = useState<PageStatus>('checking');
  const [draft, setDraft] = useState<CompanyDraft>(EMPTY_DRAFT);
  const [manualOpen, setManualOpen] = useState(true);
  const [hydrated, setHydrated] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<SubmitStatus>('idle');
  const extractionRequest = useRef(0);
  const previousResetToken = useRef(0);
  const successTimer = useRef<number>();

  const updateDraft = <K extends keyof CompanyDraft>(key: K, value: CompanyDraft[K]) => {
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

  const extractCompany = useCallback(async (companyUrl: string) => {
    const requestId = ++extractionRequest.current;
    setStatus('extracting');
    try {
      const aiConfig = await getLocalValue<AiConfig>(AI_CONFIG_KEY);
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
      const company = await mapCompanySnapshotWithAi(snapshot, aiConfig, DEFAULT_COMPANY_AI_PROMPT);
      if (requestId !== extractionRequest.current) return;

      const confidentValue = (key: string, value: string, threshold = 0.55) =>
        (company.confidence[key] ?? 0) >= threshold && company.sourceExcerpt[key]?.trim()
          ? value
          : '';
      const companyName = confidentValue('company_name', company.companyName, 0.65);
      setDraft((current) => {
        const sameCompany = current.linkedinUrl === companyUrl;
        return {
          ...(sameCompany ? current : EMPTY_DRAFT),
          companyName,
          tagline: confidentValue('tagline', company.tagline),
          description: confidentValue('description', company.description, 0.5),
          foundedDate: confidentValue('founded_date', company.foundedDate),
          region: confidentValue('region', company.region),
          linkedinUrl: companyUrl,
          website: confidentValue('website', company.website),
        };
      });
      setStatus(companyName ? 'detected' : 'extractError');
    } catch {
      if (requestId === extractionRequest.current) setStatus('error');
    }
  }, [onOpenSettings]);

  const inspectActiveTab = useCallback(async (showChecking = false) => {
    if (showChecking) setStatus('checking');
    try {
      const companyUrl = normalizeLinkedInCompanyUrl(await readActiveTabUrl());
      if (!companyUrl) {
        extractionRequest.current += 1;
        setStatus('unsupported');
        return;
      }
      setDraft((current) =>
        current.linkedinUrl === companyUrl ? current : { ...EMPTY_DRAFT, linkedinUrl: companyUrl },
      );
      setStatus('ready');
    } catch {
      setStatus('error');
    }
  }, [readActiveTabUrl]);

  const parseActiveCompany = useCallback(async () => {
    const companyUrl = normalizeLinkedInCompanyUrl(await readActiveTabUrl());
    if (!companyUrl) {
      setStatus('unsupported');
      return;
    }
    setDraft((current) =>
      current.linkedinUrl === companyUrl ? current : { ...EMPTY_DRAFT, linkedinUrl: companyUrl },
    );
    await extractCompany(companyUrl);
  }, [extractCompany, readActiveTabUrl]);

  useEffect(() => {
    let cancelled = false;
    void getLocalValue<CompanyDraft>(COMPANY_DRAFT_KEY).then(async (savedDraft) => {
      if (cancelled) return;
      if (savedDraft?.linkedinUrl || savedDraft?.companyName) {
        setDraft({ ...EMPTY_DRAFT, ...savedDraft });
        setStatus('detected');
      } else {
        await inspectActiveTab(true);
      }
      if (!cancelled) setHydrated(true);
    });
    return () => { cancelled = true; };
  }, [inspectActiveTab]);

  useEffect(() => {
    if (!hydrated) return;
    const timeout = window.setTimeout(() => void setLocalValue(COMPANY_DRAFT_KEY, draft), 180);
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
      await removeLocalValue(COMPANY_DRAFT_KEY);
      await parseActiveCompany();
      setHydrated(true);
    })();
  }, [parseActiveCompany, resetToken]);

  useEffect(() => () => window.clearTimeout(successTimer.current), []);

  const submitToFeishu = async () => {
    const [webhookUrl, target] = await Promise.all([
      getLocalValue<string>(COMPANY_FEISHU_WEBHOOK_KEY),
      getLocalValue<FeishuTarget>(COMPANY_FEISHU_TARGET_KEY),
    ]);
    if (typeof webhookUrl !== 'string' || !webhookUrl || !target?.tableId) {
      onOpenSettings();
      return;
    }
    setSubmitStatus('submitting');
    try {
      const mapping =
        (await getLocalValue<Record<string, string>>(COMPANY_FEISHU_FIELD_MAPPING_KEY)) ??
        DEFAULT_COMPANY_FEISHU_FIELD_MAPPING;
      const values: Record<string, string> = { ...draft };
      const render = (template: string) =>
        values[template] ?? template.replace(/{{\s*([A-Za-z][A-Za-z0-9]*)\s*}}/g, (_, key: string) => values[key] ?? '');
      const fields = Object.fromEntries(
        Object.entries(mapping).map(([fieldName, template]) => [fieldName, render(template)]),
      );
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          _thehunter: {
            entity_type: 'company',
            expected_table_id: target.tableId,
            expected_view_id: target.viewId,
            source_company_url: draft.linkedinUrl,
          },
          fields,
        }),
      });
      const text = await response.text();
      let json: Record<string, any> = {};
      try { json = JSON.parse(text) as Record<string, any>; } catch { json = {}; }
      if (!response.ok || (typeof json.code === 'number' && json.code !== 0)) {
        throw new Error('Webhook request failed');
      }
      const actualTableId = json.table_id ?? json.data?.table_id ?? json.data?.record?.table_id;
      const recordId = json.record_id ?? json.data?.record_id ?? json.data?.record?.record_id;
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
    status === 'checking' ? '正在检测当前页面…'
      : status === 'ready' ? 'LinkedIn 公司页已就绪'
        : status === 'extracting' ? '正在使用 AI 解析公司…'
          : status === 'extractError' ? '公司解析不完整，可编辑或重试'
            : status === 'unsupported' ? '当前不是 LinkedIn 公司页，可手动填写'
              : status === 'error' ? 'AI 解析失败，请检查设置'
                : '公司解析完成，请确认';
  const canSubmit = Boolean(draft.companyName.trim() && draft.linkedinUrl.trim());

  return (
    <div className="flex h-full flex-col">
      <div className="scrollbar-hidden min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto max-w-[460px] px-4 pb-8 pt-3.5">
          <div className="mb-5 flex items-center justify-between gap-3 text-[11px]">
            <span className="flex items-center gap-2 text-[#777670]">
              <span className={`h-1.5 w-1.5 rounded-full ${status === 'extractError' ? 'bg-[#b28a64]' : status === 'extracting' ? 'animate-pulse bg-[#9a9993]' : 'bg-[#6f8d70]'}`} />
              {statusLabel}
            </span>
            <button type="button" onClick={() => void parseActiveCompany()} disabled={status === 'extracting' || status === 'unsupported'} className="shrink-0 text-[#65645f] underline decoration-[#c7c6c0] underline-offset-4 hover:text-[#242421] disabled:cursor-default disabled:opacity-40">
              {status === 'extracting' ? '解析中…' : 'AI 解析'}
            </button>
          </div>

          <div className="space-y-3.5">
            <Field label="公司名" value={draft.companyName} onChange={(value) => updateDraft('companyName', value)} />
            <Field label="一句话简介" value={draft.tagline} onChange={(value) => updateDraft('tagline', value)} />
            <Field label="公司介绍" value={draft.description} onChange={(value) => updateDraft('description', value)} multiline rows={5} />
            <div className="grid grid-cols-2 gap-3">
              <Field label="成立日期" value={draft.foundedDate} onChange={(value) => updateDraft('foundedDate', value)} />
              <Field label="地区" value={draft.region} onChange={(value) => updateDraft('region', value)} />
            </div>
            <Field label="LinkedIn 链接" value={draft.linkedinUrl} onChange={(value) => updateDraft('linkedinUrl', value)} />
            <Field label="官网" value={draft.website} onChange={(value) => updateDraft('website', value)} />
          </div>

          <div className="mt-6 border-t border-[#dfded8] pt-4">
            <button type="button" aria-expanded={manualOpen} onClick={() => setManualOpen((open) => !open)} className="flex w-full items-center justify-between text-[11px] font-medium text-[#777670] hover:text-[#242421]">
              <span>人工补充</span>
              <span aria-hidden="true" className={`transition-transform ${manualOpen ? 'rotate-180' : ''}`}>⌄</span>
            </button>
            {manualOpen && (
              <div className="mt-4 space-y-3.5">
                <SelectField label="所属赛道" value={draft.track} onChange={(value) => updateDraft('track', value)}>
                  <option value="">未选择</option><option value="AI软件">AI 软件</option><option value="AI硬件">AI 硬件</option><option value="机器人">机器人</option><option value="AI4S">AI4S</option>
                </SelectField>
                <SelectField label="关注度" value={draft.attention} onChange={(value) => updateDraft('attention', value)}>
                  <option value="">未选择</option><option value="P0-明星项目">P0-明星项目</option><option value="P1-热门项目">P1-热门项目</option><option value="P2-名字有印象">P2-名字有印象</option><option value="P3-不太有名">P3-不太有名</option><option value="P4-项目和AI无关">P4-项目和AI无关</option>
                </SelectField>
                <Field label="工商名称" value={draft.legalName} onChange={(value) => updateDraft('legalName', value)} />
                <Field label="创始人成员介绍" value={draft.founderIntro} onChange={(value) => updateDraft('founderIntro', value)} multiline rows={4} />
              </div>
            )}
          </div>
        </div>
      </div>

      <button type="button" onClick={() => void submitToFeishu()} disabled={!canSubmit || submitStatus === 'submitting'} className={`h-11 w-full shrink-0 border-t border-[#cfcec8] text-[12px] font-medium transition-colors disabled:cursor-default ${submitStatus === 'success' ? 'bg-[#dce5da] text-[#365039]' : submitStatus === 'targetError' || submitStatus === 'error' ? 'bg-[#eaded8] text-[#70483e]' : 'bg-[#deddd8] text-[#292925] hover:bg-[#d4d3cd] disabled:bg-[#e9e8e3] disabled:text-[#aaa9a3]'}`}>
        {submitStatus === 'submitting' ? '正在提交…' : submitStatus === 'success' ? '提交成功' : submitStatus === 'targetError' ? '目标表未验证，检查设置' : submitStatus === 'error' ? '提交失败，点击重试' : '提交到公司追踪名单'}
      </button>
    </div>
  );
}
