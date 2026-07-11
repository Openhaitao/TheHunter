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
    <div className="space-y-4 p-4">
      <div>
        <p className="text-[10px] font-black tracking-[0.18em] text-[#2f6bff]">QUICK CAPTURE</p>
        <h1 className="mt-1 text-2xl font-black leading-none tracking-tight">抓住这个页面。</h1>
      </div>
      <button
        onClick={handleCapture}
        disabled={phase === 'extracting' || phase === 'sending'}
        className="w-full border-2 border-black bg-[#ffde59] py-3 text-base font-black shadow-[4px_4px_0_#111] transition hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[6px_6px_0_#111] active:translate-x-1 active:translate-y-1 active:shadow-none disabled:cursor-not-allowed disabled:opacity-50"
      >
        {phase === 'extracting' ? 'AI 提取中…' : '🎯 捕获当前页面'}
      </button>

      {candidates.length > 0 && (
        <label className="block">
          <span className="mb-1.5 block text-[10px] font-black tracking-wider">使用模板 / TEMPLATE</span>
          <select
            value={template?.id ?? ''}
            onChange={(e) => setTemplateId(e.target.value)}
            className="w-full border-2 border-black bg-white px-3 py-2 font-bold shadow-[3px_3px_0_#111]"
          >
            {candidates.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </label>
      )}

      {error && <p className="border-2 border-black bg-[#ff76a8] p-3 font-bold shadow-[3px_3px_0_#111]">⚠ {error}</p>}

      {phase === 'review' && template && page && (
        <div className="space-y-3 border-2 border-black bg-white p-3 shadow-[5px_5px_0_#111]">
          <p className="truncate border-b-2 border-black bg-[#b8f397] px-2 py-1.5 text-xs font-bold" title={page.url}>
            {page.title}
          </p>
          {template.fields.map((f) => (
            <label key={f.key} className="block">
              <span className="mb-1 block text-xs font-black">{f.label}</span>
              <textarea
                value={values[f.key] ?? ''}
                onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))}
                rows={values[f.key] && values[f.key].length > 60 ? 3 : 1}
                className="w-full resize-y border-2 border-black bg-[#fffdf5] px-2 py-1.5 shadow-[2px_2px_0_#111]"
              />
            </label>
          ))}

          <button
            onClick={handleSend}
            disabled={phase !== 'review'}
            className="w-full border-2 border-black bg-[#b8f397] py-2.5 font-black shadow-[4px_4px_0_#111] transition hover:-translate-x-0.5 hover:-translate-y-0.5 disabled:opacity-50"
          >
            {template.targets.filter((t) => t.enabled).length > 0
              ? '💾 保存到表格'
              : '未配置 webhook（去模板设置）'}
          </button>

          {outcomes && (
            <ul className="space-y-1 text-xs">
              {outcomes.map((o) => (
                <li key={o.target.id} className={`border-2 border-black p-2 font-bold ${o.ok ? 'bg-[#b8f397]' : 'bg-[#ff76a8]'}`}>
                  {o.ok ? '✅' : '❌'} {o.target.name}
                  {!o.ok && `：${o.error ?? `HTTP ${o.status}`}`}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {phase === 'idle' && (
        <div className="border-2 border-dashed border-black bg-white/80 px-4 py-6 text-center">
          <p className="text-3xl">↖</p>
          <p className="mt-2 text-xs font-bold leading-relaxed">
          打开任意网页（LinkedIn、产品官网、文章…），
          <br />
          点上方按钮开始捕获
          </p>
        </div>
      )}
    </div>
  );
}
