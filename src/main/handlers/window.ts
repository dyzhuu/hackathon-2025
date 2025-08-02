import { EventEmitter } from 'events';
import { activeWindow } from 'get-windows';

export interface WindowEvent {
  type: 'window_change';
  active_app: string;
  window_title: string;
  processId?: number;
  bundleId?: string;
  path?: string;
  timestamp: number;
}

export class WindowHandler extends EventEmitter {
  private isTracking: boolean = false;
  private currentWindow: WindowEvent | null = null;
  private pollInterval: NodeJS.Timeout | null = null;
  private POLL_INTERVAL_MS = 1000; // Check for window changes every second

  constructor() {
    super();
  }

  start(): void {
    if (this.isTracking) return;

    this.isTracking = true;

    try {
      // Start polling for window changes
      this.startPolling();
      console.log('🚀 Global window tracking started');
      console.log('🖥️ Window changes will be tracked and logged');
    } catch (error) {
      console.error('❌ Failed to start window tracking:', error);
      this.isTracking = false;
      throw error;
    }
  }

  stop(): void {
    if (!this.isTracking) return;

    this.isTracking = false;

    try {
      this.stopPolling();
      console.log('Global window tracking stopped');
    } catch (error) {
      console.error('Failed to stop window tracking:', error);
    }

    this.currentWindow = null;
  }

  private startPolling(): void {
    // Get initial window state
    this.checkWindowChange();

    // Set up polling interval
    this.pollInterval = setInterval(() => {
      this.checkWindowChange();
    }, this.POLL_INTERVAL_MS);
  }

  private stopPolling(): void {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
  }

  private async checkWindowChange(): Promise<void> {
    if (!this.isTracking) return;

    try {
      const windowInfo = await activeWindow();
      
      if (!windowInfo) {
        // No active window found
        return;
      }

      const newWindowEvent: WindowEvent = {
        type: 'window_change',
        active_app: this.extractAppName(windowInfo.owner?.name || '', windowInfo.owner?.path || ''),
        window_title: windowInfo.title || '',
        processId: windowInfo.owner?.processId,
        bundleId: windowInfo.owner?.bundleId,
        path: windowInfo.owner?.path,
        timestamp: Date.now()
      };

      // Check if window has actually changed
      if (this.hasWindowChanged(newWindowEvent)) {
        this.currentWindow = newWindowEvent;
        this.emit('window-event', newWindowEvent);
      }
    } catch (error) {
      console.error('Error checking window change:', error);
    }
  }

  private hasWindowChanged(newWindow: WindowEvent): boolean {
    if (!this.currentWindow) {
      return true; // First window detection
    }

    // Compare relevant fields to detect changes
    return (
      this.currentWindow.active_app !== newWindow.active_app ||
      this.currentWindow.window_title !== newWindow.window_title
    );
  }

  private extractAppName(appName: string, appPath: string): string {
    // Try to get a clean app name
    if (appName) {
      return appName;
    }

    // If no app name, try to extract from path
    if (appPath) {
      const pathParts = appPath.split(/[/\\]/);
      const fileName = pathParts[pathParts.length - 1];
      
      // Remove .exe extension on Windows
      if (fileName.toLowerCase().endsWith('.exe')) {
        return fileName.slice(0, -4) + '.exe';
      }
      
      // Remove .app extension on macOS
      if (fileName.toLowerCase().endsWith('.app')) {
        return fileName.slice(0, -4);
      }
      
      return fileName;
    }

    return 'Unknown';
  }

  // Get current window state
  getCurrentWindow(): WindowEvent | null {
    return this.currentWindow;
  }

  // Helper method to format window information
  static formatWindowInfo(event: WindowEvent): string {
    return `${event.active_app} - "${event.window_title}"`;
  }

  // Configuration method
  setPollInterval(intervalMs: number): void {
    if (intervalMs < 100) {
      console.warn('Poll interval too low, minimum is 100ms');
      return;
    }
    
    this.POLL_INTERVAL_MS = intervalMs;
    
    // Restart polling with new interval if currently tracking
    if (this.isTracking) {
      this.stopPolling();
      this.startPolling();
    }
  }
}

// Singleton instance
export const windowHandler = new WindowHandler();