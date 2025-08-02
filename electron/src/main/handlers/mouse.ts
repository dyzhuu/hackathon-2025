import { EventEmitter } from 'events';
import { uIOhook, UiohookMouseEvent, UiohookWheelEvent } from 'uiohook-napi';

export interface MouseEvent {
  eventType: 'move' | 'click' | 'scroll';
  position: { x: number; y: number };
  button?: 'left' | 'right' | 'middle';
  wheelDelta?: number;
  modifiers: {
    alt: boolean;
    ctrl: boolean;
    meta: boolean;
    shift: boolean;
  };
  clicks?: number;
  timestamp: number;
  // Additional data for movement analysis
  velocity?: number;
  distance?: number;
  direction?: number; // angle in radians
}

export class MouseHandler extends EventEmitter {
  private isTracking: boolean = false;
  private events: MouseEvent[] = [];
  private readonly maxEvents: number = 10000; // Prevent memory overflow

  // Movement tracking for aggregation
  private lastPosition: { x: number; y: number } | null = null;
  private lastMoveTime: number = 0;
  private readonly moveThrottleMs: number = 100; // Emit move events every 100ms

  // Scroll tracking for aggregation
  private lastScrollTime: number = 0;
  private readonly scrollThrottleMs: number = 150; // Emit scroll events every 150ms
  private pendingScrollDelta: number = 0;

  constructor() {
    super();
    this.setupUiohookListeners();
  }

  start(): void {
    if (this.isTracking) return;

    this.isTracking = true;

    try {
      uIOhook.start();
      console.log('🚀 Global mouse tracking started with uiohook-napi');
    } catch (error) {
      console.error('❌ Failed to start uiohook-napi:', error);
      this.isTracking = false;
      throw error;
    }
  }

  stop(): void {
    if (!this.isTracking) return;

    this.isTracking = false;

    try {
      uIOhook.stop();
      console.log('Global mouse tracking stopped');
    } catch (error) {
      console.error('Failed to stop uiohook-napi:', error);
    }
  }

  private setupUiohookListeners(): void {
    // Mouse click events
    uIOhook.on('mousedown', (event: UiohookMouseEvent) => {
      if (!this.isTracking) return;

      const mouseEvent: MouseEvent = {
        eventType: 'click',
        position: { x: event.x, y: event.y },
        button: this.mapButton(event.button),
        modifiers: {
          alt: event.altKey,
          ctrl: event.ctrlKey,
          meta: event.metaKey,
          shift: event.shiftKey
        },
        clicks: event.clicks,
        timestamp: Date.now()
      };

      this.addEvent(mouseEvent);
      this.emit('mouse-event', mouseEvent);
    });

    // Mouse down events
    // uIOhook.on('mousedown', (event: UiohookMouseEvent) => {
    //   if (!this.isTracking) return

    //   const mouseEvent: MouseEvent = {
    //     type: 'mouse_down',
    //     position: { x: event.x, y: event.y },
    //     button: this.mapButton(event.button),
    //     modifiers: {
    //       alt: event.altKey,
    //       ctrl: event.ctrlKey,
    //       meta: event.metaKey,
    //       shift: event.shiftKey
    //     },
    //     clicks: event.clicks,
    //     timestamp: Date.now()
    //   }

    //   this.addEvent(mouseEvent)
    //   this.emit('mouse-event', mouseEvent)
    // })

    // Mouse up events
    // uIOhook.on('mouseup', (event: UiohookMouseEvent) => {
    //   if (!this.isTracking) return

    //   const mouseEvent: MouseEvent = {
    //     type: 'mouse_up',
    //     position: { x: event.x, y: event.y },
    //     button: this.mapButton(event.button),
    //     modifiers: {
    //       alt: event.altKey,
    //       ctrl: event.ctrlKey,
    //       meta: event.metaKey,
    //       shift: event.shiftKey
    //     },
    //     clicks: event.clicks,
    //     timestamp: Date.now()
    //   }

    //   this.addEvent(mouseEvent)
    //   this.emit('mouse-event', mouseEvent)
    // })

    // Mouse move events (throttled and aggregated to prevent overwhelming)
    uIOhook.on('mousemove', (event: UiohookMouseEvent) => {
      if (!this.isTracking) return;

      const now = Date.now();
      const currentPosition = { x: event.x, y: event.y };

      // Throttle move events and calculate movement statistics
      if (now - this.lastMoveTime >= this.moveThrottleMs) {
        let velocity = 0;
        let distance = 0;
        let direction = 0;

        if (this.lastPosition && this.lastMoveTime > 0) {
          // Calculate distance moved
          distance = Math.sqrt(
            Math.pow(currentPosition.x - this.lastPosition.x, 2) +
            Math.pow(currentPosition.y - this.lastPosition.y, 2)
          );

          // Calculate velocity (pixels per millisecond)
          const timeDiff = now - this.lastMoveTime;
          velocity = timeDiff > 0 ? distance / timeDiff : 0;

          // Calculate direction (angle in radians)
          if (distance > 0) {
            direction = Math.atan2(
              currentPosition.y - this.lastPosition.y,
              currentPosition.x - this.lastPosition.x
            );
          }
        }

        const mouseEvent: MouseEvent = {
          eventType: 'move',
          position: currentPosition,
          modifiers: {
            alt: event.altKey,
            ctrl: event.ctrlKey,
            meta: event.metaKey,
            shift: event.shiftKey
          },
          timestamp: now,
          velocity,
          distance,
          direction
        };

        this.addEvent(mouseEvent);
        this.emit('mouse-event', mouseEvent);

        this.lastPosition = currentPosition;
        this.lastMoveTime = now;
      } else {
        // Just update position for next calculation
        this.lastPosition = currentPosition;
      }
    });

    // Mouse wheel events (aggregated to reduce noise)
    uIOhook.on('wheel', (event: UiohookWheelEvent) => {
      if (!this.isTracking) return;

      const now = Date.now();

      // Accumulate scroll delta
      this.pendingScrollDelta += event.rotation || 0;

      // Only emit aggregated scroll events at intervals
      if (now - this.lastScrollTime >= this.scrollThrottleMs) {
        const mouseEvent: MouseEvent = {
          eventType: 'scroll',
          position: { x: event.x, y: event.y },
          wheelDelta: this.pendingScrollDelta,
          modifiers: {
            alt: event.altKey,
            ctrl: event.ctrlKey,
            meta: event.metaKey,
            shift: event.shiftKey
          },
          timestamp: now
        };

        this.addEvent(mouseEvent);
        this.emit('mouse-event', mouseEvent);

        // Reset accumulation
        this.pendingScrollDelta = 0;
        this.lastScrollTime = now;
      }
    });
  }

  private mapButton(buttonCode: unknown): 'left' | 'right' | 'middle' {
    const button = typeof buttonCode === 'number' ? buttonCode : 1;
    switch (button) {
      case 1:
        return 'left';
      case 2:
        return 'right';
      case 3:
        return 'middle';
      default:
        return 'left';
    }
  }

  private addEvent(event: MouseEvent): void {
    this.events.push(event);

    // Keep array size manageable
    // TODO: maybe not in memory?
    if (this.events.length > this.maxEvents) {
      this.events = this.events.slice(-this.maxEvents + 1000); // Keep last 9000 events
    }
  }

  getEvents(): MouseEvent[] {
    return [...this.events]; // Return copy to prevent external modification
  }

  getEventCount(): number {
    return this.events.length;
  }

  clearEvents(): void {
    this.events = [];
  }

  // Configuration methods
  setPositionCheckInterval(): void {
    console.warn('Position check interval not configurable with uiohook-napi global tracking');
  }

  setMovementThreshold(): void {
    console.warn('Movement threshold not configurable with uiohook-napi global tracking');
  }
}

// Singleton instance
export const mouseHandler = new MouseHandler();
