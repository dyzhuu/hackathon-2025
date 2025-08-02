import { EventEmitter } from 'events'
import { uIOhook, UiohookMouseEvent, UiohookWheelEvent } from 'uiohook-napi'

export interface MouseEvent {
  type: 'mouse_move' | 'mouse_click' | 'mouse_down' | 'mouse_up' | 'mouse_wheel'
  position: { x: number; y: number }
  button?: 'left' | 'right' | 'middle'
  wheelDelta?: number
  modifiers: {
    alt: boolean
    ctrl: boolean
    meta: boolean
    shift: boolean
  }
  clicks?: number
  timestamp: number
}

export class MouseHandler extends EventEmitter {
  private isTracking: boolean = false
  private events: MouseEvent[] = []
  private readonly maxEvents: number = 10000 // Prevent memory overflow

  constructor() {
    super()
    this.setupUiohookListeners()
  }

  start(): void {
    if (this.isTracking) return

    this.isTracking = true

    try {
      uIOhook.start()
      console.log('🚀 Global mouse tracking started with uiohook-napi')
      console.log('🎯 Mouse events will be logged with detailed information')
    } catch (error) {
      console.error('❌ Failed to start uiohook-napi:', error)
      this.isTracking = false
      throw error
    }
  }

  stop(): void {
    if (!this.isTracking) return

    this.isTracking = false

    try {
      uIOhook.stop()
      console.log('Global mouse tracking stopped')
    } catch (error) {
      console.error('Failed to stop uiohook-napi:', error)
    }
  }

  private setupUiohookListeners(): void {
    // Mouse click events
    uIOhook.on('click', (event: UiohookMouseEvent) => {
      if (!this.isTracking) return

      const mouseEvent: MouseEvent = {
        type: 'mouse_click',
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
      }

      console.log('🖱️ Mouse CLICK:', {
        position: mouseEvent.position,
        button: mouseEvent.button,
        clicks: mouseEvent.clicks,
        modifiers: mouseEvent.modifiers
      })
      this.addEvent(mouseEvent)
      this.emit('mouse-event', mouseEvent)
    })

    // Mouse down events
    uIOhook.on('mousedown', (event: UiohookMouseEvent) => {
      if (!this.isTracking) return

      const mouseEvent: MouseEvent = {
        type: 'mouse_down',
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
      }

      console.log('🖱️ Mouse DOWN:', {
        position: mouseEvent.position,
        button: mouseEvent.button,
        modifiers: mouseEvent.modifiers
      })
      this.addEvent(mouseEvent)
      this.emit('mouse-event', mouseEvent)
    })

    // Mouse up events
    uIOhook.on('mouseup', (event: UiohookMouseEvent) => {
      if (!this.isTracking) return

      const mouseEvent: MouseEvent = {
        type: 'mouse_up',
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
      }

      console.log('🖱️ Mouse UP:', {
        position: mouseEvent.position,
        button: mouseEvent.button,
        modifiers: mouseEvent.modifiers
      })
      this.addEvent(mouseEvent)
      this.emit('mouse-event', mouseEvent)
    })

    // Mouse move events (throttled to prevent overwhelming)
    let lastMoveTime = 0
    const moveThrottleMs = 50 // Only emit move events every 50ms

    uIOhook.on('mousemove', (event: UiohookMouseEvent) => {
      if (!this.isTracking) return

      const now = Date.now()
      if (now - lastMoveTime < moveThrottleMs) return
      lastMoveTime = now

      const mouseEvent: MouseEvent = {
        type: 'mouse_move',
        position: { x: event.x, y: event.y },
        modifiers: {
          alt: event.altKey,
          ctrl: event.ctrlKey,
          meta: event.metaKey,
          shift: event.shiftKey
        },
        timestamp: now
      }

      console.log('🖱️ Mouse MOVE:', {
        position: mouseEvent.position,
        modifiers: mouseEvent.modifiers
      })
      this.addEvent(mouseEvent)
      this.emit('mouse-event', mouseEvent)
    })

    // Mouse wheel events
    uIOhook.on('wheel', (event: UiohookWheelEvent) => {
      if (!this.isTracking) return

      const mouseEvent: MouseEvent = {
        type: 'mouse_wheel',
        position: { x: event.x, y: event.y },
        wheelDelta: event.rotation,
        modifiers: {
          alt: event.altKey,
          ctrl: event.ctrlKey,
          meta: event.metaKey,
          shift: event.shiftKey
        },
        timestamp: Date.now()
      }

      console.log('🖱️ Mouse WHEEL:', {
        position: mouseEvent.position,
        wheelDelta: mouseEvent.wheelDelta,
        modifiers: mouseEvent.modifiers
      })
      this.addEvent(mouseEvent)
      this.emit('mouse-event', mouseEvent)
    })
  }

  private mapButton(buttonCode: unknown): 'left' | 'right' | 'middle' {
    const button = typeof buttonCode === 'number' ? buttonCode : 1
    switch (button) {
      case 1:
        return 'left'
      case 2:
        return 'right'
      case 3:
        return 'middle'
      default:
        return 'left'
    }
  }

  private addEvent(event: MouseEvent): void {
    this.events.push(event)

    console.log(`📊 Mouse Events: ${this.events.length} total (type: ${event.type})`)

    // Keep array size manageable
    if (this.events.length > this.maxEvents) {
      this.events = this.events.slice(-this.maxEvents + 1000) // Keep last 9000 events
      console.log(`🧹 Mouse Events: Trimmed to ${this.events.length} events`)
    }
  }

  getEvents(): MouseEvent[] {
    return [...this.events] // Return copy to prevent external modification
  }

  getEventCount(): number {
    return this.events.length
  }

  clearEvents(): void {
    this.events = []
  }

  // Configuration methods
  setPositionCheckInterval(): void {
    console.warn('Position check interval not configurable with uiohook-napi global tracking')
  }

  setMovementThreshold(): void {
    console.warn('Movement threshold not configurable with uiohook-napi global tracking')
  }
}

// Singleton instance
export const mouseHandler = new MouseHandler()
