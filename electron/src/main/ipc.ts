import { BrowserWindow, desktopCapturer, ipcMain, screen } from 'electron';
import { EventManager } from './handlers/EventManager';

type IPCContext = {
  setMainWindow: (window: BrowserWindow) => void;
};

export const setupIpcs = (
  createWindow: (route?: string) => BrowserWindow,
  eventManager: EventManager
): IPCContext => {
  let mainWindow: BrowserWindow | undefined; // Will be used for future main window reference
  // Set up IPC handlers for event tracking
  ipcMain.handle('start-tracking', async () => {
    try {
      await eventManager.start();
      return { success: true };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  });

  ipcMain.handle('capture-screenshot', async () => {
    if (!mainWindow) return;
    const currentWindow = screen.getDisplayMatching(mainWindow.getBounds());
    const sources = await desktopCapturer.getSources({
      types: ['screen'],
      thumbnailSize: currentWindow.size
    });
    const source = sources.find((source) => source.id === `screen:${currentWindow.id}:0`);

    return source?.thumbnail.toPNG().toString('base64');
  });

  ipcMain.handle('stop-tracking', () => {
    eventManager.stop();
    return { success: true };
  });

  ipcMain.handle('get-tracking-stats', () => {
    return eventManager.getStats();
  });

  ipcMain.on('some-channel', (_event, data) => {
    mainWindow?.show();
    // TODO: Position note relative to sticky
    const pos = mainWindow?.getPosition();
    if (pos) {
      const note = createWindow('notes'); // Note window created but not stored
      note.setPosition(pos[0] + 100, pos[1] - 50); // Position note relative to main window
      note.webContents.once('did-finish-load', () => {
        note.webContents.send('note-data', data);
      });
    }
    console.log(data);
  });

  ipcMain.handle('platform', () => process.platform);

  return {
    setMainWindow: (window) => (mainWindow = window)
  };
};
