import type { CaptureResult, Target } from './types';

export interface SendOutcome {
  target: Target;
  ok: boolean;
  status?: number;
  error?: string;
}

/** 发送到所有勾选的 webhook。payload = 字段 JSON + _meta 元数据 */
export async function sendToWebhooks(
  targets: Target[],
  capture: CaptureResult,
): Promise<SendOutcome[]> {
  const enabled = targets.filter((t) => t.enabled && t.webhookUrl);
  if (enabled.length === 0) throw new Error('该模板还没有配置启用中的 webhook 目标');

  const payload = {
    ...capture.values,
    _meta: {
      source_url: capture.page.url,
      page_title: capture.page.title,
      template_id: capture.templateId,
      captured_at: new Date().toISOString(),
    },
  };

  return Promise.all(
    enabled.map(async (target): Promise<SendOutcome> => {
      try {
        const resp = await fetch(target.webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        return { target, ok: resp.ok, status: resp.status };
      } catch (e) {
        return { target, ok: false, error: e instanceof Error ? e.message : String(e) };
      }
    }),
  );
}

export function matchTemplates<T extends { matchers: string[] }>(templates: T[], url: string): T[] {
  const specific = templates.filter((t) =>
    t.matchers.some((m) => m !== '*' && globMatch(m, url)),
  );
  if (specific.length > 0) return specific;
  return templates.filter((t) => t.matchers.includes('*'));
}

function globMatch(pattern: string, url: string): boolean {
  const normalized = url.replace(/^https?:\/\/(www\.)?/, '');
  const re = new RegExp(
    '^' + pattern.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*'),
    'i',
  );
  return re.test(normalized) || re.test(url);
}
