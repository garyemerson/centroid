import { app, BrowserWindow, globalShortcut, ipcMain } from 'electron';
import url = require('url');
import path = require('path');
import native = require('../../native');
const {Menu, MenuItem} = require('electron')

native.init()

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
    slashes: true,
    // search: 'react_perf',
  })
  win.loadURL(indexUrl)

  win.on('closed', () => {
    win = null
  })

  setupMenu()
}


function setupMenu() {
  const {Menu} = require('electron')
  const electron = require('electron')
  const app = electron.app

  const template = [
    {
      label: 'Edit',
      submenu: [
        {
          role: 'undo'
        },
        {
          role: 'redo'
        },
        {
          type: "separator"
        },
        {
          role: 'cut'
        },
        {
          role: 'copy'
        },
        {
          role: 'paste'
        },
        {
          role: 'pasteandmatchstyle'
        },
        {
          role: 'delete'
        },
        {
          role: 'selectall'
        }
      ]
    },
    {
      label: 'View',
      submenu: [
        {
          label: 'Reload',
          accelerator: 'CmdOrCtrl+R',
          click (item, focusedWindow) {
            if (focusedWindow) focusedWindow.reload()
          }
        },
        {
          label: "Toggle Search",
          accelerator: "CmdOrCtrl+L",
          click (item, focusedWindow) {
            // console.log("foobar menu clicked")
            if (win !== null) {
              win.webContents.send('toggle-search')
            }
          }
        },
        {
          label: 'Toggle Developer Tools',
          accelerator: process.platform === 'darwin' ? 'Alt+Command+I' : 'Ctrl+Shift+I',
          click (item, focusedWindow) {
            if (focusedWindow) focusedWindow.webContents.toggleDevTools()
          }
        },
        {
          type: "separator"
        },
        {
          role: 'resetzoom'
        },
        {
          role: 'zoomin'
        },
        {
          role: 'zoomout'
        },
        {
          type: "separator"
        },
        {
          role: 'togglefullscreen'
        }
      ]
    },
    {
      role: 'window',
      submenu: [
        {
          role: 'minimize'
        },
        {
          role: 'close'
        }
      ]
    },
    {
      role: 'help',
      submenu: [
        {
          label: 'Learn More',
          click () { require('electron').shell.openExternal('http://electron.atom.io') }
        }
      ]
    }
  ]

  if (process.platform === 'darwin') {
    const name = app.getName()
    template.unshift({
      label: name,
      submenu: [
        {
          role: 'about'
        },
        {
          type: "separator"
        },
        {
          role: 'services',
          submenu: []
        },
        {
          type: "separator"
        },
        {
          role: 'hide'
        },
        {
          role: 'hideothers'
        },
        {
          role: 'unhide'
        },
        {
          type: "separator"
        },
        {
          role: 'quit'
        }
      ]
    })
    // Edit menu.
    template[1].submenu.push(
      {
        type: "separator"
      },
      {
        label: 'Speech',
        submenu: [
          {
            role: 'startspeaking'
          },
          {
            role: 'stopspeaking'
          }
        ]
      }
    )
    // Window menu.
    template[3].submenu = [
      {
        label: 'Close',
        accelerator: 'CmdOrCtrl+W',
        role: 'close'
      },
      {
        label: 'Minimize',
        accelerator: 'CmdOrCtrl+M',
        role: 'minimize'
      },
      {
        label: 'Zoom',
        role: 'zoom'
      },
      {
        type: "separator"
      },
      {
        label: 'Bring All to Front',
        role: 'front'
      }
    ]
  }

  const menu = Menu.buildFromTemplate(template)
  Menu.setApplicationMenu(menu)
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

// app.on('ready', () => {
//   BrowserWindow.addDevToolsExtension("/Users/Garrett/Library/Application Support/Google/Chrome/Default/Extensions/fmkadmapgofadopljbjfkapdkoienihi/2.4.0_0")
// })

app.on('ready', () => {
  // Register a 'CommandOrControl+Y' shortcut listener.
  globalShortcut.register('CommandOrControl+Y', () => {
    // Do stuff when Y and either Command/Control is pressed.
    console.log("foobar shortcut")
  })
})

