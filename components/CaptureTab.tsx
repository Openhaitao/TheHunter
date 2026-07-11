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
    <div className="space-y-3 p-3">
      <button
        onClick={handleCapture}
        disabled={phase === 'extracting' || phase === 'sending'}
        className="w-full rounded-lg bg-blue-600 py-2.5 font-medium text-white transition hover:bg-blue-700 disabled:opacity-50"
      >
        {phase === 'extracting' ? 'AI 提取中…' : '🎯 捕获当前页面'}
      </button>

      {candidates.length > 0 && (
        <label className="block">
          <span className="mb-1 block text-xs text-gray-500">使用模板</span>
          <select
            value={template?.id ?? ''}
            onChange={(e) => setTemplateId(e.target.value)}
            className="w-full rounded-md border border-gray-300 bg-white px-2 py-1.5"
          >
            {candidates.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </label>
      )}

      {error && <p className="rounded-md bg-red-50 p-2 text-red-600">{error}</p>}

      {phase === 'review' && template && page && (
        <div className="space-y-2 rounded-lg border border-gray-200 bg-white p-3">
          <p className="truncate text-xs text-gray-400" title={page.url}>
            {page.title}
          </p>
          {template.fields.map((f) => (
            <label key={f.key} className="block">
              <span className="mb-0.5 block text-xs font-medium text-gray-600">{f.label}</span>
              <textarea
                value={values[f.key] ?? ''}
                onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))}
                rows={values[f.key] && values[f.key].length > 60 ? 3 : 1}
                className="w-full resize-y rounded-md border border-gray-300 px-2 py-1.5"
              />
            </label>
          ))}

          <button
            onClick={handleSend}
            disabled={phase !== 'review'}
            className="w-full rounded-lg bg-green-600 py-2 font-medium text-white transition hover:bg-green-700 disabled:opacity-50"
          >
            {template.targets.filter((t) => t.enabled).length > 0
              ? '💾 保存到表格'
              : '未配置 webhook（去模板设置）'}
          </button>

          {outcomes && (
            <ul className="space-y-1 text-xs">
              {outcomes.map((o) => (
                <li key={o.target.id} className={o.ok ? 'text-green-600' : 'text-red-600'}>
                  {o.ok ? '✅' : '❌'} {o.target.name}
                  {!o.ok && `：${o.error ?? `HTTP ${o.status}`}`}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {phase === 'idle' && (
        <p className="pt-6 text-center text-xs leading-relaxed text-gray-400">
          打开任意网页（LinkedIn、产品官网、文章…），
          <br />
          点上方按钮开始捕获
        </p>
      )}
    </div>
  );
}
