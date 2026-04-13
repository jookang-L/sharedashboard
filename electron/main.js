/**
 * Electron 메인 프로세스
 * - Google OAuth: 렌더러 팝업이 막히는 경우 shell.openExternal(외부 브라우저) 또는
 *   커스텀 protocol(registerHttpProtocol + 딥링크)으로 토큰을 앱으로 되돌리는 방식을 권장.
 *   (이 저장소는 fetch 기반 시트 연동이므로 별도 OAuth 플로우는 앱 연동 시 추가)
 */
const electron = require('electron');
const { app, BrowserWindow, ipcMain, shell, Menu, globalShortcut } = electron;

/* 개발 모드: HTML/CSS/JS 저장 시 자동 새로고침 (main·preload 수정 시에는 앱 재시작 필요) */
if (!app.isPackaged) {
  try {
    require('electron-reloader')(module, { watchRenderer: true });
  } catch {
    /* electron-reloader 미설치 시 무시 */
  }
}
const path = require('path');
const fs = require('fs');
const fsp = require('fs').promises;

const STATE_FILE = 'window-state.json';
const DATA_DIR = 'dashboard-data';

let mainWindow = null;

function statePath() {
  return path.join(app.getPath('userData'), STATE_FILE);
}

function dataDir() {
  return path.join(app.getPath('userData'), DATA_DIR);
}

function readStateSync() {
  try {
    const raw = fs.readFileSync(statePath(), 'utf8');
    return JSON.parse(raw);
  } catch {
    return {
      widgetMode: false,
      clickThrough: false,
      autoLaunch: false,
      bounds: null,
    };
  }
}

function writeStateSync(partial) {
  const cur = readStateSync();
  const next = { ...cur, ...partial };
  fs.mkdirSync(path.dirname(statePath()), { recursive: true });
  fs.writeFileSync(statePath(), JSON.stringify(next, null, 2), 'utf8');
}

/** 창·작업 표시줄 아이콘 (빌드 아이콘은 package.json build.icon) */
function getWindowIconPath() {
  const p = path.join(__dirname, '..', 'public', 'icon.png');
  try {
    if (fs.existsSync(p)) return p;
  } catch { /* ignore */ }
  return undefined;
}

function createWindow(opts = {}) {
  const state = readStateSync();
  const widget = opts.widgetMode !== undefined ? opts.widgetMode : !!state.widgetMode;
  const b = state.bounds || {};
  const width = Number(b.width) > 200 ? Number(b.width) : 1280;
  const height = Number(b.height) > 200 ? Number(b.height) : 720;
  const x = typeof b.x === 'number' ? b.x : undefined;
  const y = typeof b.y === 'number' ? b.y : undefined;

  const iconPath = getWindowIconPath();

  const win = new BrowserWindow({
    ...(x !== undefined && y !== undefined ? { x, y } : {}),
    ...(iconPath ? { icon: iconPath } : {}),
    width,
    height,
    minWidth: 400,
    minHeight: 300,
    frame: !widget,
    transparent: widget,
    backgroundColor: widget ? '#00000000' : '#ffffff',
    hasShadow: !widget,
    alwaysOnTop: widget,
    /* 위젯이어도 작업 표시줄에 표시 — 안 보이면 Alt+Tab / 종료가 어려움 */
    skipTaskbar: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
    show: false,
  });

  const htmlPath = path.join(__dirname, '..', 'index.html');
  /* 터미널에서 온보딩만 검증할 때: npm run start:onboarding */
  const openOnboarding = process.argv.includes('--open-onboarding');
  win.loadFile(htmlPath, openOnboarding ? { hash: 'onboarding' } : {});

  win.once('ready-to-show', () => {
    win.show();
    if (widget && state.clickThrough) {
      win.setIgnoreMouseEvents(true, { forward: true });
    }
  });

  let saveBoundsTimer;
  const scheduleSaveBounds = () => {
    clearTimeout(saveBoundsTimer);
    saveBoundsTimer = setTimeout(() => {
      if (!mainWindow || mainWindow.isDestroyed()) return;
      const r = mainWindow.getBounds();
      writeStateSync({
        bounds: { x: r.x, y: r.y, width: r.width, height: r.height },
      });
    }, 400);
  };

  win.on('moved', scheduleSaveBounds);
  win.on('resized', scheduleSaveBounds);

  mainWindow = win;
  return win;
}

function recreateWithWidgetMode(enabled) {
  const w = !!enabled;
  writeStateSync({ widgetMode: w });
  if (mainWindow && !mainWindow.isDestroyed()) {
    const r = mainWindow.getBounds();
    writeStateSync({
      bounds: { x: r.x, y: r.y, width: r.width, height: r.height },
    });
    mainWindow.destroy();
    mainWindow = null;
  }
  createWindow({ widgetMode: w });
  buildMenu();
}

function applyAutoLaunchFromState() {
  const { autoLaunch } = readStateSync();
  try {
    app.setLoginItemSettings({
      openAtLogin: !!autoLaunch,
      openAsHidden: false,
    });
  } catch {
    /* ignore */
  }
}

function registerShortcuts() {
  const quitOk = globalShortcut.register('CommandOrControl+Q', () => {
    app.quit();
  });
  if (!quitOk) {
    console.warn('Global shortcut CommandOrControl+Q could not be registered');
  }

  const ret = globalShortcut.register('CommandOrControl+Shift+M', () => {
    if (!mainWindow || mainWindow.isDestroyed()) return;
    const st = readStateSync();
    if (!st.widgetMode) return;
    const next = !st.clickThrough;
    writeStateSync({ clickThrough: next });
    mainWindow.setIgnoreMouseEvents(next, { forward: next });
    mainWindow.webContents.send('window:click-through-changed', next);
  });
  if (!ret) {
    console.warn('Global shortcut CommandOrControl+Shift+M could not be registered');
  }

  /* 메뉴 막대 제거 후 대체 */
  if (!globalShortcut.register('CommandOrControl+R', () => {
    if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.reload();
  })) {
    console.warn('Global shortcut CommandOrControl+R could not be registered');
  }
  if (!globalShortcut.register('CommandOrControl+Shift+I', () => {
    if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.toggleDevTools();
  })) {
    console.warn('Global shortcut CommandOrControl+Shift+I could not be registered');
  }
}

/** 상단 파일·보기 메뉴 숨김 (앱 내 Jook Board 타이틀바 사용) */
function buildMenu() {
  Menu.setApplicationMenu(null);
}

ipcMain.handle('shell:openExternal', async (_e, url) => {
  const s = String(url || '').trim();
  if (!/^https?:\/\//i.test(s)) return { ok: false, error: 'invalid url' };
  await shell.openExternal(s);
  return { ok: true };
});

ipcMain.handle('window:getState', async () => {
  const s = readStateSync();
  return {
    widgetMode: !!s.widgetMode,
    clickThrough: !!s.clickThrough,
    autoLaunch: !!s.autoLaunch,
  };
});

ipcMain.handle('window:setWidgetMode', async (_e, enabled) => {
  recreateWithWidgetMode(!!enabled);
  return { ok: true };
});

ipcMain.handle('window:close', async () => {
  if (mainWindow && !mainWindow.isDestroyed()) mainWindow.close();
  return { ok: true };
});

ipcMain.handle('window:setSize', async (_e, { width, height }) => {
  if (!mainWindow || mainWindow.isDestroyed()) return { ok: false };
  const w = Math.max(400, Math.min(7680, Math.floor(Number(width)) || 1280));
  const h = Math.max(300, Math.min(4320, Math.floor(Number(height)) || 720));
  if (mainWindow.isMaximized()) mainWindow.unmaximize();
  mainWindow.setSize(w, h, true);
  const b = mainWindow.getBounds();
  writeStateSync({
    bounds: { x: b.x, y: b.y, width: b.width, height: b.height },
  });
  return { ok: true };
});

ipcMain.handle('window:toggleMaximize', async () => {
  if (!mainWindow || mainWindow.isDestroyed()) return { ok: false };
  if (mainWindow.isMaximized()) mainWindow.unmaximize();
  else mainWindow.maximize();
  return { ok: true, maximized: mainWindow.isMaximized() };
});

ipcMain.handle('window:setIgnoreMouse', async (_e, { ignore, forward }) => {
  if (!mainWindow || mainWindow.isDestroyed()) return { ok: false };
  const st = readStateSync();
  if (!st.widgetMode && ignore) return { ok: false, reason: 'widget-only' };
  writeStateSync({ clickThrough: !!ignore });
  mainWindow.setIgnoreMouseEvents(!!ignore, { forward: forward !== false });
  return { ok: true };
});

ipcMain.handle('app:setAutoLaunch', async (_e, enabled) => {
  writeStateSync({ autoLaunch: !!enabled });
  applyAutoLaunchFromState();
  return { ok: true };
});

ipcMain.handle('fs:readJson', async (_e, name) => {
  const safe = String(name || '').replace(/[^a-zA-Z0-9._-]/g, '') || 'data';
  const p = path.join(dataDir(), `${safe}.json`);
  try {
    const raw = await fsp.readFile(p, 'utf8');
    return { ok: true, data: JSON.parse(raw) };
  } catch (e) {
    if (e.code === 'ENOENT') return { ok: true, data: null };
    return { ok: false, error: String(e.message) };
  }
});

ipcMain.handle('fs:writeJson', async (_e, name, data) => {
  const safe = String(name || '').replace(/[^a-zA-Z0-9._-]/g, '') || 'data';
  await fsp.mkdir(dataDir(), { recursive: true });
  const p = path.join(dataDir(), `${safe}.json`);
  await fsp.writeFile(p, JSON.stringify(data, null, 2), 'utf8');
  return { ok: true };
});

app.whenReady().then(() => {
  applyAutoLaunchFromState();
  createWindow();
  buildMenu();
  registerShortcuts();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});
