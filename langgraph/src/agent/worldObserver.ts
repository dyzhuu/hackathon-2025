/**
 * World Model Observer Agent
 * 
 * Non-LLM programmatic agent that observes and records user environment state.
 * Acts as the sensory nervous system, capturing events and system state.
 */

import * as fs from 'fs';
import * as path from 'path';
import { ObservationData, WindowContext, MouseEvent, KeyboardEvent } from './state.js';

export class WorldModelObserver {
  private isMonitoring: boolean = false;
  private currentSession: Partial<ObservationData> | null = null;
  private sessionStartTime: Date | null = null;
  private mouseEvents: MouseEvent[] = [];
  private keyboardEvents: KeyboardEvent[] = [];
  private screenshotPath: string = '';

  /**
   * Start monitoring a new application window session
   */
  async startMonitoring(applicationContext: WindowContext): Promise<void> {
    if (this.isMonitoring) {
      await this.endMonitoring();
    }

    this.isMonitoring = true;
    this.sessionStartTime = new Date();
    this.mouseEvents = [];
    this.keyboardEvents = [];
    
    // Take initial screenshot
    this.screenshotPath = await this.takeScreenshot();
    
    this.currentSession = {
      windowStartTime: this.sessionStartTime.toISOString(),
      applicationContext: applicationContext,
      screenshotPath: this.screenshotPath,
      mouseEvents: [],
      keyboardEvents: []
    };

    // Start listening for events (in a real implementation, these would be OS-level hooks)
    this.startEventListening();
    
    console.log('World Model Observer: Started monitoring', applicationContext.processName);
  }

  /**
   * Record a mouse event
   */
  recordMouseEvent(eventType: "move" | "click" | "scroll", position: { x: number; y: number }, additionalData?: any): void {
    if (!this.isMonitoring) return;

    const event: MouseEvent = {
      timestamp: new Date().toISOString(),
      eventType: eventType,
      position,
      ...additionalData
    };

    this.mouseEvents.push(event);
  }

  /**
   * Record a keyboard event
   */
  recordKeyboardEvent(eventType: "key_down" | "key_up", keyName: string, modifiers: string[]): void {
    if (!this.isMonitoring) return;

    const event: KeyboardEvent = {
      timestamp: new Date().toISOString(),
      eventType: eventType,
      keyName: keyName,
      modifiers
    };

    this.keyboardEvents.push(event);
  }

  /**
   * End monitoring session and return complete observation data
   */
  async endMonitoring(): Promise<ObservationData | null> {
    if (!this.isMonitoring || !this.currentSession || !this.sessionStartTime) {
      return null;
    }

    const endTime = new Date();
    const duration = endTime.getTime() - this.sessionStartTime.getTime();

    this.stopEventListening();

    const observationData: ObservationData = {
      windowStartTime: this.currentSession.windowStartTime!,
      windowEndTime: endTime.toISOString(),
      durationMs: duration,
      applicationContext: this.currentSession.applicationContext!,
      screenshotPath: this.currentSession.screenshotPath!,
      mouseEvents: this.mouseEvents,
      keyboardEvents: this.keyboardEvents
    };

    this.isMonitoring = false;
    this.currentSession = null;
    this.sessionStartTime = null;
    this.mouseEvents = [];
    this.keyboardEvents = [];

    console.log('World Model Observer: Session ended, captured', 
      observationData.mouseEvents.length, 'mouse events and', 
      observationData.keyboardEvents.length, 'keyboard events');

    return observationData;
  }

  /**
   * Simulate taking a screenshot (in a real implementation, this would capture the actual screen)
   */
  private async takeScreenshot(): Promise<string> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `screenshot_${timestamp}.png`;
    const screenshotDir = path.join(process.cwd(), 'screenshots');
    
    // Ensure screenshots directory exists
    if (!fs.existsSync(screenshotDir)) {
      fs.mkdirSync(screenshotDir, { recursive: true });
    }
    
    const filePath = path.join(screenshotDir, filename);
    
    // For now, create a placeholder file (in real implementation, use screenshot library)
    fs.writeFileSync(filePath, 'Placeholder screenshot data');
    
    return filePath;
  }

  /**
   * Simulate getting current active window context
   */
  static async getCurrentWindowContext(): Promise<WindowContext> {
    // In a real implementation, this would use OS APIs to get the active window
    return {
      processName: process.platform === 'darwin' ? 'Finder' : 'explorer.exe',
      windowTitle: 'Sample Window',
      windowGeometry: { x: 100, y: 100, width: 1200, height: 800 }
    };
  }

  /**
   * Start listening for system events (placeholder implementation)
   */
  private startEventListening(): void {
    // In a real implementation, this would set up OS-level hooks for mouse and keyboard events
    // For now, we'll simulate some events for testing
    console.log('World Model Observer: Event listening started');
  }

  /**
   * Stop listening for system events
   */
  private stopEventListening(): void {
    console.log('World Model Observer: Event listening stopped');
  }

  /**
   * Simulate user activity for testing purposes
   */
  simulateUserActivity(): void {
    if (!this.isMonitoring) return;

    // Simulate some mouse movements
    setTimeout(() => {
      this.recordMouseEvent('move', { x: 500, y: 300 });
    }, 100);

    setTimeout(() => {
      this.recordMouseEvent('click', { x: 500, y: 300 }, { button: 'left' });
    }, 200);

    // Simulate some keyboard events
    setTimeout(() => {
      this.recordKeyboardEvent('key_down', 'h', []);
      this.recordKeyboardEvent('key_up', 'h', []);
    }, 300);

    setTimeout(() => {
      this.recordKeyboardEvent('key_down', 'e', []);
      this.recordKeyboardEvent('key_up', 'e', []);
    }, 400);
  }
}