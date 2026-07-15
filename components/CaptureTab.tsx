import { useEffect, useState } from 'react';
import type { PageData, Template } from '../lib/types';
import { useSettings, useTemplates } from '../lib/storage';
import { extractActiveTab } from '../lib/extract';
import { extractWithAI } from '../lib/llm';
import { matchTemplates, sendToWebhooks, type SendOutcome } from '../lib/webhook';
import Icon from './Icon';

type Phase = 'idle' | 'extracting' | 'review' | 'sending';

export default function CaptureTab({ onOpenSettings }: { onOpenSettings: () => void }) {
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
  const aiReady = Boolean(settings?.ai.apiKey.trim() && settings.ai.baseUrl.trim() && settings.ai.model.trim());
  const enabledTargets = template?.targets.filter((t) => t.enabled && t.webhookUrl.trim()) ?? [];

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

  function handleContinue() {
    setPage(null);
    setValues({});
    setOutcomes(null);
    setError('');
    setPhase('idle');
  }

  return (
    <div className="space-y-5 p-4">
      <div>
        <p className="font-mono text-[9px] tracking-[0.18em] text-[#92928c]">// QUICK CAPTURE</p>
        <h1 className="mt-2 text-2xl font-semibold leading-none tracking-tight">抓住这个页面。</h1>
        <p className="mt-2 text-xs leading-relaxed text-[#777772]">AI 读取当前页面，整理成你需要的结构化数据。</p>
      </div>
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

      <SetupStatus aiReady={aiReady} targetReady={enabledTargets.length > 0} onOpenSettings={onOpenSettings} />

      <button
        onClick={handleCapture}
        disabled={phase === 'extracting' || phase === 'sending' || !aiReady || !template}
        className="group flex w-full items-center justify-between rounded-xl border border-[#aeada7] bg-[#e7e6e1] px-4 py-3 text-sm font-semibold text-[#171717] shadow-[0_6px_18px_rgba(0,0,0,0.09)] transition hover:border-[#8f8e89] hover:bg-[#deddd8] hover:shadow-[0_8px_24px_rgba(0,0,0,0.12)] active:translate-y-px disabled:cursor-not-allowed disabled:opacity-40"
      >
        <span className="flex items-center gap-2"><Icon name="target" />{phase === 'extracting' ? '正在提取' : aiReady ? '开始捕获' : '先完成 AI 配置'}</span>
        <Icon name="arrow" className="h-4 w-4 transition group-hover:translate-x-0.5" />
      </button>

      {(phase === 'extracting' || phase === 'sending') && <ProgressPanel phase={phase} />}

      {error && <p className="flex gap-2 rounded-lg border border-[#e8c7c7] bg-[#fff7f7] p-3 font-medium text-[#9a3030]"><Icon name="alert" className="mt-0.5 h-4 w-4 shrink-0" />{error}</p>}

      {(phase === 'review' || phase === 'sending') && template && page && (
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
            disabled={phase !== 'review' || enabledTargets.length === 0}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-[#aaa9a3] bg-[#e7e6e1] py-2.5 font-semibold text-[#171717] shadow-[0_5px_14px_rgba(0,0,0,0.08)] transition hover:bg-[#deddd8] disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Icon name="save" />{phase === 'sending' ? '正在保存' : enabledTargets.length > 0 ? '保存到表格' : '尚未配置输出目标'}
          </button>

          {enabledTargets.length === 0 && (
            <button onClick={onOpenSettings} className="flex w-full items-center justify-center gap-1.5 text-xs font-medium text-[#555550] underline underline-offset-4">
              <Icon name="settings" className="h-3.5 w-3.5" />去设置输出目标
            </button>
          )}

          {outcomes && (
            <ul className="space-y-1 text-xs">
              {outcomes.map((o) => (
                <li key={o.target.id} className={`flex items-start gap-2 rounded-md border p-2 font-medium ${o.ok ? 'border-[#cfdcc9] bg-[#f5faf2]' : 'border-[#e8c7c7] bg-[#fff7f7]'}`}>
                  <Icon name={o.ok ? 'check' : 'alert'} className="mt-0.5 h-3.5 w-3.5 shrink-0" /><span>{o.target.name}
                  {!o.ok && `：${o.error ?? `HTTP ${o.status}`}`}
                  </span>
                </li>
              ))}
            </ul>
          )}

          {outcomes?.some((o) => o.ok) && (
            <button onClick={handleContinue} className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-[#d2d1cc] bg-white py-2 text-xs font-medium">
              继续捕获下一个<Icon name="arrow" className="h-3.5 w-3.5" />
            </button>
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

function SetupStatus({ aiReady, targetReady, onOpenSettings }: { aiReady: boolean; targetReady: boolean; onOpenSettings: () => void }) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-[#deddd8] bg-white px-3 py-2 text-[10px]">
      <div className="flex flex-wrap gap-x-3 gap-y-1 text-[#666662]">
        <span className="flex items-center gap-1"><span className={`h-1.5 w-1.5 rounded-full ${aiReady ? 'bg-[#66855b]' : 'bg-[#bd7b62]'}`} />AI {aiReady ? '已连接' : '未配置'}</span>
        <span className="flex items-center gap-1"><span className={`h-1.5 w-1.5 rounded-full ${targetReady ? 'bg-[#66855b]' : 'bg-[#b3b2ac]'}`} />输出 {targetReady ? '已就绪' : '未配置'}</span>
      </div>
      {(!aiReady || !targetReady) && <button onClick={onOpenSettings} className="font-medium underline underline-offset-4">去设置</button>}
    </div>
  );
}

function ProgressPanel({ phase }: { phase: 'extracting' | 'sending' }) {
  const steps = phase === 'extracting' ? ['读取页面', 'AI 整理', '生成字段'] : ['校验字段', '发送数据', '等待确认'];
  return (
    <div className="rounded-lg border border-[#deddd8] bg-white p-3">
      <div className="mb-2 flex items-center gap-2 text-xs font-medium"><span className="h-3 w-3 animate-spin rounded-full border-2 border-[#aaa9a3] border-t-transparent" />{phase === 'extracting' ? '正在处理页面' : '正在保存数据'}</div>
      <div className="grid grid-cols-3 gap-1 font-mono text-[9px] text-[#888883]">
        {steps.map((step, index) => <span key={step} className="border-t border-[#deddd8] pt-1">0{index + 1} {step}</span>)}
      </div>
    </div>
  );
}
