const { app, BrowserWindow, session } = require('electron');
const { autoUpdater } = require('electron-updater');
const path = require('path');

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 900,
    backgroundColor: '#0f172a', // Matches bg-slate-900
    titleBarStyle: 'hidden',
    titleBarOverlay: {
      color: '#020617', // Matches bg-slate-950
      symbolColor: '#94a3b8',
      height: 56 // Matches header height
    },
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false, // For simple migration. In production, use preload scripts.
      enableRemoteModule: true
    },
  });

  // Handle Web Serial permissions
  mainWindow.webContents.session.setPermissionCheckHandler((webContents, permission, requestingOrigin, details) => {
    if (permission === 'serial') {
      return true;
    }
    return false;
  });

  mainWindow.webContents.session.setDevicePermissionHandler((details) => {
    if (details.deviceType === 'serial') {
      return true;
    }
    return false;
  });

  // Handle Serial Port Selection (Automatically select the first available port)
  mainWindow.webContents.session.on('select-serial-port', (event, portList, webContents, callback) => {
    event.preventDefault();
    if (portList && portList.length > 0) {
      callback(portList[0].portId);
    } else {
      callback(''); // Could not find any port
    }
  });

  // LOAD LOGIC: Distinguish between Dev (localhost) and Prod (file system)
  if (app.isPackaged) {
    // Production: Load the built file from dist/index.html
    mainWindow.loadFile(path.join(__dirname, 'dist', 'index.html'));
  } else {
    // Development: Load from Vite dev server
    mainWindow.loadURL('http://localhost:3000');
    // Open DevTools automatically in dev mode for debugging
    mainWindow.webContents.openDevTools();
  }

  // Check for updates once the window is ready
  mainWindow.once('ready-to-show', () => {
    autoUpdater.checkForUpdatesAndNotify();
  });
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});