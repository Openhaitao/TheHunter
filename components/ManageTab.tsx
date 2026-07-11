import { useState } from 'react';
import { useSettings, saveSettings } from '../lib/storage';

export default function ManageTab() {
  const [settings, reload] = useSettings();
  const [draft, setDraft] = useState('');

  if (!settings) return null;

  if (!settings.manageEmbedUrl) {
    return (
      <div className="space-y-4 p-4">
        <p className="text-[10px] font-black tracking-[0.18em] text-[#2f6bff]">YOUR DATABASE</p>
        <h2 className="text-2xl font-black leading-none">把表格搬进来。</h2>
        <p className="border-l-4 border-black bg-[#ffde59] p-3 text-xs font-medium leading-relaxed">
          把飞书多维表格的「分享 → 开启链接分享」地址粘贴到这里，
          就能在侧边栏直接查看和管理已保存的数据。
        </p>
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="https://xxx.feishu.cn/base/…"
          className="w-full border-2 border-black bg-white px-3 py-2 shadow-[3px_3px_0_#111]"
        />
        <button
          onClick={async () => {
            await saveSettings({ ...settings, manageEmbedUrl: draft.trim() });
            reload();
          }}
          disabled={!draft.trim()}
          className="w-full border-2 border-black bg-[#2f6bff] py-2.5 font-black text-white shadow-[4px_4px_0_#111] disabled:opacity-50"
        >
          保存
        </button>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b-2 border-black bg-[#b8f397] px-3 py-2 text-xs font-bold">
        <span>● 已内嵌表格视图</span>
        <button
          onClick={async () => {
            await saveSettings({ ...settings, manageEmbedUrl: '' });
            reload();
          }}
          className="border-2 border-black bg-white px-2 py-1 font-black shadow-[2px_2px_0_#111]"
        >
          更换链接
        </button>
      </div>
      <iframe src={settings.manageEmbedUrl} className="min-h-0 w-full flex-1 border-0" />
    </div>
  );
}
