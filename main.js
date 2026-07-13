"use strict";

const path = require("node:path");
const { app, BrowserWindow, Menu, dialog } = require("electron");
const { autoUpdater } = require("electron-updater");

const isDevelopment = !app.isPackaged;

app.setAppUserModelId("ru.clockworkvl.uchetka");

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1240,
    height: 900,
    minWidth: 980,
    minHeight: 700,
    title: "Учет продаж",
    backgroundColor: "#f5f7f8",
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.loadFile(path.join(__dirname, "index.html"));

  if (isDevelopment) {
    mainWindow.webContents.openDevTools({ mode: "detach" });
  }
}

function setupAutoUpdates() {
  if (isDevelopment) {
    return;
  }

  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;

  autoUpdater.on("update-downloaded", async () => {
    const result = await dialog.showMessageBox({
      type: "info",
      buttons: ["Перезапустить", "Позже"],
      defaultId: 0,
      cancelId: 1,
      title: "Обновление готово",
      message: "Новая версия загружена.",
      detail: "Перезапустите программу, чтобы установить обновление.",
    });

    if (result.response === 0) {
      autoUpdater.quitAndInstall();
    }
  });

  autoUpdater.on("error", (error) => {
    console.error("Ошибка автообновления:", error);
  });

  autoUpdater.checkForUpdatesAndNotify().catch((error) => {
    console.error("Не удалось проверить обновления:", error);
  });
}

app.whenReady().then(() => {
  Menu.setApplicationMenu(null);
  createWindow();
  setupAutoUpdates();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
