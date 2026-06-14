import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  closeWindow: () => ipcRenderer.send('window-close'),
  minimizeWindow: () => ipcRenderer.send('window-minimize'),
  savePlaylist: (playlist: any) => ipcRenderer.send('save-playlist', playlist),
  loadPlaylist: () => ipcRenderer.invoke('load-playlist')
});