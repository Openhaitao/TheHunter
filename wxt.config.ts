import { defineConfig } from 'wxt';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  // 输出到可见的 dist/（默认 .output 在 macOS 文件选择框里被隐藏）
  outDir: 'dist',
  modules: ['@wxt-dev/module-react'],
  vite: () => ({
    plugins: [tailwindcss()],
  }),
  manifest: {
    name: 'TheHunter',
    description: 'AI 网页信息猎手：把任何网页按你的模板结构化，发送到你的表格',
    // M3 上架前收敛 host_permissions（改为用户配置端点的 optional 权限）
    permissions: ['storage', 'activeTab', 'sidePanel', 'scripting'],
    host_permissions: ['<all_urls>'],
    action: { default_title: 'TheHunter - 打开侧边栏' },
    icons: {
      16: 'icon-16.png',
      32: 'icon-32.png',
      48: 'icon-48.png',
      128: 'icon-128.png',
    },
  },
});
