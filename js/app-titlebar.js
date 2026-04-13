/* =================================================================
   상단 타이틀바: 위젯 → 화면 크기 → 닫기 (Electron 연동)
   ================================================================= */

(function initAppTitlebar() {
  function bind() {
    const api = typeof window !== 'undefined' ? window.electronAPI : null;

    const widgetBtn = document.getElementById('titlebar-widget-btn');
    if (widgetBtn) {
      widgetBtn.disabled = !api;
      widgetBtn.addEventListener('click', async () => {
        if (!api) return;
        try {
          const st = await api.getWindowState();
          await api.setWidgetMode(!st.widgetMode);
        } catch { /* ignore */ }
      });
    }

    const closeBtn = document.getElementById('titlebar-close-btn');
    if (closeBtn) {
      closeBtn.addEventListener('click', async () => {
        if (api && typeof api.closeWindow === 'function') {
          await api.closeWindow();
          return;
        }
        try {
          window.close();
        } catch { /* ignore */ }
      });
    }

    const sizeSel = document.getElementById('titlebar-window-size');
    if (sizeSel) {
      sizeSel.disabled = !api;
      sizeSel.addEventListener('change', async () => {
        const v = sizeSel.value;
        sizeSel.value = '';
        if (!v || !api) return;
        try {
          if (v === 'max') {
            if (typeof api.toggleMaximize === 'function') await api.toggleMaximize();
          } else {
            const parts = v.split('x');
            const w = parseInt(parts[0], 10);
            const h = parseInt(parts[1], 10);
            if (w && h && typeof api.setWindowSize === 'function') await api.setWindowSize(w, h);
          }
        } catch { /* ignore */ }
      });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bind);
  } else {
    bind();
  }
})();
