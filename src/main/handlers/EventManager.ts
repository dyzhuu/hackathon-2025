import { EventEmitter } from 'events'
import { mouseHandler, MouseEvent } from './mouse'
import { keyboardHandler, KeyboardEvent } from './keyboard'

export interface ActivityEvent {
  id: string
  category: 'mouse' | 'keyboard'
  event: MouseEvent | KeyboardEvent
  timestamp: number
}

export interface EventStats {
  totalEvents: number
  mouseEvents: number
  keyboardEvents: number
  startTime: number
  lastEventTime: number
}

export interface ProcessedMouseEvent {
  timestamp: number
  type: string
  x: number
  y: number
  input: string
}

export interface ProcessedKeyboardEvent {
  timestamp: number
  input: string
}

export interface WindowedEvents {
  windowStart: number
  windowEnd: number
  mouseEvents: ProcessedMouseEvent[]
  keyboardEvents: ProcessedKeyboardEvent[]
}

export class EventManager extends EventEmitter {
  private events: ActivityEvent[] = []
  private isRunning: boolean = false
  private startTime: number = 0
  private eventCounter: number = 0
  private statsInterval: NodeJS.Timeout | null = null
  private readonly WINDOW_INTERVAL_MS = 5000 // 5 seconds
  private windowedEvents: ActivityEvent[] = [] // Events for current window

  constructor() {
    super()
  }

  async start(): Promise<void> {
    if (this.isRunning) return

    this.isRunning = true
    this.startTime = Date.now()

    // Set up event listeners
    this.setupMouseHandler()
    this.setupKeyboardHandler()

    // Start all handlers
    mouseHandler.start()
    keyboardHandler.start()

    // Start statistics logging interval
    this.startStatsInterval()

    this.emit('started')
  }

  stop(): void {
    if (!this.isRunning) return

    this.isRunning = false

    // Stop statistics interval
    this.stopStatsInterval()

    // Stop all handlers
    mouseHandler.stop()
    keyboardHandler.stop()

    // Remove listeners
    mouseHandler.removeAllListeners()
    keyboardHandler.removeAllListeners()

    this.emit('stopped')
  }

  private startStatsInterval(): void {
    this.statsInterval = setInterval(() => {
      this.publishWindowData()
    }, this.WINDOW_INTERVAL_MS)
  }

  private stopStatsInterval(): void {
    if (this.statsInterval) {
      clearInterval(this.statsInterval)
      this.statsInterval = null
    }
  }

  private publishWindowData(): void {
    const now = Date.now()
    const windowStart = now - this.WINDOW_INTERVAL_MS

    // Get events from the last window
    const windowEvents = this.windowedEvents.filter((e) => e.timestamp >= windowStart)

    // Process events into the requested format
    const processedData = this.processEventsForWindow(windowEvents, windowStart, now)

    // Emit window data for subscribers (pub-sub pattern)
    this.emit('window-data', processedData)

    // Clear the windowed events for the next period
    this.windowedEvents = this.windowedEvents.filter((e) => e.timestamp > windowStart)
  }

  private processEventsForWindow(
    events: ActivityEvent[],
    windowStart: number,
    windowEnd: number
  ): WindowedEvents {
    const mouseEvents: ProcessedMouseEvent[] = []
    const keyboardEvents: ProcessedKeyboardEvent[] = []

    for (const event of events) {
      if (event.category === 'mouse') {
        const mouseEvent = event.event as MouseEvent
        const processedEvent: ProcessedMouseEvent = {
          type: mouseEvent.type,
          x: mouseEvent.position.x,
          y: mouseEvent.position.y,
          input: this.formatMouseInput(mouseEvent),
          timestamp: event.timestamp
        }
        mouseEvents.push(processedEvent)
      } else if (event.category === 'keyboard') {
        const keyboardEvent = event.event as KeyboardEvent
        const processedEvent: ProcessedKeyboardEvent = {
          input: this.formatKeyboardInput(keyboardEvent),
          timestamp: event.timestamp
        }
        keyboardEvents.push(processedEvent)
      }
    }

    return {
      windowStart,
      windowEnd,
      mouseEvents,
      keyboardEvents
    }
  }

  private formatMouseInput(event: MouseEvent): string {
    const parts: string[] = []

    // Add modifiers
    if (event.modifiers.ctrl) parts.push('Ctrl')
    if (event.modifiers.shift) parts.push('Shift')
    if (event.modifiers.alt) parts.push('Alt')
    if (event.modifiers.meta) parts.push('Meta')

    // Add action based on type and button
    switch (event.type) {
      case 'mouse_click':
        parts.push(`${event.button || 'left'}Click`)
        if (event.clicks && event.clicks > 1) {
          parts[parts.length - 1] = `${event.clicks}x${parts[parts.length - 1]}`
        }
        break
      case 'mouse_down':
        parts.push(`${event.button || 'left'}Down`)
        break
      case 'mouse_up':
        parts.push(`${event.button || 'left'}Up`)
        break
      case 'mouse_move':
        parts.push('Move')
        break
      case 'mouse_wheel':
        parts.push(`Wheel${event.wheelDelta && event.wheelDelta > 0 ? 'Up' : 'Down'}`)
        break
    }

    return parts.join('+')
  }

  private formatKeyboardInput(event: KeyboardEvent): string {
    // Only format key_down events for input representation
    if (event.type !== 'key_down') {
      return ''
    }

    const modifiers: string[] = []
    if (event.modifiers.ctrl) modifiers.push('Ctrl')
    if (event.modifiers.alt) modifiers.push('Alt')
    if (event.modifiers.shift) modifiers.push('Shift')
    if (event.modifiers.meta) modifiers.push('Meta')

    // For special keys or key combinations, use full notation
    const parts = [...modifiers, event.key]
    return parts.join('+')
  }

  private setupMouseHandler(): void {
    mouseHandler.on('mouse-event', (event: MouseEvent) => {
      this.addEvent('mouse', event)
    })

    mouseHandler.on('error', (error) => {
      console.error('❌ Mouse handler error:', error)
      this.emit('error', { handler: 'mouse', error })
    })
  }

  private setupKeyboardHandler(): void {
    keyboardHandler.on('keyboard-event', (event: KeyboardEvent) => {
      this.addEvent('keyboard', event)
    })

    keyboardHandler.on('error', (error) => {
      this.emit('error', { handler: 'keyboard', error })
    })
  }

  private addEvent(category: 'mouse' | 'keyboard', event: MouseEvent | KeyboardEvent): void {
    const activityEvent: ActivityEvent = {
      id: `${category}_${++this.eventCounter}`,
      category,
      event,
      timestamp: event.timestamp
    }

    // Add to both long-term storage and windowed events
    this.events.push(activityEvent)
    this.windowedEvents.push(activityEvent)

    // Emit the event for real-time processing
    this.emit('activity-event', activityEvent)
  }

  getStats(): EventStats {
    const stats: EventStats = {
      totalEvents: this.events.length,
      mouseEvents: 0,
      keyboardEvents: 0,
      startTime: this.startTime,
      lastEventTime: 0
    }

    for (const event of this.events) {
      switch (event.category) {
        case 'mouse':
          stats.mouseEvents++
          break
        case 'keyboard':
          stats.keyboardEvents++
          break
      }

      if (event.timestamp > stats.lastEventTime) {
        stats.lastEventTime = event.timestamp
      }
    }

    return stats
  }
}

// Singleton instance
export const eventManager = new EventManager()
