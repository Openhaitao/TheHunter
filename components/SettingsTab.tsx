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
    <div className="space-y-5 p-3">
      <AISection settings={settings} onSaved={reloadSettings} />

      <section>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="font-semibold">模板</h2>
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
            className="rounded-md bg-blue-600 px-2.5 py-1 text-xs font-medium text-white"
          >
            + 新建
          </button>
        </div>
        <ul className="space-y-1.5">
          {templates.map((t) => (
            <li
              key={t.id}
              onClick={() => setEditing(t)}
              className="cursor-pointer rounded-lg border border-gray-200 bg-white px-3 py-2 hover:border-blue-400"
            >
              <div className="flex items-center justify-between">
                <span className="font-medium">{t.name}</span>
                <span className="text-xs text-gray-400">
                  {t.fields.length} 字段 · {t.targets.filter((x) => x.enabled).length} 个目标
                </span>
              </div>
              <p className="truncate text-xs text-gray-400">{t.matchers.join('，')}</p>
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
    <section className="space-y-2">
      <h2 className="font-semibold">AI 配置（自带 Key）</h2>
      <Field label="API 端点（OpenAI 兼容）">
        <input
          value={ai.baseUrl}
          onChange={(e) => setAi({ ...ai, baseUrl: e.target.value })}
          className="w-full rounded-md border border-gray-300 px-2 py-1.5"
        />
      </Field>
      <Field label="API Key">
        <input
          type="password"
          value={ai.apiKey}
          onChange={(e) => setAi({ ...ai, apiKey: e.target.value })}
          placeholder="sk-…"
          className="w-full rounded-md border border-gray-300 px-2 py-1.5"
        />
      </Field>
      <Field label="模型">
        <input
          value={ai.model}
          onChange={(e) => setAi({ ...ai, model: e.target.value })}
          className="w-full rounded-md border border-gray-300 px-2 py-1.5"
        />
      </Field>
      <button
        onClick={async () => {
          await saveSettings({ ...settings, ai });
          onSaved();
          setSaved(true);
          setTimeout(() => setSaved(false), 1500);
        }}
        className="w-full rounded-lg bg-blue-600 py-2 font-medium text-white"
      >
        {saved ? '✅ 已保存' : '保存 AI 配置'}
      </button>
    </section>
  );
}

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-0.5 block text-xs text-gray-500">{label}</span>
      {children}
    </label>
  );
}
