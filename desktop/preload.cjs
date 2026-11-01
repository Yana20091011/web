const { contextBridge, ipcRenderer } = require('electron');

function subscribe(channel, callback) {
  const listener = (_event, value) => callback(value);
  ipcRenderer.on(channel, listener);
  return () => ipcRenderer.removeListener(channel, listener);
}

contextBridge.exposeInMainWorld('keycritter', {
  getState: () => ipcRenderer.invoke('pet:state'),
  updatePet: (pet) => ipcRenderer.invoke('pet:update', pet),
  setEnabled: (enabled) => ipcRenderer.invoke('pet:enabled', enabled),
  showPet: () => ipcRenderer.invoke('pet:show'),
  openDesigner: () => ipcRenderer.invoke('pet:designer'),
  preview: (reaction) => ipcRenderer.invoke('pet:preview', reaction),
  setInteractive: (interactive) => ipcRenderer.send('pet:interactive', interactive),
  quit: () => ipcRenderer.invoke('pet:quit'),
  onState: (callback) => subscribe('pet:changed', callback),
  onReaction: (callback) => subscribe('pet:reaction', callback),
});
