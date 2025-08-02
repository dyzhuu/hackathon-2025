import { BrowserWindow, ipcMain, screen } from 'electron';
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
    clippy.show();
    // note.setPosition(clippy.getPosition())
    console.log(data);
  });

  ipcMain.handle('platform', () => process.platform);

  ipcMain.handle('capture-screenshot', async () => {
    const bounds = clippy.getBounds();
    const disp = screen.getDisplayMatching(bounds);
    const sources = await desktopCapturer.getSources({
      types: ['screen'],
      thumbnailSize: { width: disp.size.width, height: disp.size.height }
    });
    const src = sources.find((s) => String(disp.id) === s.display_id) ?? sources[0];
    return src.thumbnail.toDataURL(); // for instant thumbnail
  });
  return {
    setMainWindow: (window) => (mainWindow = window)
  };
};
