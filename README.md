# TheHunter

AI 网页信息猎手：浏览任何网页时，在侧边栏一键把页面信息按你的模板结构化，发送到你自己的表格（飞书多维表格 webhook 起步）。

- 📋 **自定义模板**：字段、AI 提取说明、提示词、URL 匹配规则全部可配置
- 🎯 **内置预设**：人才（LinkedIn）/ 产品 / 公司 / 文章
- 🤖 **BYOK**：自带 AI Key（硅基流动 / OpenAI / 任意 OpenAI 兼容端点）
- 📤 **多目标 webhook**：一次捕获可同时发多张表格；字段映射与查重在飞书自动化里完成
- 🔒 **零后端**：所有数据只在本地与你自己的 webhook 之间流动

设计文档：[docs/product-design-v2.md](docs/product-design-v2.md)（旧版实现见 `legacy-crxjs` 分支）

## 开发

```bash
npm install
npm run dev      # 开发模式（自动打开浏览器 + HMR）
npm run build    # 产物在 dist/chrome-mv3/
npm run compile  # 类型检查
```

## 加载到 Chrome

1. `npm run build`
2. 打开 chrome://extensions，开启「开发者模式」
3. 「加载已解压的扩展程序」→ 选择 `dist/chrome-mv3/`
4. 点击工具栏图标打开侧边栏

## 技术栈

WXT (MV3) · React 18 + TypeScript · Tailwind CSS v4 · chrome.storage.sync
