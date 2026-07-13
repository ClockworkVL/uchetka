"use strict";

const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("uchetkaStorage", {
  load: () => ipcRenderer.invoke("app-data:load"),
  save: (data) => ipcRenderer.invoke("app-data:save", data),
});
