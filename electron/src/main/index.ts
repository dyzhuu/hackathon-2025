import { app, shell, BrowserWindow, ipcMain, screen } from 'electron';
import { electronApp, optimizer, is } from '@electron-toolkit/utils';
import { setupIpcs } from './ipc';
import { join } from 'path';
import { eventManager, ObservationData } from './handlers/EventManager';
import { getIntendedActions } from './langgraph/functions';
import { randomLocation, moveLinear, moveJerk, moveCursor, throwWindow } from './logic/movement';

// Create a window
function createWindow(
  route: string = '',
  hasFrame: boolean = false,
  isTransparent: boolean = false,
  bgColor: string = '#00000000'
): BrowserWindow {
  const primaryDisplay = screen.getPrimaryDisplay();
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 200,
    height: 200,
    show: true,
    resizable: false,
    autoHideMenuBar: true,
    alwaysOnTop: true,
    x: Math.round((primaryDisplay.workAreaSize.width - 500) * Math.random()), // change this later
    y: Math.round((primaryDisplay.workAreaSize.height - 500) * Math.random() + 200),
    hiddenInMissionControl: true,
    frame: hasFrame,
    transparent: isTransparent,
    hasShadow: false,
    backgroundColor: bgColor,
    movable: true,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    },
    // This disables the native macOS "resolution frame label" when moving the window
    titleBarStyle: 'customButtonsOnHover'
  });

  if (import.meta.env.DEV && isTransparent) {
    mainWindow.webContents.openDevTools({
      mode: 'detach'
    });
  }

  mainWindow.on('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url);
    return { action: 'deny' };
  });

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(`${process.env['ELECTRON_RENDERER_URL']}#/${route}`);
  } else {
    mainWindow.loadFile(join(__dirname, `../renderer/index.html`));
  }

  return mainWindow;
}

// Main process lifecycle

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  // Set app user model id for windows
  electronApp.setAppUserModelId('com.electron');

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window);
  });

  // Window creation
  const ipcContext = setupIpcs(createWindow, eventManager);

  const sticky = createWindow('sticky', false, true);
  ipcContext.setMainWindow(sticky);

  // Start tracking automatically (optional)
  eventManager.start().catch(console.error);

  // Set up event forwarding to renderer
  eventManager.on('activity-event', (event) => {
    // Send to all windows
    BrowserWindow.getAllWindows().forEach((window) => {
      window.webContents.send('activity-event', event);
    });
  });

  //  Set up window data consumer for LLM processing
  eventManager.on('window-data', (windowData: ObservationData) => {
    // David handle your promise rejections for this commented out stuff pls lmao
    getIntendedActions({ observationData: windowData });
  });

  // Event listeners
  ipcMain.on('create-note', (_event, data) => {
    const note = createWindow('notes', true, false, '#fff085');

    const pos = sticky.getPosition();
    note.setPosition(pos[0], pos[1]);

    ipcMain.once('note-ready', (event) => {
      event.sender.send('note-data', data);

      if (Math.random() > 0.5) {
        throwWindow(note, pos[0] + (Math.random() > 0.5 ? 1 : -1) * Math.random() * 5000);
      }

      sticky.show();
    });

    sticky.show();
  });

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });

  // Actions
  const moveActions = {
    linear: moveLinear,
    jerk: moveJerk,
    cursor: moveCursor
  };

  (async () => {
    while (true) {
      await new Promise((resolve) => setTimeout(resolve, 3000));

      const actionKeys = Object.keys(moveActions) as (keyof typeof moveActions)[];
      const actionIndex = Math.floor(Math.random() * actionKeys.length);
      const randomKey = actionKeys[actionIndex];

      const windowSize = screen.getPrimaryDisplay();
      const [endX, endY] = randomLocation([
        windowSize.workAreaSize.width,
        windowSize.workAreaSize.height
      ]);

      const stickyPos = sticky.getPosition();
      const move: { type: string | null; direction: string } = {
        type: randomKey,
        direction:
          Math.sign(endX - stickyPos[0]) === Math.sign(endY - stickyPos[1]) ? 'backslash' : 'slash'
      };
      sticky.webContents.send('sticky-move', move);

      await moveActions[randomKey](sticky, endX, endY);

      move.type = null;
      sticky.webContents.send('sticky-move', move);

      ipcMain.emit('create-note');
    }
  })();
});

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Clean up event tracking when app quits
app.on('before-quit', () => {
  eventManager.stop();
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
