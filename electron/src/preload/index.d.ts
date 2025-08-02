import { ElectronAPI } from '@electron-toolkit/preload';

// interface TrackingAPI {
//   startTracking: () => Promise<{ success: boolean; error?: string }>
//   stopTracking: () => Promise<{ success: boolean }>
//   getTrackingStats: () => Promise<{
//     totalEvents: number
//     mouseEvents: number
//     keyboardEvents: number
//     windowEvents: number
//     screenshotEvents: number
//     startTime: number
//     lastEventTime: number
//   }>
//   captureScreenshot: () => Promise<{ success: boolean; data?: any; error?: string }>
//   getMonitors: () => Promise<
//     Array<{
//       id: number
//       x: number
//       y: number
//       width: number
//       height: number
//       isPrimary: boolean
//       scaleFactor: number
//     }>
//   >
//   getEvents: (category?: string, limit?: number) => Promise<any[]>
//   onActivityEvent: (callback: (event: any) => void) => () => void
// }

declare global {
  interface Window {
    electron: ElectronAPI;
    api: import('./index').Api;
  }
}
