import { useCallback, useEffect, useRef, useState } from 'react';
import { extractLinkedInProfileFromPage } from '../lib/linkedin';

type PageStatus = 'checking' | 'extracting' | 'detected' | 'extractError' | 'unsupported' | 'error';

type ProfileDraft = {
  name: string;
  title: string;
  company: string;
  linkedinUrl: string;
  experience: string;
  education: string;
  contact: string;
  attention: string;
  outreach: string;
  notes: string;
};

const EMPTY_DRAFT: ProfileDraft = {
  name: '',
  title: '',
  company: '',
  linkedinUrl: '',
  experience: '',
  education: '',
  contact: '',
  attention: '',
  outreach: '',
  notes: '',
};

function normalizeLinkedInProfileUrl(rawUrl: string) {
  try {
    const url = new URL(rawUrl);
    const isLinkedIn = url.hostname === 'linkedin.com' || url.hostname.endsWith('.linkedin.com');
    const isProfile = /^\/in\/[^/]+\/?$/.test(url.pathname);
    return isLinkedIn && isProfile ? `${url.origin}${url.pathname}` : null;
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
          className={`${fieldClass} resize-y py-2.5 leading-5`}
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

export default function ParsePage() {
  const [status, setStatus] = useState<PageStatus>('checking');
  const [draft, setDraft] = useState<ProfileDraft>(EMPTY_DRAFT);
  const [manualOpen, setManualOpen] = useState(false);
  const extractionRequest = useRef(0);

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
      const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
      if (!tab?.id) throw new Error('No active tab');

      const [execution] = await browser.scripting.executeScript({
        target: { tabId: tab.id },
        func: extractLinkedInProfileFromPage,
      });

      if (requestId !== extractionRequest.current) return;
      const profile = execution?.result;
      if (!profile) throw new Error('No profile data');

      setDraft((current) => {
        const sameProfile = current.linkedinUrl === profileUrl;
        return {
          ...(sameProfile ? current : EMPTY_DRAFT),
          name: profile.name,
          title: profile.headline,
          company: profile.company,
          linkedinUrl: profileUrl,
          experience: profile.experience,
          education: profile.education,
        };
      });
      setStatus('detected');
    } catch {
      if (requestId === extractionRequest.current) setStatus('extractError');
    }
  }, []);

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
      await extractProfile(profileUrl);
    } catch {
      setStatus('error');
    }
  }, [extractProfile, readActiveTabUrl]);

  useEffect(() => {
    void inspectActiveTab(true);

    const handleTabChange = () => void inspectActiveTab();
    const handleTabUpdate = (_tabId: number, changeInfo: { status?: string; url?: string }) => {
      if (changeInfo.url || changeInfo.status === 'complete') void inspectActiveTab();
    };

    browser.tabs.onActivated.addListener(handleTabChange);
    browser.tabs.onUpdated.addListener(handleTabUpdate);

    return () => {
      browser.tabs.onActivated.removeListener(handleTabChange);
      browser.tabs.onUpdated.removeListener(handleTabUpdate);
    };
  }, [inspectActiveTab]);

  if (status === 'checking') {
    return (
      <div className="flex h-full items-center justify-center px-8 text-center text-xs text-[#8d8c86]">
        正在检测当前页面…
      </div>
    );
  }

  if (status === 'unsupported') {
    return (
      <div className="flex h-full items-center justify-center px-8 text-center">
        <div>
          <p className="m-0 text-[13px] text-[#55544f]">打开 LinkedIn 人物页面</p>
          <p className="mt-1.5 text-[11px] leading-5 text-[#9b9a94]">识别到 linkedin.com/in/ 页面后将自动开始</p>
          <button
            type="button"
            onClick={() => void inspectActiveTab(true)}
            className="mt-4 text-[11px] text-[#676660] underline decoration-[#c7c6c0] underline-offset-4 hover:text-[#242421]"
          >
            重新检测
          </button>
        </div>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="flex h-full items-center justify-center px-8 text-center">
        <div>
          <p className="m-0 text-[13px] text-[#55544f]">暂时无法读取当前页面</p>
          <button
            type="button"
            onClick={() => void inspectActiveTab(true)}
            className="mt-4 text-[11px] text-[#676660] underline decoration-[#c7c6c0] underline-offset-4 hover:text-[#242421]"
          >
            重试
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-[460px] px-4 pb-8 pt-3.5">
        <div className="mb-5 flex items-center justify-between text-[11px]">
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
            {status === 'extracting'
              ? '正在解析 LinkedIn 内容…'
              : status === 'extractError'
                ? '解析未完成，可手动填写'
                : '已解析 LinkedIn 内容'}
          </span>
          <button
            type="button"
            onClick={() => void inspectActiveTab(true)}
            disabled={status === 'extracting'}
            className="text-[#8a8983] hover:text-[#242421] disabled:cursor-default disabled:opacity-40"
          >
            重新解析
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
              <Field
                label="联系方式"
                value={draft.contact}
                onChange={(value) => updateDraft('contact', value)}
              />

              <div className="grid grid-cols-2 gap-3">
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

                <SelectField
                  label="是否建联"
                  value={draft.outreach}
                  onChange={(value) => updateDraft('outreach', value)}
                >
                  <option value="">未选择</option>
                  <option value="加上微信">加上微信</option>
                  <option value="已发 LinkedIn 私信">已发 LinkedIn 私信</option>
                  <option value="已发邮件">已发邮件</option>
                  <option value="已发 Twitter 私信">已发 Twitter 私信</option>
                </SelectField>
              </div>

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
  );
}
