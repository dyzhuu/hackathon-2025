import { contextBridge, ipcRenderer } from 'electron';
import { electronAPI } from '@electron-toolkit/preload';

// Custom APIs for renderer
const api = {
  // Event tracking APIs
  startTracking: () => ipcRenderer.invoke('start-tracking'),
  stopTracking: () => ipcRenderer.invoke('stop-tracking'),
  getTrackingStats: () => ipcRenderer.invoke('get-tracking-stats'),
  captureScreenshot: () => ipcRenderer.invoke('capture-screenshot'),
  getMonitors: () => ipcRenderer.invoke('get-monitors'),
  getPlatform: (): Promise<string> => ipcRenderer.invoke('platform'),
  getEvents: (category?: string, limit?: number) =>
    ipcRenderer.invoke('get-events', category, limit),

  // Event listener
  onActivityEvent: (callback: (event: any) => void) => {
    ipcRenderer.on('activity-event', (_, event) => callback(event));
    // Return cleanup function
    return () => {
      ipcRenderer.removeAllListeners('activity-event');
    };
  }
};

export type Api = typeof api;

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI);
    contextBridge.exposeInMainWorld('api', api);
  } catch (error) {
    console.error(error);
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI;
  // @ts-ignore (define in dts)
  window.api = api;
}
