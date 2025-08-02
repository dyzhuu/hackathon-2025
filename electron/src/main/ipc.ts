import { BrowserWindow, ipcMain } from 'electron';
import { EventManager } from './handlers/EventManager';

type IPCContext = {
  setMainWindow: (window: BrowserWindow) => void;
};

export const setupIpcs = (
  createWindow: (route?: string) => BrowserWindow,
  eventManager: EventManager
): IPCContext => {
  let mainWindow: BrowserWindow | undefined;

  // IPC test
  ipcMain.on('ping', () => console.log('pong'));

  // Set up IPC handlers for event tracking
  ipcMain.handle('start-tracking', async () => {
    try {
      await eventManager.start();
      return { success: true };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  });

  ipcMain.handle('stop-tracking', () => {
    eventManager.stop();
    return { success: true };
  });

  ipcMain.handle('get-tracking-stats', () => {
    return eventManager.getStats();
  });

  ipcMain.on('some-channel', (event, data) => {
    const note = createWindow('notes');
    const sticky = createWindow('sticky');
    sticky.show();
    // note.setPosition(sticky.getPosition())
    console.log(data);
  });

  ipcMain.handle('platform', () => process.platform);

  // Screenshot capture is now handled by the ScreenshotHandler via EventManager
  // The old IPC handler has been removed - screenshots are captured automatically during event publishing
  return {
    setMainWindow: (window) => (mainWindow = window)
  };
};
