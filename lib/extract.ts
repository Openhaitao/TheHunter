import type { PageData } from './types';

const MAX_TEXT = 16000;

/** 在当前活动标签页里就地执行提取（不需要常驻 content script） */
export async function extractActiveTab(): Promise<PageData> {
  const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id || !tab.url || !/^https?:/.test(tab.url)) {
    throw new Error('请先切换到一个普通网页标签页');
  }
  const [result] = await browser.scripting.executeScript({
    target: { tabId: tab.id },
    func: () => {
      const meta = (name: string) =>
        (
          document.querySelector(`meta[name="${name}"]`) ??
          document.querySelector(`meta[property="${name}"]`)
        )?.getAttribute('content') ?? '';
      const main = document.querySelector('main, article, [role="main"]') as HTMLElement | null;
      const text = (main ?? document.body)?.innerText ?? '';
      return {
        url: location.href,
        title: document.title,
        description: meta('description') || meta('og:description'),
        text,
      };
    },
  });
  const page = result.result as PageData;
  return { ...page, text: page.text.slice(0, MAX_TEXT) };
}

export function pageToPromptBlock(page: PageData): string {
  return [
    `URL: ${page.url}`,
    `标题: ${page.title}`,
    page.description ? `描述: ${page.description}` : '',
    '',
    '正文:',
    page.text,
  ]
    .filter(Boolean)
    .join('\n');
}
