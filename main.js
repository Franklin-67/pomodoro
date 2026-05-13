const { app, BrowserWindow, Tray, Menu, nativeImage, Notification, ipcMain } = require('electron');
const path = require('path');

let mainWindow;
let tray;
let isQuitting = false;

// 处理通知请求
ipcMain.on('show-notification', (event, { title, body }) => {
    if (Notification.isSupported()) {
        const notification = new Notification({
            title: title,
            body: body,
            icon: path.join(__dirname, 'icon.png')
        });
        notification.show();
    }
});

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 420,
        height: 700,
        resizable: false,
        frame: true,
        transparent: false,
        alwaysOnTop: false,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js')
        },
        icon: path.join(__dirname, 'icon.ico')
    });

    mainWindow.loadFile('index.html');

    // 关闭时最小化到托盘而不是退出
    mainWindow.on('close', (event) => {
        if (!isQuitting) {
            event.preventDefault();
            mainWindow.hide();
        }
    });

    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}

function createTray() {
    const icon = nativeImage.createFromPath(path.join(__dirname, 'icon.ico'));
    tray = new Tray(icon.resize({ width: 16, height: 16 }));

    const contextMenu = Menu.buildFromTemplate([
        {
            label: '显示窗口',
            click: () => {
                mainWindow.show();
            }
        },
        {
            label: '退出',
            click: () => {
                isQuitting = true;
                app.quit();
            }
        }
    ]);

    tray.setToolTip('番茄钟');
    tray.setContextMenu(contextMenu);

    tray.on('double-click', () => {
        mainWindow.show();
    });
}

// 设置开机自启动（可选）
function setAutoLaunch() {
    app.setLoginItemSettings({
        openAtLogin: false,
        path: app.getPath('exe')
    });
}

app.whenReady().then(() => {
    createWindow();
    createTray();
    setAutoLaunch();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

// 阻止多开
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
    app.quit();
} else {
    app.on('second-instance', () => {
        if (mainWindow) {
            mainWindow.show();
            mainWindow.focus();
        }
    });
}
