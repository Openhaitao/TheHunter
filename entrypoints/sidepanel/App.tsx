import { useState } from 'react';
import CaptureTab from '../../components/CaptureTab';
import ManageTab from '../../components/ManageTab';
import SettingsTab from '../../components/SettingsTab';

type Tab = 'capture' | 'manage' | 'settings';

const TABS: { id: Tab; label: string }[] = [
  { id: 'capture', label: '01 捕获' },
  { id: 'manage', label: '02 管理' },
  { id: 'settings', label: '03 设置' },
];

export default function App() {
  const [tab, setTab] = useState<Tab>('capture');

  return (
    <div className="flex h-full flex-col text-sm text-black">
      <header className="flex items-center justify-between border-b-2 border-black bg-[#ffde59] px-3 py-2.5">
        <div className="flex items-center gap-2.5">
          <span className="grid h-8 w-8 place-items-center border-2 border-black bg-white shadow-[2px_2px_0_#111]">
            <img src="/icon-32.png" alt="" className="h-6 w-6" />
          </span>
          <div className="leading-none">
            <span className="block text-base font-black tracking-tight">THEHUNTER</span>
            <span className="mt-1 block text-[9px] font-bold tracking-[0.16em]">CAPTURE THE WEB</span>
          </div>
        </div>
        <span className="rotate-2 border-2 border-black bg-[#ff76a8] px-2 py-0.5 text-[10px] font-black shadow-[2px_2px_0_#111]">BETA</span>
      </header>

      <main className="min-h-0 flex-1 overflow-y-auto">
        {tab === 'capture' && <CaptureTab />}
        {tab === 'manage' && <ManageTab />}
        {tab === 'settings' && <SettingsTab />}
      </main>

      <nav className="flex gap-1.5 border-t-2 border-black bg-[#fff8dc] p-2">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 border-2 border-black px-1 py-2 text-center text-xs font-black transition ${
              tab === t.id
                ? 'translate-x-[-2px] translate-y-[-2px] bg-[#2f6bff] text-white shadow-[3px_3px_0_#111]'
                : 'bg-white hover:bg-[#ffde59]'
            }`}
          >
            {t.label}
          </button>
        ))}
      </nav>
    </div>
  );
}
