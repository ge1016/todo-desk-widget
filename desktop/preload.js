const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('todoShell', {
  minimize: function () { ipcRenderer.send('shell:minimize'); },
  close: function () { ipcRenderer.send('shell:close'); },
  togglePin: function () { ipcRenderer.send('shell:toggle-pin'); },
  openInBrowser: function () { ipcRenderer.send('shell:open-browser'); }
});
