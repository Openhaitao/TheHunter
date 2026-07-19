import { useState } from 'react';

type Tool = 'parse' | 'settings';

function SettingsIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-5 w-5"
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
      className={`flex h-11 w-11 items-center justify-center rounded-xl border transition-colors ${
        active
          ? 'border-[#d3d2cc] bg-white text-[#171717] shadow-[0_3px_12px_rgba(0,0,0,0.06)]'
          : 'border-transparent text-[#8d8c86] hover:border-[#e2e1dc] hover:bg-white hover:text-[#171717]'
      }`}
    >
      {icon}
    </button>
  );
}

export default function App() {
  const [tool, setTool] = useState<Tool>('parse');

  return (
    <div className="flex h-full bg-[#f6f5f1] text-[#171717]">
      <main className="min-w-0 flex-1" aria-label={tool === 'parse' ? '解析' : '设置'} />

      <nav
        aria-label="工具"
        className="flex w-16 shrink-0 flex-col items-center justify-between border-l border-[#deddd8] bg-[#faf9f6] px-2 py-3"
      >
        <ToolButton
          active={tool === 'parse'}
          icon={<span aria-hidden="true" className="text-lg leading-none">✨</span>}
          label="解析"
          onClick={() => setTool('parse')}
        />

        <ToolButton
          active={tool === 'settings'}
          icon={<SettingsIcon />}
          label="设置"
          onClick={() => setTool('settings')}
        />
      </nav>
    </div>
  );
}
