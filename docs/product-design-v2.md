# TheHunter 产品设计方案 v2 —— 面向公开发布

> 2026-07-11 · 定位升级：不做临时工具，发布到 Chrome Web Store 供所有人使用。
> 取代 v1（docs/product-design-v1.md）。v1 的 Recipe 概念保留，更名为「模板 Template」。

## 1. 产品定位

**AI 网页信息猎手**：浏览任何网页时，在侧边栏一键把页面信息按你的模板结构化，
发送到你自己的表格（飞书多维表格 webhook 起步）。

- 面向所有人，不绑定任何公司/个人的表结构
- 一切可自定义：字段、提示词、目标表格（可多个）、实体类型
- 用户数据不经过我们的服务器（v1 完全无后端）

## 2. 核心对象：模板（Template）

```
Template
├─ id / name / icon
├─ 实体类型 entity: person | product | company | article | custom
├─ URL 匹配 matchers: ["linkedin.com/in/*", "producthunt.com/posts/*", "*"]
├─ 字段 fields[]: { key, label, type(text|url|number|date|select), aiHint, options? }
├─ 提示词 prompt: 可自定义（内置默认模板，支持 {{fields}} / {{page}} 变量）
└─ 输出 targets[]: [{ name, webhookUrl }]  // 一个模板可同时发多张表
```

内置预设模板（可复制修改）：
- **人（LinkedIn 个人页）**：姓名/职位/公司/教育背景/个人经历/位置/LinkedIn链接
- **产品**：产品名/官网URL/页面链接/一句话介绍/AI总结/定价/分类
- **公司**：公司名/官网/简介/赛道/融资信息
- **通用文章**：标题/来源/链接/AI摘要/关键词

## 3. 界面：Chrome Side Panel（侧边栏，非弹窗）

三个 Tab：

1. **捕获 Capture**
   - 自动匹配当前页面适用的模板（多个则可切换）
   - 一键提取：抓正文 → AI 按模板字段结构化 → 逐字段可编辑的卡片
   - 保存：POST JSON 到模板绑定的 webhook（可多目标勾选）
   - 页面 URL、标题等元数据自动附带
2. **管理 Manage**
   - v1：内嵌用户的飞书多维表格共享视图（iframe）——飞书本身就是 CRM 界面
   - v2：API 自绘（当前页的人是否已在库中、快捷检索等）
3. **设置 Settings**
   - AI 提供商 + API Key（BYOK：硅基流动 / OpenAI / Anthropic / 任意 OpenAI 兼容端点）
   - 模板管理：列表 / 新建 / 编辑（字段编辑器 + 提示词编辑器）/ 导入导出 JSON
   - 所有配置存 chrome.storage.sync（跟随 Google 账号跨设备同步）

## 4. 架构

### v1（当前目标）：零后端，直接可上架
```
页面 ──content script 抓取──▶ 侧边栏 ──BYOK LLM──▶ 结构化 JSON
                                    │（用户编辑确认）
                                    ▼
                          用户自己的飞书 webhook（可多个）
```
- 查重/字段映射在飞书 Base 自动化里做（收到 webhook → 查找记录 → 更新或新增）
- 无服务器、无账号体系、无隐私合规负担

### v2（增长与商业化）：Cloudflare + Supabase
- **Supabase**：账号体系、模板云同步、**模板市场**（分享/安装他人模板 = 增长飞轮）
- **Cloudflare Workers**：托管 AI 代理（免配 Key 的小白路径：免费额度 + 订阅付费）
- 目标适配器扩展：Notion / Airtable / Google Sheets

## 5. 技术栈

| 层 | 选择 |
|---|---|
| 扩展框架 | **WXT**（MV3，sidePanel/多浏览器开箱即用，Chrome+Edge+Firefox） |
| UI | React 18 + TypeScript + Tailwind CSS（组件参考 shadcn/ui） |
| 状态 | zustand + chrome.storage.sync |
| AI 调用 | OpenAI 兼容 chat.completions（BYOK），JSON 输出约束 |
| 后端(v2) | Cloudflare Workers + Supabase |

旧的 Vite + CRXJS 实现保留在 `legacy-crxjs` 分支。

## 6. 上架清单

- [ ] 权限最小化：`storage`、`activeTab`、`sidePanel`（host_permissions 仅 AI 端点由用户配置时动态申请或用 optional_host_permissions）
- [ ] 隐私政策页（GitHub Pages）：数据仅在本地与用户自己的 webhook 之间流动
- [ ] 商店素材：128 图标（已有）、截图、宣传图（需要 ≥512px 源图 logo）
- [ ] 英文 + 中文商店文案

## 7. 里程碑

- **M1 骨架（本次）**：WXT 工程 + 侧边栏三 Tab + 模板引擎 + BYOK AI + webhook 发送，通用页面全流程跑通
- **M2 预设打磨**：LinkedIn 个人页专用抓取（参考 twenty-crm-extension 选择器）、产品/公司/文章预设、模板导入导出
- **M3 上架**：权限收敛、隐私政策、商店素材、提审
- **M4 云能力**：Supabase 账号 + 模板市场、CF Workers 托管 AI、更多目标适配器
