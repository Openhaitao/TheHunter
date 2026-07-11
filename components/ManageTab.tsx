import { useState } from 'react';
import { useSettings, saveSettings } from '../lib/storage';

export default function ManageTab() {
  const [settings, reload] = useSettings();
  const [draft, setDraft] = useState('');

  if (!settings) return null;

  if (!settings.manageEmbedUrl) {
    return (
      <div className="space-y-4 p-4">
        <p className="font-mono text-[9px] tracking-[0.18em] text-[#92928c]">// YOUR DATABASE</p>
        <h2 className="text-2xl font-semibold leading-none">把表格搬进来。</h2>
        <p className="rounded-lg border border-[#deddd8] bg-white p-3 text-xs leading-relaxed text-[#666662]">
          把飞书多维表格的「分享 → 开启链接分享」地址粘贴到这里，
          就能在侧边栏直接查看和管理已保存的数据。
        </p>
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="https://xxx.feishu.cn/base/…"
          className="w-full rounded-lg border border-[#d9d9d4] bg-white px-3 py-2 shadow-[0_3px_10px_rgba(0,0,0,0.04)]"
        />
        <button
          onClick={async () => {
            await saveSettings({ ...settings, manageEmbedUrl: draft.trim() });
            reload();
          }}
          disabled={!draft.trim()}
          className="w-full rounded-lg bg-[#171717] py-2.5 font-semibold text-white shadow-[0_5px_14px_rgba(0,0,0,0.14)] disabled:opacity-40"
        >
          保存
        </button>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-[#deddd8] bg-white px-3 py-2 text-xs font-medium">
        <span>● 已内嵌表格视图</span>
        <button
          onClick={async () => {
            await saveSettings({ ...settings, manageEmbedUrl: '' });
            reload();
          }}
          className="rounded-md border border-[#d9d9d4] bg-white px-2 py-1 font-medium text-[#666662]"
        >
          更换链接
        </button>
      </div>
      <iframe src={settings.manageEmbedUrl} className="min-h-0 w-full flex-1 border-0" />
    </div>
  );
}
