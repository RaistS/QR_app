const { app, BrowserWindow, session, dialog } = require('electron');
const path = require('path');
const fs = require('fs');

function resolveIndexHtml() {
  const candidates = [];
  // When packaged with extraResources
  candidates.push(path.join(process.resourcesPath, 'qrac', 'dist', 'index.html'));
  // When packaged and assets are inside app.asar
  try { candidates.push(path.join(app.getAppPath(), 'qrac', 'dist', 'index.html')); } catch (_) {}
  // Dev path
  candidates.push(path.join(__dirname, '..', 'qrac', 'dist', 'index.html'));

  for (const p of candidates) {
    try {
      if (fs.existsSync(p)) return p;
    } catch (_) {}
  }
  return null;
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    show: true,
    autoHideMenuBar: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });

  // Allow camera (getUserMedia)
  session.defaultSession.setPermissionRequestHandler((_wc, permission, cb) => {
    if (permission === 'media') return cb(true);
    cb(true);
  });

  const indexPath = resolveIndexHtml();
  if (!indexPath) {
    dialog.showErrorBox('QR Access Control', 'No se encontro index.html del frontend. Reinstala o revisa el paquete.');
    return;
  }
  win.loadFile(indexPath);
  if (process.env.QRC_DEBUG === '1') {
    win.webContents.openDevTools({ mode: 'detach' });
  }
}

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
