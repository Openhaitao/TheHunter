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
        <p className="text-[10px] font-black tracking-[0.18em] text-[#2f6bff]">MAKE IT YOURS</p>
        <h1 className="mt-1 text-2xl font-black leading-none">按你的方式狩猎。</h1>
      </div>
      <AISection settings={settings} onSaved={reloadSettings} />

      <section>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-base font-black">模板 / TEMPLATES</h2>
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
            className="border-2 border-black bg-[#ff76a8] px-2.5 py-1 text-xs font-black shadow-[2px_2px_0_#111]"
          >
            + 新建
          </button>
        </div>
        <ul className="space-y-1.5">
          {templates.map((t) => (
            <li
              key={t.id}
              onClick={() => setEditing(t)}
              className="cursor-pointer border-2 border-black bg-white px-3 py-2 shadow-[3px_3px_0_#111] transition hover:-translate-x-0.5 hover:-translate-y-0.5 hover:bg-[#ffde59]"
            >
              <div className="flex items-center justify-between">
                <span className="font-black">{t.name}</span>
                <span className="text-[10px] font-bold">
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
    <section className="space-y-3 border-2 border-black bg-white p-3 shadow-[5px_5px_0_#111]">
      <h2 className="border-b-2 border-black bg-[#b8f397] px-2 py-1.5 text-base font-black">AI 配置 / BYOK</h2>
      <Field label="API 端点（OpenAI 兼容）">
        <input
          value={ai.baseUrl}
          onChange={(e) => setAi({ ...ai, baseUrl: e.target.value })}
          className="w-full border-2 border-black px-2 py-1.5"
        />
      </Field>
      <Field label="API Key">
        <input
          type="password"
          value={ai.apiKey}
          onChange={(e) => setAi({ ...ai, apiKey: e.target.value })}
          placeholder="sk-…"
          className="w-full border-2 border-black px-2 py-1.5"
        />
      </Field>
      <Field label="模型">
        <input
          value={ai.model}
          onChange={(e) => setAi({ ...ai, model: e.target.value })}
          className="w-full border-2 border-black px-2 py-1.5"
        />
      </Field>
      <button
        onClick={async () => {
          await saveSettings({ ...settings, ai });
          onSaved();
          setSaved(true);
          setTimeout(() => setSaved(false), 1500);
        }}
        className="w-full border-2 border-black bg-[#2f6bff] py-2 font-black text-white shadow-[3px_3px_0_#111]"
      >
        {saved ? '✅ 已保存' : '保存 AI 配置'}
      </button>
    </section>
  );
}

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-black">{label}</span>
      {children}
    </label>
  );
}
