const { app, BrowserWindow, ipcMain, Notification, dialog } = require('electron');
const path = require('path');

let mainWindow;

function enableAutoStart() {
  if (!app.isPackaged) return;
  try {
    app.setLoginItemSettings({
      openAtLogin: true,
      openAsHidden: false
    });
  } catch {}
}

function createHiddenPrintWindow(html) {
  const printWindow = new BrowserWindow({
    show: false,
    webPreferences: {
      sandbox: true,
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  const dataUrl = 'data:text/html;charset=utf-8,' + encodeURIComponent(html);
  printWindow.loadURL(dataUrl);
  return printWindow;
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1320,
    height: 840,
    minWidth: 1000,
    minHeight: 640,
    frame: false,
    backgroundColor: '#0B1120',
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });

  mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // window state sync
  mainWindow.on('maximize', () => {
    mainWindow.webContents.send('window-state', 'maximized');
  });

  mainWindow.on('unmaximize', () => {
    mainWindow.webContents.send('window-state', 'normal');
  });

  // safety: prevent app ghost process issues
  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  enableAutoStart();
  createWindow();
});

// lifecycle
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

// ─── IPC (SAFE VERSION) ─────────────────────────

ipcMain.on('win-minimize', () => {
  if (!mainWindow) return;
  mainWindow.minimize();
});

ipcMain.on('win-maximize', () => {
  if (!mainWindow) return;

  if (mainWindow.isMaximized()) {
    mainWindow.unmaximize();
  } else {
    mainWindow.maximize();
  }
});

ipcMain.on('win-close', () => {
  if (!mainWindow) return;

  app.isQuiting = true;
  mainWindow.close();
});

ipcMain.on('show-notification', (_, payload) => {
  if (!payload || !payload.title) return;
  try {
    new Notification({ title: payload.title, body: payload.body || '' }).show();
  } catch {}
});

ipcMain.handle('save-report-pdf', async (_, { html, fileName }) => {
  if (!mainWindow) return { ok: false };
  const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, {
    title: 'Save Report PDF',
    defaultPath: fileName || 'report.pdf',
    filters: [{ name: 'PDF', extensions: ['pdf'] }]
  });
  if (canceled || !filePath) return { ok: false };

  const printWindow = createHiddenPrintWindow(html);
  await new Promise(resolve => {
    printWindow.webContents.on('did-finish-load', resolve);
  });

  const pdfData = await printWindow.webContents.printToPDF({
    marginsType: 1,
    printBackground: true
  });

  const fs = require('fs');
  fs.writeFileSync(filePath, pdfData);
  printWindow.close();
  return { ok: true, filePath };
});
