export type EntityType = 'person' | 'product' | 'company' | 'article' | 'custom';

export type FieldType = 'text' | 'url' | 'number' | 'date' | 'select';

export interface FieldDef {
  /** JSON key，也是发送到 webhook 的字段名 */
  key: string;
  /** 界面显示名 */
  label: string;
  type: FieldType;
  /** 给 AI 的提取说明 */
  aiHint?: string;
  /** type=select 时的可选值 */
  options?: string[];
}

export interface Target {
  id: string;
  name: string;
  webhookUrl: string;
  /** 默认勾选发送 */
  enabled: boolean;
}

export interface Template {
  id: string;
  name: string;
  entity: EntityType;
  /** URL 通配规则，如 "linkedin.com/in/*"；"*" 表示兜底 */
  matchers: string[];
  fields: FieldDef[];
  /** 自定义提示词；空则用内置默认。支持 {{fields}} {{page}} 变量 */
  prompt?: string;
  targets: Target[];
}

export interface AISettings {
  /** OpenAI 兼容端点，如 https://api.siliconflow.cn/v1 */
  baseUrl: string;
  apiKey: string;
  model: string;
}

export interface Settings {
  ai: AISettings;
  /** 管理 Tab 内嵌的表格分享链接 */
  manageEmbedUrl: string;
}

export interface PageData {
  url: string;
  title: string;
  description: string;
  text: string;
}

export interface CaptureResult {
  templateId: string;
  values: Record<string, string>;
  page: PageData;
}
