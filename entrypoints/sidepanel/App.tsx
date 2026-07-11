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
    <div className="flex h-full flex-col bg-[#f6f5f1] text-sm text-[#171717]">
      <header className="flex items-center justify-between border-b border-[#deddd8] bg-[#faf9f6] px-4 py-3">
        <div className="flex items-center gap-2.5">
          <span className="grid h-8 w-8 place-items-center rounded-lg border border-[#d7d7d2] bg-white">
            <img src="/icon-32.png" alt="" className="h-6 w-6" />
          </span>
          <div className="leading-none">
            <span className="block text-base font-semibold tracking-tight">TheHunter</span>
            <span className="mt-1 block font-mono text-[8px] tracking-[0.12em] text-[#8b8b86]">AGENT-NATIVE CLIPPER</span>
          </div>
        </div>
        <span className="rounded-md border border-[#deddd8] bg-white px-2 py-1 font-mono text-[9px] text-[#777772]">BETA_02</span>
      </header>

      <main className="min-h-0 flex-1 overflow-y-auto">
        {tab === 'capture' && <CaptureTab />}
        {tab === 'manage' && <ManageTab />}
        {tab === 'settings' && <SettingsTab />}
      </main>

      <nav className="flex gap-1 border-t border-[#deddd8] bg-[#faf9f6] p-2">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 rounded-lg px-1 py-2 text-center text-xs font-medium transition ${
              tab === t.id
                ? 'bg-[#171717] text-white shadow-[0_4px_12px_rgba(0,0,0,0.12)]'
                : 'text-[#858580] hover:bg-white hover:text-black'
            }`}
          >
            {t.label}
          </button>
        ))}
      </nav>
    </div>
  );
}
