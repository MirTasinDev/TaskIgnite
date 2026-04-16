const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  minimizeWindow: () => ipcRenderer.send('win-minimize'),
  maximizeWindow: () => ipcRenderer.send('win-maximize'),
  closeWindow: () => ipcRenderer.send('win-close'),

  showNotification: ({ title, body }) => {
    ipcRenderer.send('show-notification', { title, body });
  },

  saveReportPdf: ({ html, fileName }) => {
    return ipcRenderer.invoke('save-report-pdf', { html, fileName });
  },

  onWindowMaximized: (callback) => {
    ipcRenderer.on('window-state', (_, state) => callback(state === 'maximized'));
  }
});
