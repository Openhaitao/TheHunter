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
    description: 'LinkedIn 人才信息采集工具',
    permissions: ['sidePanel'],
    action: { default_title: 'TheHunter - 打开侧边栏' },
    icons: {
      16: 'icon-16.png',
      32: 'icon-32.png',
      48: 'icon-48.png',
      128: 'icon-128.png',
    },
  },
});
