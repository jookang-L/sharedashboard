/* =================================================================
   Electron 렌더러 브릿지 (preload electronAPI 사용)
   ================================================================= */

(function initElectronBridge() {
  const api = typeof window !== 'undefined' ? window.electronAPI : null;
  if (!api) return;

  const origOpen = window.open;
  window.open = function (url, target, features) {
    if (typeof url === 'string' && /^https?:\/\//i.test(url)) {
      api.openExternal(url);
      return null;
    }
    return origOpen.apply(this, arguments);
  };

  function syncTitlebarWidgetUI(widgetOn) {
    const btn = document.getElementById('titlebar-widget-btn');
    if (btn) {
      btn.classList.toggle('is-active', !!widgetOn);
      btn.setAttribute('aria-pressed', widgetOn ? 'true' : 'false');
    }
  }

  async function syncElectronPanel() {
    const wrap = document.getElementById('electron-desktop-settings');
    if (wrap) wrap.hidden = false;
    try {
      const st = await api.getWindowState();
      const w = document.getElementById('electron-widget-mode');
      const c = document.getElementById('electron-click-through');
      const a = document.getElementById('electron-auto-launch');
      if (w) w.checked = !!st.widgetMode;
      if (c) c.checked = !!st.clickThrough;
      if (a) a.checked = !!st.autoLaunch;
      document.body.classList.toggle('electron-widget-mode', !!st.widgetMode);
      syncTitlebarWidgetUI(st.widgetMode);
      const drag = document.getElementById('electron-drag-region');
      if (drag) {
        drag.hidden = true;
        drag.setAttribute('aria-hidden', 'true');
      }
    } catch {
      /* ignore */
    }
  }

  function bindControls() {
    const w = document.getElementById('electron-widget-mode');
    if (w) {
      w.addEventListener('change', () => {
        const on = !!w.checked;
        document.body.classList.toggle('electron-widget-mode', on);
        syncTitlebarWidgetUI(on);
        const drag = document.getElementById('electron-drag-region');
        if (drag) {
          drag.hidden = true;
          drag.setAttribute('aria-hidden', 'true');
        }
        api.setWidgetMode(on);
      });
    }
    const c = document.getElementById('electron-click-through');
    if (c) {
      c.addEventListener('change', () => {
        api.setIgnoreMouseEvents(!!c.checked, true);
      });
    }
    const a = document.getElementById('electron-auto-launch');
    if (a) {
      a.addEventListener('change', () => {
        api.setAutoLaunch(!!a.checked);
      });
    }
    if (typeof api.onClickThroughChange === 'function') {
      api.onClickThroughChange((v) => {
        if (c) c.checked = !!v;
      });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      bindControls();
      syncElectronPanel();
    });
  } else {
    bindControls();
    syncElectronPanel();
  }
})();
