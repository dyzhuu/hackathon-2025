// import { activeWindow } from 'get-windows'
// import { EventEmitter } from 'events'

// export interface WindowInfo {
//   title: string
//   application: string
//   path: string
//   processId: number
//   bounds?: {
//     x: number
//     y: number
//     width: number
//     height: number
//   }
// }

// export interface WindowEvent {
//   type: 'window_focus' | 'window_blur' | 'window_change'
//   window: WindowInfo | null
//   previousWindow?: WindowInfo | null
//   timestamp: number
// }

// export class WindowHandler extends EventEmitter {
//   private isTracking: boolean = false
//   private checkInterval?: NodeJS.Timeout
//   private currentWindow: WindowInfo | null = null
//   private checkIntervalMs: number = 500 // Check every 500ms

//   constructor() {
//     super()
//   }

//   async start(): Promise<void> {
//     if (this.isTracking) return

//     this.isTracking = true

//     // Get initial window state
//     await this.checkActiveWindow()

//     // Start periodic checking
//     this.checkInterval = setInterval(async () => {
//       if (!this.isTracking) return
//       await this.checkActiveWindow()
//     }, this.checkIntervalMs)
//   }

//   stop(): void {
//     this.isTracking = false

//     if (this.checkInterval) {
//       clearInterval(this.checkInterval)
//       this.checkInterval = undefined
//     }
//   }

//   private async checkActiveWindow(): Promise<void> {
//     try {
//       const window = await activeWindow()

//       if (!window) {
//         // No active window (all minimized or desktop focused)
//         if (this.currentWindow !== null) {
//           const event: WindowEvent = {
//             type: 'window_blur',
//             window: null,
//             previousWindow: this.currentWindow,
//             timestamp: Date.now()
//           }

//           this.emit('window-event', event)
//           this.currentWindow = null
//         }
//         return
//       }

//       const windowInfo: WindowInfo = {
//         title: window.title || '',
//         application: window.owner?.name || '',
//         path: window.owner?.path || '',
//         processId: window.owner?.processId || -1,
//         bounds: window.bounds
//       }

//       // Check if window changed
//       if (this.hasWindowChanged(windowInfo)) {
//         const event: WindowEvent = {
//           type: this.currentWindow === null ? 'window_focus' : 'window_change',
//           window: windowInfo,
//           previousWindow: this.currentWindow,
//           timestamp: Date.now()
//         }

//         this.emit('window-event', event)
//         this.currentWindow = windowInfo
//       }
//     } catch (error) {
//       this.emit('error', error)
//     }
//   }

//   private hasWindowChanged(newWindow: WindowInfo): boolean {
//     if (!this.currentWindow) return true

//     return (
//       this.currentWindow.title !== newWindow.title ||
//       this.currentWindow.application !== newWindow.application ||
//       this.currentWindow.processId !== newWindow.processId
//     )
//   }

//   // Get current active window synchronously from cache
//   getCurrentWindow(): WindowInfo | null {
//     return this.currentWindow
//   }

//   // Force an immediate check
//   async forceCheck(): Promise<WindowInfo | null> {
//     await this.checkActiveWindow()
//     return this.currentWindow
//   }

//   // Configuration
//   setCheckInterval(intervalMs: number): void {
//     this.checkIntervalMs = intervalMs
//     if (this.isTracking) {
//       this.stop()
//       this.start()
//     }
//   }
// }

// // Singleton instance
// export const windowHandler = new WindowHandler()
