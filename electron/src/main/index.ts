import { app, shell, BrowserWindow, ipcMain, screen, desktopCapturer } from 'electron';
import { join } from 'path';
import { electronApp, optimizer, is } from '@electron-toolkit/utils';

import { eventManager } from './handlers/EventManager';
import { setupIpcs } from './ipc';

export function createWindow(route: string = ''): BrowserWindow {
  const primaryDisplay = screen.getPrimaryDisplay();

  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 300,
    height: 300,
    show: true,
    resizable: false,
    autoHideMenuBar: true,
    alwaysOnTop: true,
    x: Math.round((primaryDisplay.workAreaSize.width - 500) * Math.random()), // chang ethis later
    y: Math.round((primaryDisplay.workAreaSize.height - 500) * Math.random() + 200),
    hiddenInMissionControl: true,
    frame: true,
    transparent: route == '',
    movable: true,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  });

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

  const ipcContext = setupIpcs(createWindow, eventManager);
  // Start tracking automatically (optional)
  eventManager.start().catch(console.error);

  const sticky = createWindow();
  ipcContext.setMainWindow(sticky);

  //createWindow('notes')

  // Set up event forwarding to renderer
  eventManager.on('activity-event', (event) => {
    // Send to all windows
    BrowserWindow.getAllWindows().forEach((window) => {
      window.webContents.send('activity-event', event);
    });
  });

  // Set up window data consumer for LLM processing
  eventManager.on('window-data', (windowData) => {
    console.log('\n' + '='.repeat(80));
    console.log(
      `🤖 LLM WINDOW DATA (${new Date(windowData.windowStart).toLocaleTimeString()} - ${new Date(windowData.windowEnd).toLocaleTimeString()})`
    );
    console.log('='.repeat(80));

    console.log('🖱️  Mouse Events: ', windowData.mouseEvents);

    console.log('');

    console.log('⌨️  Keyboard Events: ', windowData.keyboardEvents);

    console.log('');

    console.log('🖼️  Window Events: ', windowData.windowEvents);

    console.log('='.repeat(80) + '\n');

    // TODO: Send windowData to LLM service here
    // await sendToLLM(windowData)
  });

  // Start tracking automatically (optional)
  eventManager.start().catch(console.error);

  ipcMain.on('some-channel', (event, data) => {
    const note = createWindow('notes');
    clippy.show();
    // note.setPosition(clippy.getPosition())
    console.log(data);
  });

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });

  async function moveStickyTo(
    sticky: BrowserWindow,
    x: number,
    y: number,
    type: string = 'jerk'
  ): Promise<void> {
    return new Promise((resolve) => {
      const currentPos = sticky.getPosition();

      if (currentPos[0] == x && currentPos[1] == y) {
        resolve();
      }

      if (type == 'jerk') {
        let new_x;
        let new_y;
        if (Math.abs(currentPos[0] - x) >= 10) {
          new_x = currentPos[0] + (currentPos[0] > x ? -10 : 10);
        } else {
          new_x = x;
        }
        if (Math.abs(currentPos[1] - y) >= 10) {
          new_y = currentPos[1] + (currentPos[1] > y ? -10 : 10);
        } else {
          new_y = y;
        }
        sticky.setPosition(new_x, new_y);
        setTimeout(async () => {
          moveStickyTo(sticky, x, y, 'jerk');
        }, 100);
      }
    });
  }

  function randomLocation(): number[] {
    const primaryDisplay = screen.getPrimaryDisplay();
    const position = [
      Math.round(Math.random() * primaryDisplay.workAreaSize.width),
      Math.round(Math.random() * primaryDisplay.workAreaSize.height)
    ];
    return position;
  }

  setInterval(async () => {
    const loc = randomLocation();
    await moveStickyTo(sticky, loc[0], loc[1], 'jerk');
  }, 1000);
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
