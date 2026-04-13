const { contextBridge, ipcRenderer } = require('electron');

const IPC = {
  getVersion: 'app:getVersion',
  openExternal: 'shell:openExternal',
  getWindowState: 'window:getState',
  setWidgetMode: 'window:setWidgetMode',
  setIgnoreMouse: 'window:setIgnoreMouse',
  setAutoLaunch: 'app:setAutoLaunch',
  readJson: 'fs:readJson',
  writeJson: 'fs:writeJson',
  clickThroughChanged: 'window:click-through-changed',
  closeWindow: 'window:close',
  setSize: 'window:setSize',
  toggleMaximize: 'window:toggleMaximize',
};

contextBridge.exposeInMainWorld('electronAPI', {
  getAppVersion: () => ipcRenderer.invoke(IPC.getVersion),
  openExternal: (url) => ipcRenderer.invoke(IPC.openExternal, url),
  getWindowState: () => ipcRenderer.invoke(IPC.getWindowState),
  setWidgetMode: (enabled) => ipcRenderer.invoke(IPC.setWidgetMode, enabled),
  setIgnoreMouseEvents: (ignore, forward) =>
    ipcRenderer.invoke(IPC.setIgnoreMouse, { ignore: !!ignore, forward: forward !== false }),
  setAutoLaunch: (enabled) => ipcRenderer.invoke(IPC.setAutoLaunch, !!enabled),
  readDataJson: (name) => ipcRenderer.invoke(IPC.readJson, name),
  writeDataJson: (name, data) => ipcRenderer.invoke(IPC.writeJson, name, data),
  onClickThroughChange: (fn) => {
    const handler = (_e, value) => {
      if (typeof fn === 'function') fn(value);
    };
    ipcRenderer.on(IPC.clickThroughChanged, handler);
    return () => ipcRenderer.removeListener(IPC.clickThroughChanged, handler);
  },
  closeWindow: () => ipcRenderer.invoke(IPC.closeWindow),
  setWindowSize: (width, height) => ipcRenderer.invoke(IPC.setSize, { width, height }),
  toggleMaximize: () => ipcRenderer.invoke(IPC.toggleMaximize),
});
