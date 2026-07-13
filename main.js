"use strict";

const path = require("node:path");
const fs = require("node:fs");
const { app, BrowserWindow, Menu, dialog, ipcMain } = require("electron");
const { autoUpdater } = require("electron-updater");

const isDevelopment = !app.isPackaged;
const DATA_FILE_NAME = "uchetka-data.json";
const updateState = {
  available: false,
  downloaded: false,
  checking: false,
  version: null,
};

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

function sendUpdateStatus(status) {
  BrowserWindow.getAllWindows().forEach((window) => {
    window.webContents.send("app-update:status", status);
  });
}

function setupUpdateControls() {
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;

  ipcMain.handle("app-update:check", async () => {
    if (isDevelopment) {
      return {
        canCheck: false,
        canInstall: false,
        message: "Обновления доступны после установки программы",
      };
    }

    if (updateState.downloaded) {
      return {
        canCheck: true,
        canInstall: true,
        message: updateState.version
          ? `Версия ${updateState.version} готова к установке`
          : "Обновление готово к установке",
      };
    }

    if (updateState.checking) {
      return {
        canCheck: false,
        canInstall: false,
        message: "Проверка обновления уже идет...",
      };
    }

    try {
      updateState.checking = true;
      sendUpdateStatus({
        canCheck: false,
        canInstall: false,
        message: "Проверяем обновление...",
      });

      await autoUpdater.checkForUpdates();

      if (updateState.downloaded) {
        return {
          canCheck: true,
          canInstall: true,
          message: updateState.version
            ? `Версия ${updateState.version} готова к установке`
            : "Обновление готово к установке",
        };
      }

      if (updateState.available) {
        return {
          canCheck: false,
          canInstall: false,
          message: updateState.version
            ? `Найдена версия ${updateState.version}, скачиваем...`
            : "Скачиваем обновление...",
        };
      }

      return {
        canCheck: true,
        canInstall: false,
        message: "Установлена последняя версия",
      };
    } catch (error) {
      console.error("Не удалось проверить обновление:", error);
      return {
        canCheck: true,
        canInstall: false,
        message: "Не удалось проверить обновление",
      };
    } finally {
      updateState.checking = false;
    }
  });

  ipcMain.handle("app-update:install", async () => {
    if (!updateState.downloaded) {
      return {
        canCheck: true,
        canInstall: false,
        message: "Обновление еще не скачано",
      };
    }

    autoUpdater.quitAndInstall();
    return {
      canCheck: false,
      canInstall: false,
      message: "Устанавливаем обновление...",
    };
  });

  autoUpdater.on("checking-for-update", () => {
    updateState.checking = true;
    sendUpdateStatus({
      canCheck: false,
      canInstall: false,
      message: "Проверяем обновление...",
    });
  });

  autoUpdater.on("update-available", (info) => {
    updateState.available = true;
    updateState.downloaded = false;
    updateState.version = info.version;
    sendUpdateStatus({
      canCheck: false,
      canInstall: false,
      message: `Найдена версия ${info.version}, скачиваем...`,
    });
  });

  autoUpdater.on("download-progress", (progress) => {
    sendUpdateStatus({
      canCheck: false,
      canInstall: false,
      message: `Скачиваем обновление: ${Math.round(progress.percent)}%`,
    });
  });

  autoUpdater.on("update-not-available", () => {
    updateState.available = false;
    updateState.checking = false;
    updateState.downloaded = false;
    updateState.version = null;
    sendUpdateStatus({
      canCheck: true,
      canInstall: false,
      message: "Установлена последняя версия",
    });
  });

  autoUpdater.on("update-downloaded", (info) => {
    updateState.available = true;
    updateState.downloaded = true;
    updateState.checking = false;
    updateState.version = info?.version ?? updateState.version;
    sendUpdateStatus({
      canCheck: true,
      canInstall: true,
      message: updateState.version
        ? `Версия ${updateState.version} готова к установке`
        : "Обновление готово к установке",
    });
  });

  autoUpdater.on("error", (error) => {
    updateState.checking = false;
    console.error("Ошибка автообновления:", error);
    sendUpdateStatus({
      canCheck: true,
      canInstall: updateState.downloaded,
      message: "Ошибка проверки обновления",
    });
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
  setupUpdateControls();

  if (isDevelopment) {
    return;
  }

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
