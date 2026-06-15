import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  closeWindow: () => ipcRenderer.send('window-close'),
  minimizeWindow: () => ipcRenderer.send('window-minimize'),
  savePlaylist: (playlist: any) => ipcRenderer.send('save-playlist', playlist),
  loadPlaylist: () => ipcRenderer.invoke('load-playlist'),
  
  onMediaPlayPause: (callback: () => void) => ipcRenderer.on('media-play-pause', callback),
  onMediaNext: (callback: () => void) => ipcRenderer.on('media-next', callback),
  onMediaPrev: (callback: () => void) => ipcRenderer.on('media-prev', callback)
});