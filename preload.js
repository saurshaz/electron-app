// preload.js (expose APIs to renderer)
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  authorize: () => ipcRenderer.send('authorize'),
  getOrders: () => ipcRenderer.invoke('get-orders')
});