import { useState } from 'react';
import CaptureTab from '../../components/CaptureTab';
import ManageTab from '../../components/ManageTab';
import SettingsTab from '../../components/SettingsTab';

type Tab = 'capture' | 'manage' | 'settings';

const TABS: { id: Tab; label: string }[] = [
  { id: 'capture', label: '捕获' },
  { id: 'manage', label: '管理' },
  { id: 'settings', label: '设置' },
];

function TabIcon({ id }: { id: Tab }) {
  const paths = {
    capture: <><circle cx="12" cy="12" r="3" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3" /></>,
    manage: <><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M3 9h18M9 9v11" /></>,
    settings: <><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-2.83 2.83-.06-.06a1.7 1.7 0 0 0-1.88-.34 1.7 1.7 0 0 0-1.03 1.55V21h-4v-.08A1.7 1.7 0 0 0 8.95 19.4a1.7 1.7 0 0 0-1.88.34l-.06.06-2.83-2.83.06-.06A1.7 1.7 0 0 0 4.58 15 1.7 1.7 0 0 0 3 14H3v-4h.08A1.7 1.7 0 0 0 4.6 8.95a1.7 1.7 0 0 0-.34-1.88L4.2 7l2.83-2.83.06.06A1.7 1.7 0 0 0 9 4.58 1.7 1.7 0 0 0 10 3V3h4v.08A1.7 1.7 0 0 0 15.05 4.6a1.7 1.7 0 0 0 1.88-.34L17 4.2 19.8 7l-.06.06A1.7 1.7 0 0 0 19.4 9 1.7 1.7 0 0 0 21 10h.08v4H21a1.7 1.7 0 0 0-1.6 1Z" /></>,
  };
  return <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">{paths[id]}</svg>;
}

export default function App() {
  const [tab, setTab] = useState<Tab>('capture');

  return (
    <div className="flex h-full flex-col bg-[#f6f5f1] text-sm text-[#171717]">
      <div className="flex min-h-0 flex-1">
        <main className="min-w-0 flex-1 overflow-y-auto">
          {tab === 'capture' && <CaptureTab onOpenSettings={() => setTab('settings')} />}
          {tab === 'manage' && <ManageTab />}
          {tab === 'settings' && <SettingsTab />}
        </main>

        <nav className="flex w-[68px] shrink-0 flex-col gap-2 border-l border-[#deddd8] bg-[#faf9f6] p-2">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              title={t.label}
              aria-current={tab === t.id ? 'page' : undefined}
              className={`flex flex-col items-center gap-1.5 rounded-xl border px-1 py-3 text-[10px] font-medium transition ${
                tab === t.id
                  ? 'border-[#cecec8] bg-white text-[#171717] shadow-[0_4px_14px_rgba(0,0,0,0.07)]'
                  : 'border-transparent text-[#92928c] hover:border-[#e4e3de] hover:bg-white hover:text-black'
              }`}
            >
              <TabIcon id={t.id} />
              <span>{t.label}</span>
            </button>
          ))}
        </nav>
      </div>
    </div>
  );
}
