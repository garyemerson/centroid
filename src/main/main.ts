import { app, BrowserWindow, globalShortcut, ipcMain } from 'electron';
import url = require('url');
import path = require('path');
import native = require('../../native');

native.init()
console.log("From main.ts/Rust:", native.getRandNum(100))

// Global window object so it doesn't go out of scope and get GCed.
let win: Electron.BrowserWindow | null

function createWindow() {
  win = new BrowserWindow({ width: 1000, height: 675 })

  globalShortcut.register('F12', () => {
    if (win) {
      win.webContents.openDevTools()
    }
  })

  const indexUrl = url.format({
    pathname: path.join(__dirname, 'app', 'index.html'),
    protocol: 'file:',
    slashes: true
  })
  win.loadURL(indexUrl)

  win.on('closed', () => {
    win = null
  })
}

// ipcMain.on('video-size', (event, width: number, height: number) => {
//   console.log('video-size', width, height)
//   if (win) {
//     const [newWidth, newHeight] = constrainSize([width, height], [800, 600])
//     console.log("Setting size:", newWidth, newHeight)
//     win.setContentSize(newWidth, newHeight)
//   }
// })

app.on('ready', createWindow)
