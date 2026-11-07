const { contextBridge, ipcRenderer } = require('electron');

// Expose safe IPC bridge to renderer (overlay)
contextBridge.exposeInMainWorld('bridge', {
  whipCrack: () => ipcRenderer.send('whip-crack'),
  hideOverlay: () => ipcRenderer.send('hide-overlay'),
  onSpawnWhip: (fn) => ipcRenderer.on('spawn-whip', () => fn()),
  onDropWhip: (fn) => ipcRenderer.on('drop-whip', () => fn()),
  onConfigChanged: (fn) => ipcRenderer.on('config-changed', (_, cfg) => fn(cfg)),
});
