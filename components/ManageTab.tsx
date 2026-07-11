import { useState } from 'react';
import { useSettings, saveSettings } from '../lib/storage';

export default function ManageTab() {
  const [settings, reload] = useSettings();
  const [draft, setDraft] = useState('');

  if (!settings) return null;

  if (!settings.manageEmbedUrl) {
    return (
      <div className="space-y-3 p-4">
        <h2 className="font-semibold">内嵌你的表格</h2>
        <p className="text-xs leading-relaxed text-gray-500">
          把飞书多维表格的「分享 → 开启链接分享」地址粘贴到这里，
          就能在侧边栏直接查看和管理已保存的数据。
        </p>
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="https://xxx.feishu.cn/base/…"
          className="w-full rounded-md border border-gray-300 px-2 py-1.5"
        />
        <button
          onClick={async () => {
            await saveSettings({ ...settings, manageEmbedUrl: draft.trim() });
            reload();
          }}
          disabled={!draft.trim()}
          className="w-full rounded-lg bg-blue-600 py-2 font-medium text-white disabled:opacity-50"
        >
          保存
        </button>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-gray-200 bg-white px-3 py-1.5 text-xs">
        <span className="text-gray-400">已内嵌表格视图</span>
        <button
          onClick={async () => {
            await saveSettings({ ...settings, manageEmbedUrl: '' });
            reload();
          }}
          className="text-blue-600 hover:underline"
        >
          更换链接
        </button>
      </div>
      <iframe src={settings.manageEmbedUrl} className="min-h-0 w-full flex-1 border-0" />
    </div>
  );
}
