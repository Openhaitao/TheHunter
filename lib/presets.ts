import type { Template } from './types';

export const PRESET_TEMPLATES: Template[] = [
  {
    id: 'preset-person-linkedin',
    name: '人才（LinkedIn 个人页）',
    entity: 'person',
    matchers: ['linkedin.com/in/*'],
    fields: [
      { key: '姓名', label: '姓名', type: 'text', aiHint: '此人的完整姓名' },
      { key: '职位', label: '职位', type: 'text', aiHint: '当前职位头衔' },
      { key: '公司名称', label: '公司', type: 'text', aiHint: '当前所在公司' },
      { key: '教育背景', label: '教育背景', type: 'text', aiHint: '学校与学历，多段用分号分隔' },
      { key: '个人经历', label: '个人经历', type: 'text', aiHint: '职业经历亮点总结，200 字以内' },
      { key: 'Base 位置', label: '所在地', type: 'text', aiHint: '所在城市/地区' },
      { key: 'linkedin 链接', label: 'LinkedIn 链接', type: 'url', aiHint: '当前页面 URL' },
    ],
    targets: [],
  },
  {
    id: 'preset-product',
    name: '产品',
    entity: 'product',
    matchers: ['producthunt.com/*', '*'],
    fields: [
      { key: '产品名', label: '产品名', type: 'text', aiHint: '产品名称' },
      { key: '官网', label: '官网', type: 'url', aiHint: '产品官网 URL；页面里找不到就用当前页面 URL' },
      { key: '页面链接', label: '页面链接', type: 'url', aiHint: '当前页面 URL' },
      { key: '一句话介绍', label: '一句话介绍', type: 'text', aiHint: '一句话说明这个产品是做什么的' },
      { key: 'AI总结', label: 'AI 总结', type: 'text', aiHint: '产品核心功能、目标用户与亮点，150 字以内' },
      { key: '定价', label: '定价', type: 'text', aiHint: '定价信息，找不到填"未知"' },
      { key: '分类', label: '分类', type: 'text', aiHint: '产品所属类别，如 AI工具/开发者工具/效率' },
    ],
    targets: [],
  },
  {
    id: 'preset-company',
    name: '公司',
    entity: 'company',
    matchers: ['linkedin.com/company/*', '*'],
    fields: [
      { key: '公司名', label: '公司名', type: 'text', aiHint: '公司名称' },
      { key: '官网', label: '官网', type: 'url', aiHint: '公司官网 URL' },
      { key: '一句话简介', label: '一句话简介', type: 'text', aiHint: '一句话介绍公司业务' },
      { key: '公司介绍', label: '公司介绍', type: 'text', aiHint: '公司详细介绍，200 字以内' },
      { key: '所属赛道', label: '赛道', type: 'text', aiHint: '所在行业/赛道' },
      { key: '融资信息', label: '融资信息', type: 'text', aiHint: '最新融资轮次与金额，找不到填"未知"' },
    ],
    targets: [],
  },
  {
    id: 'preset-article',
    name: '文章',
    entity: 'article',
    matchers: ['*'],
    fields: [
      { key: '标题', label: '标题', type: 'text', aiHint: '文章标题' },
      { key: '来源', label: '来源', type: 'text', aiHint: '网站/媒体名称' },
      { key: '链接', label: '链接', type: 'url', aiHint: '当前页面 URL' },
      { key: 'AI摘要', label: 'AI 摘要', type: 'text', aiHint: '文章核心内容摘要，150 字以内' },
      { key: '关键词', label: '关键词', type: 'text', aiHint: '3-5 个关键词，逗号分隔' },
    ],
    targets: [],
  },
];

export const DEFAULT_PROMPT = `你是一个网页信息提取助手。请从下面的网页内容中提取指定字段，输出严格的 JSON 对象（不要输出任何其他内容，不要用 markdown 代码块包裹）。

需要提取的字段：
{{fields}}

规则：
- 每个字段按其提取说明填写；页面中确实没有的信息填空字符串 ""
- "当前页面 URL" 类字段直接使用元数据中的 URL
- 输出 JSON 的 key 必须与字段名完全一致

网页元数据与内容：
{{page}}`;
