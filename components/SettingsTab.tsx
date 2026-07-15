import { useState } from 'react';
import type { Settings, Template } from '../lib/types';
import { saveSettings, saveTemplates, useSettings, useTemplates } from '../lib/storage';
import TemplateEditor from './TemplateEditor';

export default function SettingsTab() {
  const [settings, reloadSettings] = useSettings();
  const [templates, reloadTemplates] = useTemplates();
  const [editing, setEditing] = useState<Template | null>(null);

  if (!settings || !templates) return null;

  if (editing) {
    return (
      <TemplateEditor
        template={editing}
        onSave={async (t) => {
          const exists = templates.some((x) => x.id === t.id);
          const next = exists ? templates.map((x) => (x.id === t.id ? t : x)) : [...templates, t];
          await saveTemplates(next);
          reloadTemplates();
          setEditing(null);
        }}
        onDelete={async (id) => {
          await saveTemplates(templates.filter((x) => x.id !== id));
          reloadTemplates();
          setEditing(null);
        }}
        onCancel={() => setEditing(null)}
      />
    );
  }

  return (
    <div className="space-y-6 p-4">
      <div>
        <p className="font-mono text-[9px] tracking-[0.18em] text-[#92928c]">// MAKE IT YOURS</p>
        <h1 className="mt-2 text-2xl font-semibold leading-none">按你的方式狩猎。</h1>
      </div>
      <AISection settings={settings} onSaved={reloadSettings} />

      <section>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-base font-semibold">模板 <span className="font-mono text-[9px] font-normal text-[#92928c]">/ TEMPLATES</span></h2>
          <button
            onClick={() =>
              setEditing({
                id: `tpl-${Date.now()}`,
                name: '新模板',
                entity: 'custom',
                matchers: ['*'],
                fields: [{ key: '标题', label: '标题', type: 'text', aiHint: '页面标题' }],
                targets: [],
              })
            }
            className="rounded-md border border-[#c9c9c3] bg-[#ebeae5] px-2.5 py-1.5 text-xs font-medium text-[#171717]"
          >
            + 新建
          </button>
        </div>
        <ul className="space-y-1.5">
          {templates.map((t) => (
            <li
              key={t.id}
              onClick={() => setEditing(t)}
              className="cursor-pointer rounded-lg border border-[#deddd8] bg-white px-3 py-2 shadow-[0_4px_14px_rgba(0,0,0,0.04)] transition hover:border-[#b8b8b2] hover:shadow-[0_6px_18px_rgba(0,0,0,0.07)]"
            >
              <div className="flex items-center justify-between">
                <span className="font-semibold">{t.name}</span>
                <span className="font-mono text-[9px] text-[#8a8a85]">
                  {t.fields.length} 字段 · {t.targets.filter((x) => x.enabled).length} 个目标
                </span>
              </div>
              <p className="truncate text-xs font-medium text-gray-500">{t.matchers.join('，')}</p>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function AISection({ settings, onSaved }: { settings: Settings; onSaved: () => void }) {
  const [ai, setAi] = useState(settings.ai);
  const [saved, setSaved] = useState(false);

  return (
    <section className="space-y-3 rounded-xl border border-[#deddd8] bg-white p-3 shadow-[0_8px_30px_rgba(0,0,0,0.05)]">
      <h2 className="border-b border-[#ecebe7] pb-2 text-base font-semibold">AI 配置 <span className="font-mono text-[9px] font-normal text-[#92928c]">/ BYOK</span></h2>
      <Field label="API 端点（OpenAI 兼容）">
        <input
          value={ai.baseUrl}
          onChange={(e) => setAi({ ...ai, baseUrl: e.target.value })}
          className="w-full rounded-lg border border-[#d9d9d4] px-2 py-1.5"
        />
      </Field>
      <Field label="API Key">
        <input
          type="password"
          value={ai.apiKey}
          onChange={(e) => setAi({ ...ai, apiKey: e.target.value })}
          placeholder="sk-…"
          className="w-full rounded-lg border border-[#d9d9d4] px-2 py-1.5"
        />
      </Field>
      <Field label="模型">
        <input
          value={ai.model}
          onChange={(e) => setAi({ ...ai, model: e.target.value })}
          className="w-full rounded-lg border border-[#d9d9d4] px-2 py-1.5"
        />
      </Field>
      <button
        onClick={async () => {
          await saveSettings({ ...settings, ai });
          onSaved();
          setSaved(true);
          setTimeout(() => setSaved(false), 1500);
        }}
        className="w-full rounded-lg border border-[#c9c9c3] bg-[#ebeae5] py-2 font-semibold text-[#171717] shadow-[0_5px_14px_rgba(0,0,0,0.08)]"
      >
        {saved ? '已保存' : '保存 AI 配置'}
      </button>
    </section>
  );
}

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-[#555550]">{label}</span>
      {children}
    </label>
  );
}
