import { App } from "../App"
import { Window } from "./Window"

export class WindowManager {

  view: HTMLDivElement
  windows: Window[] = []
  app: App

  constructor( app: App, view: HTMLDivElement ) {
    this.app = app
    this.view = view
  }

  unfocusAll() {
    for (let window of this.view.querySelectorAll(".focused")) {
      window.classList.remove("focused")
    }
  }

  openWindow(window: Window) {
    if (!this.windows.every(window => !window.options.blocking)) return
    if (window.options.win_id) {
      let existingWindow = this.getWindowById(window.options.win_id)
      if (existingWindow) {
        existingWindow.focus()
        return 
      }
    }
    window.addToManager(this)
    this.windows.push(window)
  }

  removeWindow(window: Window) {
    this.windows.splice(this.windows.indexOf(window))
  }
  
  getWindowById(id: string): Window | undefined {
    for (let window of this.windows) {
      if (window.options.win_id == id) return window
    }
    return undefined
  }
}