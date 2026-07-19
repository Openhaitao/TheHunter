# TheHunter

LinkedIn 人才信息采集浏览器扩展。

当前代码已重置为干净的 WXT 侧边栏壳，产品将从 LinkedIn 单一场景重新构建。

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

WXT (MV3) · React 18 + TypeScript · Tailwind CSS v4
