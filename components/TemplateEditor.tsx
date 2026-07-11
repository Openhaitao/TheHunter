import { useState } from 'react';
import type { FieldDef, FieldType, Template } from '../lib/types';
import { DEFAULT_PROMPT } from '../lib/presets';
import { Field } from './SettingsTab';

const FIELD_TYPES: FieldType[] = ['text', 'url', 'number', 'date', 'select'];

export default function TemplateEditor({
  template,
  onSave,
  onDelete,
  onCancel,
}: {
  template: Template;
  onSave: (t: Template) => void;
  onDelete: (id: string) => void;
  onCancel: () => void;
}) {
  const [t, setT] = useState<Template>(structuredClone(template));
  const [showPrompt, setShowPrompt] = useState(Boolean(template.prompt));

  const set = (patch: Partial<Template>) => setT((prev) => ({ ...prev, ...patch }));
  const setField = (i: number, patch: Partial<FieldDef>) =>
    set({ fields: t.fields.map((f, j) => (j === i ? { ...f, ...patch } : f)) });

  return (
    <div className="space-y-4 p-4">
      <div className="flex items-center justify-between border-b border-[#deddd8] pb-3">
        <button onClick={onCancel} className="rounded-md border border-[#d9d9d4] bg-white px-2 py-1 text-xs font-medium">
          ← 返回
        </button>
        <button
          onClick={() => onDelete(t.id)}
          className="rounded-md border border-[#e5cccc] bg-[#fff7f7] px-2 py-1 text-xs font-medium text-[#9a3030]"
        >
          删除模板
        </button>
      </div>

      <Field label="模板名称">
        <input
          value={t.name}
          onChange={(e) => set({ name: e.target.value })}
          className="w-full rounded-lg border border-[#d9d9d4] bg-white px-2 py-1.5"
        />
      </Field>

      <Field label="适用网址（每行一条，* 表示任意页面，如 linkedin.com/in/*）">
        <textarea
          value={t.matchers.join('\n')}
          onChange={(e) => set({ matchers: e.target.value.split('\n').map((s) => s.trim()).filter(Boolean) })}
          rows={2}
          className="w-full rounded-lg border border-[#d9d9d4] bg-white px-2 py-1.5 font-mono text-xs"
        />
      </Field>

      <section>
        <div className="mb-1.5 flex items-center justify-between">
          <span className="text-sm font-semibold">字段 <span className="font-mono text-[9px] font-normal text-[#92928c]">/ FIELDS</span></span>
          <button
            onClick={() =>
              set({ fields: [...t.fields, { key: `字段${t.fields.length + 1}`, label: `字段${t.fields.length + 1}`, type: 'text' }] })
            }
            className="rounded-md border border-[#d9d9d4] bg-white px-2 py-1 text-xs font-medium"
          >
            + 加字段
          </button>
        </div>
        <div className="space-y-2">
          {t.fields.map((f, i) => (
            <div key={i} className="space-y-1.5 rounded-lg border border-[#deddd8] bg-white p-2 shadow-[0_4px_14px_rgba(0,0,0,0.04)]">
              <div className="flex gap-1.5">
                <input
                  value={f.key}
                  onChange={(e) => setField(i, { key: e.target.value, label: e.target.value })}
                  placeholder="字段名（=发送的 JSON key）"
                  className="min-w-0 flex-1 rounded-md border border-[#d9d9d4] px-2 py-1"
                />
                <select
                  value={f.type}
                  onChange={(e) => setField(i, { type: e.target.value as FieldType })}
                  className="rounded-md border border-[#d9d9d4] bg-[#f6f5f1] px-1 py-1 text-xs"
                >
                  {FIELD_TYPES.map((ft) => (
                    <option key={ft}>{ft}</option>
                  ))}
                </select>
                <button
                  onClick={() => set({ fields: t.fields.filter((_, j) => j !== i) })}
                  className="px-1 text-[#aaa] hover:text-red-500"
                >
                  ✕
                </button>
              </div>
              <input
                value={f.aiHint ?? ''}
                onChange={(e) => setField(i, { aiHint: e.target.value })}
                placeholder="给 AI 的提取说明，如：此人的完整姓名"
                className="w-full rounded-md border border-[#deddd8] px-2 py-1 text-xs"
              />
              {f.type === 'select' && (
                <input
                  value={(f.options ?? []).join(',')}
                  onChange={(e) => setField(i, { options: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) })}
                  placeholder="可选值，逗号分隔"
                  className="w-full rounded-md border border-[#deddd8] px-2 py-1 text-xs"
                />
              )}
            </div>
          ))}
        </div>
      </section>

      <section>
        <div className="mb-1.5 flex items-center justify-between">
          <span className="text-sm font-semibold">输出目标 <span className="font-mono text-[9px] font-normal text-[#92928c]">/ WEBHOOK</span></span>
          <button
            onClick={() =>
              set({ targets: [...t.targets, { id: `tgt-${Date.now()}`, name: `目标${t.targets.length + 1}`, webhookUrl: '', enabled: true }] })
            }
            className="rounded-md border border-[#d9d9d4] bg-white px-2 py-1 text-xs font-medium"
          >
            + 加目标
          </button>
        </div>
        <div className="space-y-2">
          {t.targets.map((tg, i) => (
            <div key={tg.id} className="space-y-1.5 rounded-lg border border-[#deddd8] bg-white p-2 shadow-[0_4px_14px_rgba(0,0,0,0.04)]">
              <div className="flex items-center gap-1.5">
                <input
                  type="checkbox"
                  checked={tg.enabled}
                  onChange={(e) =>
                    set({ targets: t.targets.map((x, j) => (j === i ? { ...x, enabled: e.target.checked } : x)) })
                  }
                />
                <input
                  value={tg.name}
                  onChange={(e) =>
                    set({ targets: t.targets.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)) })
                  }
                  placeholder="名称，如：公司人员名单"
                  className="min-w-0 flex-1 rounded-md border border-[#d9d9d4] px-2 py-1"
                />
                <button
                  onClick={() => set({ targets: t.targets.filter((_, j) => j !== i) })}
                  className="px-1 text-[#aaa] hover:text-red-500"
                >
                  ✕
                </button>
              </div>
              <input
                value={tg.webhookUrl}
                onChange={(e) =>
                  set({ targets: t.targets.map((x, j) => (j === i ? { ...x, webhookUrl: e.target.value } : x)) })
                }
                placeholder="https://…（飞书自动化 webhook 地址）"
                className="w-full rounded-md border border-[#deddd8] px-2 py-1 font-mono text-xs"
              />
            </div>
          ))}
        </div>
      </section>

      <section>
        <button onClick={() => setShowPrompt(!showPrompt)} className="text-xs font-medium text-[#555550] underline underline-offset-4">
          {showPrompt ? '收起自定义提示词' : '自定义提示词（可选）'}
        </button>
        {showPrompt && (
          <textarea
            value={t.prompt ?? DEFAULT_PROMPT}
            onChange={(e) => set({ prompt: e.target.value })}
            rows={8}
            className="mt-2 w-full rounded-lg border border-[#d9d9d4] bg-white px-2 py-1.5 font-mono text-xs"
          />
        )}
      </section>

      <button
        onClick={() => onSave(t)}
        className="w-full rounded-lg bg-[#171717] py-2.5 font-semibold text-white shadow-[0_5px_14px_rgba(0,0,0,0.14)]"
      >
        保存模板
      </button>
    </div>
  );
}
