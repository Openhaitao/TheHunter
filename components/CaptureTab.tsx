import { useEffect, useState } from 'react';
import type { PageData, Template } from '../lib/types';
import { useSettings, useTemplates } from '../lib/storage';
import { extractActiveTab } from '../lib/extract';
import { extractWithAI } from '../lib/llm';
import { matchTemplates, sendToWebhooks, type SendOutcome } from '../lib/webhook';

type Phase = 'idle' | 'extracting' | 'review' | 'sending';

export default function CaptureTab() {
  const [settings] = useSettings();
  const [templates] = useTemplates();
  const [page, setPage] = useState<PageData | null>(null);
  const [templateId, setTemplateId] = useState<string>('');
  const [values, setValues] = useState<Record<string, string>>({});
  const [phase, setPhase] = useState<Phase>('idle');
  const [error, setError] = useState('');
  const [outcomes, setOutcomes] = useState<SendOutcome[] | null>(null);

  const candidates: Template[] = page && templates ? matchTemplates(templates, page.url) : (templates ?? []);
  const template = candidates.find((t) => t.id === templateId) ?? candidates[0];

  useEffect(() => {
    if (template && templateId !== template.id) setTemplateId(template.id);
  }, [candidates.map((t) => t.id).join(',')]);

  async function handleCapture() {
    if (!settings || !template) return;
    setError('');
    setOutcomes(null);
    setPhase('extracting');
    try {
      const p = await extractActiveTab();
      setPage(p);
      const matched = matchTemplates(templates ?? [], p.url);
      const tpl = matched.find((t) => t.id === templateId) ?? matched[0] ?? template;
      setTemplateId(tpl.id);
      const v = await extractWithAI(settings.ai, tpl, p);
      setValues(v);
      setPhase('review');
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setPhase(page ? 'review' : 'idle');
    }
  }

  async function handleSend() {
    if (!template || !page) return;
    setError('');
    setPhase('sending');
    try {
      const results = await sendToWebhooks(template.targets, {
        templateId: template.id,
        values,
        page,
      });
      setOutcomes(results);
      setPhase('review');
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setPhase('review');
    }
  }

  return (
    <div className="space-y-5 p-4">
      <div>
        <p className="font-mono text-[9px] tracking-[0.18em] text-[#92928c]">// QUICK CAPTURE</p>
        <h1 className="mt-2 text-2xl font-semibold leading-none tracking-tight">抓住这个页面。</h1>
        <p className="mt-2 text-xs leading-relaxed text-[#777772]">AI 读取当前页面，整理成你需要的结构化数据。</p>
      </div>
      <button
        onClick={handleCapture}
        disabled={phase === 'extracting' || phase === 'sending'}
        className="w-full rounded-xl bg-[#171717] py-3 text-sm font-semibold text-white shadow-[0_6px_18px_rgba(0,0,0,0.16)] transition hover:bg-black hover:shadow-[0_8px_24px_rgba(0,0,0,0.22)] active:translate-y-px disabled:cursor-not-allowed disabled:opacity-40"
      >
        {phase === 'extracting' ? 'AI 提取中…' : '🎯 捕获当前页面'}
      </button>

      {candidates.length > 0 && (
        <label className="block">
          <span className="mb-1.5 block font-mono text-[9px] tracking-wider text-[#777772]">TEMPLATE / 使用模板</span>
          <select
            value={template?.id ?? ''}
            onChange={(e) => setTemplateId(e.target.value)}
            className="w-full rounded-lg border border-[#d9d9d4] bg-white px-3 py-2 font-medium shadow-[0_3px_10px_rgba(0,0,0,0.04)]"
          >
            {candidates.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </label>
      )}

      {error && <p className="rounded-lg border border-[#e8c7c7] bg-[#fff7f7] p-3 font-medium text-[#9a3030]">⚠ {error}</p>}

      {phase === 'review' && template && page && (
        <div className="space-y-3 rounded-xl border border-[#deddd8] bg-white p-3 shadow-[0_8px_30px_rgba(0,0,0,0.06)]">
          <p className="truncate border-b border-[#ecebe7] px-1 pb-2 text-xs font-medium text-[#666662]" title={page.url}>
            {page.title}
          </p>
          {template.fields.map((f) => (
            <label key={f.key} className="block">
              <span className="mb-1 block text-xs font-medium">{f.label}</span>
              <textarea
                value={values[f.key] ?? ''}
                onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))}
                rows={values[f.key] && values[f.key].length > 60 ? 3 : 1}
                className="w-full resize-y rounded-lg border border-[#d9d9d4] bg-[#fafaf8] px-2 py-1.5"
              />
            </label>
          ))}

          <button
            onClick={handleSend}
            disabled={phase !== 'review'}
            className="w-full rounded-lg bg-[#171717] py-2.5 font-semibold text-white shadow-[0_5px_14px_rgba(0,0,0,0.14)] transition hover:bg-black disabled:opacity-40"
          >
            {template.targets.filter((t) => t.enabled).length > 0
              ? '💾 保存到表格'
              : '未配置 webhook（去模板设置）'}
          </button>

          {outcomes && (
            <ul className="space-y-1 text-xs">
              {outcomes.map((o) => (
                <li key={o.target.id} className={`rounded-md border p-2 font-medium ${o.ok ? 'border-[#cfdcc9] bg-[#f5faf2]' : 'border-[#e8c7c7] bg-[#fff7f7]'}`}>
                  {o.ok ? '✅' : '❌'} {o.target.name}
                  {!o.ok && `：${o.error ?? `HTTP ${o.status}`}`}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {phase === 'idle' && (
        <div className="overflow-hidden rounded-xl border border-[#deddd8] bg-white px-4 py-6 text-center shadow-[0_8px_30px_rgba(0,0,0,0.04)]">
          <pre className="font-mono text-[10px] leading-[0.85] text-[#a3a39d]" aria-hidden="true">{`  ++++++++  \n ++XXXXXX++ \n+XX  XX  XX+\n+XX  XX  XX+\n +XX@@@@XX+ \n  ++XXXX++  `}</pre>
          <p className="mt-4 text-xs font-medium leading-relaxed text-[#666662]">
          打开任意网页（LinkedIn、产品官网、文章…），
          <br />
          点上方按钮开始捕获
          </p>
        </div>
      )}
    </div>
  );
}
