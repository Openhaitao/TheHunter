export default defineBackground(() => {
  // 点击工具栏图标 → 打开侧边栏
  browser.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(() => {});
});
