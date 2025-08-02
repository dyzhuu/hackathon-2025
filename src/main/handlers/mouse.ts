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

export interface MouseStats {
  totalEvents: number
  eventTypeCounts: {
    mouseMove: number
    mouseClick: number
    mouseDown: number
    mouseUp: number
    mouseWheel: number
  }
  buttonUsage: {
    left: number
    right: number
    middle: number
  }
  totalDistance: number
  averageMovementSpeed: number
  clicksPerMinute: number
  modifierUsage: {
    alt: number
    ctrl: number
    meta: number
    shift: number
  }
  screenBounds: {
    minX: number
    maxX: number
    minY: number
    maxY: number
  } | null
}

export class MouseHandler extends EventEmitter {
  private isTracking: boolean = false
  private events: MouseEvent[] = []
  private readonly maxEvents: number = 10000 // Prevent memory overflow
  private eventTypeCounts = {
    mouseMove: 0,
    mouseClick: 0,
    mouseDown: 0,
    mouseUp: 0,
    mouseWheel: 0
  }
  private buttonUsage = { left: 0, right: 0, middle: 0 }
  private modifierUsage = { alt: 0, ctrl: 0, meta: 0, shift: 0 }
  private totalDistance: number = 0
  private lastPosition: { x: number; y: number } | null = null
  private screenBounds: { minX: number; maxX: number; minY: number; maxY: number } | null = null
  private startTime: number = 0

  constructor() {
    super()
    this.setupUiohookListeners()
  }

  start(): void {
    if (this.isTracking) return

    this.isTracking = true
    this.startTime = Date.now()

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

    // Update event type counts
    switch (event.type) {
      case 'mouse_move':
        this.eventTypeCounts.mouseMove++
        break
      case 'mouse_click':
        this.eventTypeCounts.mouseClick++
        break
      case 'mouse_down':
        this.eventTypeCounts.mouseDown++
        break
      case 'mouse_up':
        this.eventTypeCounts.mouseUp++
        break
      case 'mouse_wheel':
        this.eventTypeCounts.mouseWheel++
        break
    }

    // Update button usage
    if (event.button) {
      this.buttonUsage[event.button]++
    }

    // Track modifier usage
    if (event.modifiers.alt) this.modifierUsage.alt++
    if (event.modifiers.ctrl) this.modifierUsage.ctrl++
    if (event.modifiers.meta) this.modifierUsage.meta++
    if (event.modifiers.shift) this.modifierUsage.shift++

    // Calculate movement distance
    if (event.type === 'mouse_move' && this.lastPosition) {
      const distance = Math.sqrt(
        Math.pow(event.position.x - this.lastPosition.x, 2) +
        Math.pow(event.position.y - this.lastPosition.y, 2)
      )
      this.totalDistance += distance
    }
    this.lastPosition = { ...event.position }

    // Update screen bounds
    if (!this.screenBounds) {
      this.screenBounds = {
        minX: event.position.x,
        maxX: event.position.x,
        minY: event.position.y,
        maxY: event.position.y
      }
    } else {
      this.screenBounds.minX = Math.min(this.screenBounds.minX, event.position.x)
      this.screenBounds.maxX = Math.max(this.screenBounds.maxX, event.position.x)
      this.screenBounds.minY = Math.min(this.screenBounds.minY, event.position.y)
      this.screenBounds.maxY = Math.max(this.screenBounds.maxY, event.position.y)
    }

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

  getStats(): MouseStats {
    const sessionTimeMinutes = this.startTime ? (Date.now() - this.startTime) / (1000 * 60) : 0
    const clicksPerMinute = sessionTimeMinutes > 0 ? this.eventTypeCounts.mouseClick / sessionTimeMinutes : 0
    
    const moveEvents = this.eventTypeCounts.mouseMove
    const sessionTimeSeconds = sessionTimeMinutes * 60
    const averageMovementSpeed = moveEvents > 0 && sessionTimeSeconds > 0 ? 
      this.totalDistance / sessionTimeSeconds : 0

    return {
      totalEvents: this.events.length,
      eventTypeCounts: { ...this.eventTypeCounts },
      buttonUsage: { ...this.buttonUsage },
      totalDistance: this.totalDistance,
      averageMovementSpeed,
      clicksPerMinute,
      modifierUsage: { ...this.modifierUsage },
      screenBounds: this.screenBounds ? { ...this.screenBounds } : null
    }
  }

  clearEvents(): void {
    this.events = []
    this.eventTypeCounts = {
      mouseMove: 0,
      mouseClick: 0,
      mouseDown: 0,
      mouseUp: 0,
      mouseWheel: 0
    }
    this.buttonUsage = { left: 0, right: 0, middle: 0 }
    this.modifierUsage = { alt: 0, ctrl: 0, meta: 0, shift: 0 }
    this.totalDistance = 0
    this.lastPosition = null
    this.screenBounds = null
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
