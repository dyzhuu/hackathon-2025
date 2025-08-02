import { EventEmitter } from 'events';
import { activeWindow } from 'get-windows';

export interface WindowEvent {
  type: 'window_change';
  activeApp: string;
  windowTitle: string;
  processId?: number;
  bundleId?: string;
  path?: string;
  timestamp: number;
}

export class WindowHandler extends EventEmitter {
  private isTracking: boolean = false;
  private currentWindow: WindowEvent | null = null;
  private pollInterval: NodeJS.Timeout | null = null;
  private POLL_INTERVAL_MS = 200; // Check for window changes every 200ms

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
        // No active window found - log this for debugging
        // console.warn('⚠️ No active window detected');

        // Emit an event for "no window" state if we previously had a different window
        const noWindowEvent: WindowEvent = {
          type: 'window_change',
          activeApp: 'No Active Window',
          windowTitle: '',
          timestamp: Date.now()
        };

        if (this.hasWindowChanged(noWindowEvent)) {
          this.currentWindow = noWindowEvent;
          this.emit('window-event', noWindowEvent);
        }
        return;
      }

      const newWindowEvent: WindowEvent = {
        type: 'window_change',
        activeApp: this.extractAppName(windowInfo.owner?.name || '', windowInfo.owner?.path || ''),
        windowTitle: windowInfo.title || '',
        processId: windowInfo.owner?.processId,
        bundleId: 'bundleId' in windowInfo.owner ? windowInfo.owner.bundleId : undefined,
        path: windowInfo.owner?.path,
        timestamp: Date.now()
      };

      // Check if window has actually changed
      if (this.hasWindowChanged(newWindowEvent)) {
        this.currentWindow = newWindowEvent;
        // console.log(`🔄 Window changed: ${WindowHandler.formatWindowInfo(newWindowEvent)}`);
        this.emit('window-event', newWindowEvent);
      }
    } catch (error) {
      console.error('❌ Error checking window change:', error);

      // Emit an error event so listeners can handle failures
      this.emit('window-error', {
        error: error instanceof Error ? error.message : String(error),
        timestamp: Date.now()
      });
    }
  }

  private hasWindowChanged(newWindow: WindowEvent): boolean {
    if (!this.currentWindow) {
      return true; // First window detection
    }

    // Compare relevant fields to detect changes
    return (
      this.currentWindow.activeApp !== newWindow.activeApp ||
      this.currentWindow.windowTitle !== newWindow.windowTitle
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
    return `${event.activeApp} - "${event.windowTitle}"`;
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

  // Debug method to manually check current window state
  async debugCurrentWindow(): Promise<void> {
    console.log('🔍 Debug: Checking current window state...');
    try {
      const windowInfo = await activeWindow();
      if (!windowInfo) {
        console.log('🔍 Debug: No active window found');
        return;
      }

      console.log('🔍 Debug: Raw window info:', {
        title: windowInfo.title,
        owner: windowInfo.owner,
        bounds: windowInfo.bounds
      });

      const formatted = WindowHandler.formatWindowInfo({
        type: 'window_change',
        activeApp: this.extractAppName(windowInfo.owner?.name || '', windowInfo.owner?.path || ''),
        windowTitle: windowInfo.title || '',
        processId: windowInfo.owner?.processId,
        bundleId: 'bundleId' in windowInfo.owner ? windowInfo.owner.bundleId : undefined,
        path: windowInfo.owner?.path,
        timestamp: Date.now()
      });

      console.log('🔍 Debug: Formatted window info:', formatted);
    } catch (error) {
      console.error('🔍 Debug: Error getting window info:', error);
    }
  }
}

// Singleton instance
export const windowHandler = new WindowHandler();
