import { useEffect, useState } from 'react';
import { FEISHU_WEBHOOK_KEY, getLocalValue, setLocalValue } from '../lib/config';

type SaveState = 'idle' | 'saving' | 'saved' | 'error';

export default function SettingsPage() {
  const [webhookUrl, setWebhookUrl] = useState('');
  const [saveState, setSaveState] = useState<SaveState>('idle');

  useEffect(() => {
    void getLocalValue<string>(FEISHU_WEBHOOK_KEY).then((value) => {
      if (typeof value === 'string') setWebhookUrl(value);
    });
  }, []);

  const saveWebhook = async () => {
    setSaveState('saving');

    try {
      const url = new URL(webhookUrl.trim());
      if (url.protocol !== 'https:') throw new Error('Webhook must use HTTPS');

      const granted = await browser.permissions.request({
        origins: [`${url.origin}/*`],
      });
      if (!granted) throw new Error('Host permission denied');

      await setLocalValue(FEISHU_WEBHOOK_KEY, url.toString());
      setWebhookUrl(url.toString());
      setSaveState('saved');
    } catch {
      setSaveState('error');
    }
  };

  return (
    <div className="h-full overflow-y-auto px-4 py-4">
      <div className="mx-auto max-w-[460px]">
        <label className="block">
          <span className="mb-1.5 block text-[11px] font-medium text-[#65645f]">飞书 Webhook</span>
          <input
            type="url"
            value={webhookUrl}
            placeholder="https://..."
            onChange={(event) => {
              setWebhookUrl(event.target.value);
              setSaveState('idle');
            }}
            className="h-9 w-full rounded-[9px] border border-[#d9d8d2] bg-[#fbfaf7] px-3 text-[13px] text-[#22221f] placeholder:text-[#b1b0aa] transition-colors hover:border-[#c8c7c1] focus:border-[#96958f] focus:outline-none"
          />
        </label>

        <div className="mt-2 flex items-start justify-between gap-4">
          <p className="m-0 text-[10px] leading-4 text-[#9a9993]">仅保存在本机，不同步、不写入日志。</p>
          <button
            type="button"
            onClick={() => void saveWebhook()}
            disabled={!webhookUrl.trim() || saveState === 'saving'}
            className="shrink-0 text-[11px] text-[#65645f] underline decoration-[#c7c6c0] underline-offset-4 hover:text-[#242421] disabled:cursor-default disabled:opacity-40"
          >
            {saveState === 'saving'
              ? '保存中…'
              : saveState === 'saved'
                ? '已保存'
                : saveState === 'error'
                  ? '保存失败'
                  : '保存'}
          </button>
        </div>
      </div>
    </div>
  );
}
