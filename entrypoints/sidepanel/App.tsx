import { useState } from 'react';
import ParsePage from '../../components/ParsePage';
import SettingsPage from '../../components/SettingsPage';

type Tool = 'parse' | 'settings';

function ParseIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-[18px] w-[18px]"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M4.5 8V5.5a1 1 0 0 1 1-1H8M16 4.5h2.5a1 1 0 0 1 1 1V8M19.5 16v2.5a1 1 0 0 1-1 1H16M8 19.5H5.5a1 1 0 0 1-1-1V16" />
      <path d="M13.8 8.2c.3 1.15.85 1.7 2 2-.95.25-1.65.9-2 2-.3-1.1-.95-1.75-2-2 1.1-.3 1.7-.9 2-2Z" />
    </svg>
  );
}

function SettingsIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-[18px] w-[18px]"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-2.83 2.83-.06-.06a1.7 1.7 0 0 0-1.88-.34 1.7 1.7 0 0 0-1.03 1.55V21h-4v-.08A1.7 1.7 0 0 0 8.95 19.4a1.7 1.7 0 0 0-1.88.34l-.06.06-2.83-2.83.06-.06A1.7 1.7 0 0 0 4.58 15 1.7 1.7 0 0 0 3 14v-4h.08A1.7 1.7 0 0 0 4.6 8.95a1.7 1.7 0 0 0-.34-1.88L4.2 7l2.83-2.83.06.06A1.7 1.7 0 0 0 9 4.58 1.7 1.7 0 0 0 10 3.08V3h4v.08A1.7 1.7 0 0 0 15.05 4.6a1.7 1.7 0 0 0 1.88-.34L17 4.2 19.8 7l-.06.06A1.7 1.7 0 0 0 19.4 9 1.7 1.7 0 0 0 20.92 10H21v4h-.08A1.7 1.7 0 0 0 19.4 15Z" />
    </svg>
  );
}

function RefreshIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-[18px] w-[18px]"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M19 7v4h-4" />
      <path d="M18.1 15.5A7 7 0 1 1 19 11" />
    </svg>
  );
}

function ToolButton({
  active,
  icon,
  label,
  onClick,
}: {
  active: boolean;
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={active}
      title={label}
      onClick={onClick}
      className={`flex h-8 w-8 items-center justify-center transition-colors ${
        active
          ? 'text-[#242421]'
          : 'text-[#aaa9a3] hover:text-[#5f5e59]'
      }`}
    >
      {icon}
    </button>
  );
}

export default function App() {
  const [tool, setTool] = useState<Tool>('parse');
  const [resetToken, setResetToken] = useState(0);

  const resetAndParse = () => {
    setTool('parse');
    setResetToken((token) => token + 1);
  };

  return (
    <div className="flex h-full bg-[#f6f5f1] text-[#171717]">
      <main className="min-w-0 flex-1" aria-label={tool === 'parse' ? '解析' : '设置'}>
        <div className={tool === 'parse' ? 'h-full' : 'hidden'}>
          <ParsePage resetToken={resetToken} onOpenSettings={() => setTool('settings')} />
        </div>
        <div className={tool === 'settings' ? 'h-full' : 'hidden'}>
          <SettingsPage />
        </div>
      </main>

      <nav
        aria-label="工具"
        className="flex w-11 shrink-0 flex-col items-center justify-between border-l border-[#e1e0db] bg-[#faf9f6] py-2"
      >
        <ToolButton
          active={tool === 'parse'}
          icon={<ParseIcon />}
          label="解析"
          onClick={() => setTool('parse')}
        />

        <div className="flex flex-col items-center gap-2">
          <button
            type="button"
            aria-label="清空并重新解析"
            title="清空并重新解析"
            onClick={resetAndParse}
            className="flex h-8 w-8 items-center justify-center text-[#aaa9a3] transition-colors hover:text-[#5f5e59]"
          >
            <RefreshIcon />
          </button>

          <ToolButton
            active={tool === 'settings'}
            icon={<SettingsIcon />}
            label="设置"
            onClick={() => setTool('settings')}
          />
        </div>
      </nav>
    </div>
  );
}
