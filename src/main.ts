import { app, BrowserWindow, ipcMain, protocol, net } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import { pathToFileURL } from 'url';

protocol.registerSchemesAsPrivileged([
  { scheme: 'local-media', privileges: { secure: true, supportFetchAPI: true, bypassCSP: true, stream: true } }
]);

const userDataPath = app.getPath('userData');
const playlistFilePath = path.join(userDataPath, 'playlist.json');

function createWindow() {
  const win = new BrowserWindow({
    width: 420,
    height: 550,
    minWidth: 380,
    minHeight: 500,
    resizable: true,
    frame: false,
    transparent: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  if (!app.isPackaged) {
    win.loadURL('http://localhost:5173');
  } else {
    win.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  ipcMain.on('window-minimize', () => { win.minimize(); });
  ipcMain.on('window-close', () => { win.close(); });
}

app.whenReady().then(() => {
  protocol.handle('local-media', (request) => {
    let filePath = request.url.slice('local-media://'.length);
    filePath = decodeURIComponent(filePath);
    
    if (process.platform === 'win32' && filePath.startsWith('/')) {
      filePath = filePath.substring(1);
    }
    
    return net.fetch(pathToFileURL(filePath).toString());
  });

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

ipcMain.on('save-playlist', (event, playlist) => {
  try {
    fs.writeFileSync(playlistFilePath, JSON.stringify(playlist));
  } catch (error) {
    console.error("Erro ao guardar playlist:", error);
  }
});

ipcMain.handle('load-playlist', () => {
  try {
    if (fs.existsSync(playlistFilePath)) {
      const data = fs.readFileSync(playlistFilePath, 'utf-8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error("Erro ao ler playlist:", error);
  }
  return [];
});