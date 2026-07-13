"use strict";

const path = require("node:path");
const fs = require("node:fs");
const { app, BrowserWindow, Menu, dialog, ipcMain } = require("electron");
const { autoUpdater } = require("electron-updater");

const isDevelopment = !app.isPackaged;
const DATA_FILE_NAME = "uchetka-data.json";

app.setAppUserModelId("ru.clockworkvl.uchetka");

function getDataFilePath() {
  return path.join(app.getPath("userData"), DATA_FILE_NAME);
}

function setupDataStorage() {
  ipcMain.handle("app-data:load", async () => {
    const dataFilePath = getDataFilePath();

    try {
      if (!fs.existsSync(dataFilePath)) {
        return null;
      }

      const fileContent = await fs.promises.readFile(dataFilePath, "utf8");
      return JSON.parse(fileContent);
    } catch (error) {
      console.error("Не удалось прочитать файл данных:", error);
      return null;
    }
  });

  ipcMain.handle("app-data:save", async (_event, data) => {
    const dataFilePath = getDataFilePath();
    const tempFilePath = `${dataFilePath}.tmp`;

    await fs.promises.mkdir(path.dirname(dataFilePath), { recursive: true });
    await fs.promises.writeFile(tempFilePath, JSON.stringify(data, null, 2), "utf8");
    await fs.promises.rename(tempFilePath, dataFilePath);
    return true;
  });
}

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
      preload: path.join(__dirname, "preload.js"),
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
  setupDataStorage();
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
