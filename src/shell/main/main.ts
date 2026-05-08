import { BrowserWindow } from 'electrobun/bun'

const win = new BrowserWindow({
  title: 'kb',
  url: 'views://shell/index.html',
  frame: { x: 100, y: 100, width: 820, height: 600 }
})

win.show()
win.focus()
