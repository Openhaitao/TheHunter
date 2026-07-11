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

export default function App() {
  const [tab, setTab] = useState<Tab>('capture');

  return (
    <div className="flex h-full flex-col bg-gray-50 text-sm text-gray-900">
      <header className="flex items-center gap-2 border-b border-gray-200 bg-white px-3 py-2">
        <img src="/icon-32.png" alt="" className="h-5 w-5" />
        <span className="font-semibold">TheHunter</span>
      </header>

      <main className="min-h-0 flex-1 overflow-y-auto">
        {tab === 'capture' && <CaptureTab />}
        {tab === 'manage' && <ManageTab />}
        {tab === 'settings' && <SettingsTab />}
      </main>

      <nav className="flex border-t border-gray-200 bg-white">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 py-2.5 text-center font-medium transition-colors ${
              tab === t.id ? 'text-blue-600' : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            {t.label}
          </button>
        ))}
      </nav>
    </div>
  );
}
