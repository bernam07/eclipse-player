import {
  app,
  BrowserWindow,
  ipcMain,
  protocol,
  globalShortcut,
} from "electron";
import * as path from "path";
import * as fs from "fs";
import { Readable } from "stream";

protocol.registerSchemesAsPrivileged([
  {
    scheme: "local-media",
    privileges: {
      secure: true,
      supportFetchAPI: true,
      bypassCSP: true,
      stream: true,
    },
  },
]);

const userDataPath = app.getPath("userData");
const playlistFilePath = path.join(userDataPath, "playlist.json");

function createWindow() {
  const win = new BrowserWindow({
    width: 780,
    height: 550,
    minWidth: 700,
    minHeight: 500,
    resizable: true,
    frame: false,
    transparent: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  if (!app.isPackaged) {
    win.loadURL("http://localhost:5173");
  } else {
    win.loadFile(path.join(__dirname, "../dist/index.html"));
  }

  ipcMain.on("window-minimize", () => {
    win.minimize();
  });
  ipcMain.on("window-close", () => {
    win.close();
  });

  globalShortcut.register("MediaPlayPause", () => {
    win.webContents.send("media-play-pause");
  });
  globalShortcut.register("MediaNextTrack", () => {
    win.webContents.send("media-next");
  });
  globalShortcut.register("MediaPreviousTrack", () => {
    win.webContents.send("media-prev");
  });
}

app.whenReady().then(() => {
  protocol.handle("local-media", (request) => {
    let filePath = request.url.slice("local-media://".length);
    filePath = decodeURIComponent(filePath);

    if (process.platform === "win32" && filePath.startsWith("/")) {
      filePath = filePath.substring(1);
    }

    try {
      const stats = fs.statSync(filePath);
      const range = request.headers.get("range");
      const ext = path.extname(filePath).toLowerCase();
      let mimeType = "audio/mpeg";
      if (ext === ".wav") mimeType = "audio/wav";
      else if (ext === ".ogg") mimeType = "audio/ogg";
      else if (ext === ".flac") mimeType = "audio/flac";

      const commonHeaders = {
        "Accept-Ranges": "bytes",
        "Content-Type": mimeType,
        "Access-Control-Allow-Origin": "*",
      };

      if (range) {
        const parts = range.replace(/bytes=/, "").split("-");
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : stats.size - 1;
        const chunksize = end - start + 1;

        const fileStream = fs.createReadStream(filePath, { start, end });
        return new Response(Readable.toWeb(fileStream) as any, {
          status: 206,
          headers: {
            ...commonHeaders,
            "Content-Range": `bytes ${start}-${end}/${stats.size}`,
            "Content-Length": chunksize.toString(),
          },
        });
      } else {
        const fileStream = fs.createReadStream(filePath);
        return new Response(Readable.toWeb(fileStream) as any, {
          status: 200,
          headers: {
            ...commonHeaders,
            "Content-Length": stats.size.toString(),
          },
        });
      }
    } catch (error) {
      return new Response("File not found", { status: 404 });
    }
  });

  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("will-quit", () => {
  globalShortcut.unregisterAll();
});
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

ipcMain.on("save-playlist", (event, playlist) => {
  try {
    fs.writeFileSync(playlistFilePath, JSON.stringify(playlist));
  } catch (e) {}
});
ipcMain.handle("load-playlist", () => {
  try {
    if (fs.existsSync(playlistFilePath))
      return JSON.parse(fs.readFileSync(playlistFilePath, "utf-8"));
  } catch (e) {}
  return [];
});
