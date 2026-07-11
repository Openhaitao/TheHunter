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
    <div className="space-y-4 p-3">
      <div className="flex items-center justify-between">
        <button onClick={onCancel} className="text-xs text-gray-500 hover:underline">
          ← 返回
        </button>
        <button
          onClick={() => onDelete(t.id)}
          className="text-xs text-red-500 hover:underline"
        >
          删除模板
        </button>
      </div>

      <Field label="模板名称">
        <input
          value={t.name}
          onChange={(e) => set({ name: e.target.value })}
          className="w-full rounded-md border border-gray-300 px-2 py-1.5"
        />
      </Field>

      <Field label="适用网址（每行一条，* 表示任意页面，如 linkedin.com/in/*）">
        <textarea
          value={t.matchers.join('\n')}
          onChange={(e) => set({ matchers: e.target.value.split('\n').map((s) => s.trim()).filter(Boolean) })}
          rows={2}
          className="w-full rounded-md border border-gray-300 px-2 py-1.5 font-mono text-xs"
        />
      </Field>

      <section>
        <div className="mb-1.5 flex items-center justify-between">
          <span className="text-xs font-semibold text-gray-600">字段</span>
          <button
            onClick={() =>
              set({ fields: [...t.fields, { key: `字段${t.fields.length + 1}`, label: `字段${t.fields.length + 1}`, type: 'text' }] })
            }
            className="text-xs text-blue-600 hover:underline"
          >
            + 加字段
          </button>
        </div>
        <div className="space-y-2">
          {t.fields.map((f, i) => (
            <div key={i} className="space-y-1 rounded-lg border border-gray-200 bg-white p-2">
              <div className="flex gap-1.5">
                <input
                  value={f.key}
                  onChange={(e) => setField(i, { key: e.target.value, label: e.target.value })}
                  placeholder="字段名（=发送的 JSON key）"
                  className="min-w-0 flex-1 rounded-md border border-gray-300 px-2 py-1"
                />
                <select
                  value={f.type}
                  onChange={(e) => setField(i, { type: e.target.value as FieldType })}
                  className="rounded-md border border-gray-300 bg-white px-1 py-1 text-xs"
                >
                  {FIELD_TYPES.map((ft) => (
                    <option key={ft}>{ft}</option>
                  ))}
                </select>
                <button
                  onClick={() => set({ fields: t.fields.filter((_, j) => j !== i) })}
                  className="px-1 text-gray-300 hover:text-red-500"
                >
                  ✕
                </button>
              </div>
              <input
                value={f.aiHint ?? ''}
                onChange={(e) => setField(i, { aiHint: e.target.value })}
                placeholder="给 AI 的提取说明，如：此人的完整姓名"
                className="w-full rounded-md border border-gray-200 px-2 py-1 text-xs"
              />
              {f.type === 'select' && (
                <input
                  value={(f.options ?? []).join(',')}
                  onChange={(e) => setField(i, { options: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) })}
                  placeholder="可选值，逗号分隔"
                  className="w-full rounded-md border border-gray-200 px-2 py-1 text-xs"
                />
              )}
            </div>
          ))}
        </div>
      </section>

      <section>
        <div className="mb-1.5 flex items-center justify-between">
          <span className="text-xs font-semibold text-gray-600">输出目标（webhook）</span>
          <button
            onClick={() =>
              set({ targets: [...t.targets, { id: `tgt-${Date.now()}`, name: `目标${t.targets.length + 1}`, webhookUrl: '', enabled: true }] })
            }
            className="text-xs text-blue-600 hover:underline"
          >
            + 加目标
          </button>
        </div>
        <div className="space-y-2">
          {t.targets.map((tg, i) => (
            <div key={tg.id} className="space-y-1 rounded-lg border border-gray-200 bg-white p-2">
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
                  className="min-w-0 flex-1 rounded-md border border-gray-300 px-2 py-1"
                />
                <button
                  onClick={() => set({ targets: t.targets.filter((_, j) => j !== i) })}
                  className="px-1 text-gray-300 hover:text-red-500"
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
                className="w-full rounded-md border border-gray-200 px-2 py-1 font-mono text-xs"
              />
            </div>
          ))}
        </div>
      </section>

      <section>
        <button onClick={() => setShowPrompt(!showPrompt)} className="text-xs text-blue-600 hover:underline">
          {showPrompt ? '收起自定义提示词' : '自定义提示词（可选）'}
        </button>
        {showPrompt && (
          <textarea
            value={t.prompt ?? DEFAULT_PROMPT}
            onChange={(e) => set({ prompt: e.target.value })}
            rows={8}
            className="mt-1.5 w-full rounded-md border border-gray-300 px-2 py-1.5 font-mono text-xs"
          />
        )}
      </section>

      <button
        onClick={() => onSave(t)}
        className="w-full rounded-lg bg-blue-600 py-2.5 font-medium text-white"
      >
        保存模板
      </button>
    </div>
  );
}
