"use strict";

const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("uchetkaStorage", {
  load: () => ipcRenderer.invoke("app-data:load"),
  save: (data) => ipcRenderer.invoke("app-data:save", data),
});

contextBridge.exposeInMainWorld("uchetkaUpdater", {
  check: () => ipcRenderer.invoke("app-update:check"),
  install: () => ipcRenderer.invoke("app-update:install"),
  onStatus: (callback) => {
    const listener = (_event, status) => callback(status);
    ipcRenderer.on("app-update:status", listener);
    return () => ipcRenderer.removeListener("app-update:status", listener);
  },
});
