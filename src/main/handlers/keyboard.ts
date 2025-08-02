import { uIOhook, UiohookKeyboardEvent } from 'uiohook-napi'
import { EventEmitter } from 'events'

export interface KeyboardEvent {
  type: 'key_down' | 'key_up'
  key: string
  keyCode?: number
  modifiers: {
    ctrl: boolean
    alt: boolean
    shift: boolean
    meta: boolean
  }
  timestamp: number
}

export class KeyboardHandler extends EventEmitter {
  private isTracking: boolean = false
  private keyStates: Map<string, boolean> = new Map()
  private keyCodeToName: Map<number, string> = new Map()
  private keydownHandler?: (e: UiohookKeyboardEvent) => void
  private keyupHandler?: (e: UiohookKeyboardEvent) => void

  constructor() {
    super()
    this.initializeKeyMapping()
  }

  private initializeKeyMapping(): void {
    // Map common key codes to readable names
    // This is a basic mapping - you can extend it as needed
    this.keyCodeToName.set(8, 'BACKSPACE')
    this.keyCodeToName.set(9, 'TAB')
    this.keyCodeToName.set(13, 'ENTER')
    this.keyCodeToName.set(16, 'SHIFT')
    this.keyCodeToName.set(17, 'CTRL')
    this.keyCodeToName.set(18, 'ALT')
    this.keyCodeToName.set(27, 'ESCAPE')
    this.keyCodeToName.set(32, 'SPACE')
    this.keyCodeToName.set(37, 'LEFT')
    this.keyCodeToName.set(38, 'UP')
    this.keyCodeToName.set(39, 'RIGHT')
    this.keyCodeToName.set(40, 'DOWN')
    this.keyCodeToName.set(46, 'DELETE')
    
    // Add letter keys
    for (let i = 65; i <= 90; i++) {
      this.keyCodeToName.set(i, String.fromCharCode(i))
    }
    
    // Add number keys
    for (let i = 48; i <= 57; i++) {
      this.keyCodeToName.set(i, String.fromCharCode(i))
    }
    
    // Add function keys
    for (let i = 112; i <= 123; i++) {
      this.keyCodeToName.set(i, `F${i - 111}`)
    }
  }

  private getKeyName(keycode: number): string {
    return this.keyCodeToName.get(keycode) || `KEY_${keycode}`
  }

  private handleKeyboardEvent(e: UiohookKeyboardEvent, type: 'key_down' | 'key_up'): void {
    if (!this.isTracking) return

    try {
      const keyName = this.getKeyName(e.keycode)
      
      const event: KeyboardEvent = {
        type,
        key: keyName,
        keyCode: e.keycode,
        modifiers: {
          ctrl: e.ctrlKey,
          alt: e.altKey,
          shift: e.shiftKey,
          meta: e.metaKey
        },
        timestamp: Date.now()
      }

      // Track key states to detect held keys
      if (type === 'key_down') {
        this.keyStates.set(keyName, true)
      } else {
        this.keyStates.delete(keyName)
      }

      this.emit('keyboard-event', event)
    } catch (error) {
      this.emit('error', error)
    }
  }

  start(): void {
    if (this.isTracking) return

    this.isTracking = true

    // Create bound handlers so we can remove them later
    this.keydownHandler = (e: UiohookKeyboardEvent) => {
      this.handleKeyboardEvent(e, 'key_down')
    }

    this.keyupHandler = (e: UiohookKeyboardEvent) => {
      this.handleKeyboardEvent(e, 'key_up')
    }

    // Set up event listeners for uiohook
    uIOhook.on('keydown', this.keydownHandler)
    uIOhook.on('keyup', this.keyupHandler)

    // Start the uiohook listener
    try {
      uIOhook.start()
    } catch (error) {
      this.emit('error', error)
      this.isTracking = false
    }
  }

  stop(): void {
    this.isTracking = false

    // Remove event listeners
    if (this.keydownHandler) {
      uIOhook.removeListener('keydown', this.keydownHandler)
      this.keydownHandler = undefined
    }

    if (this.keyupHandler) {
      uIOhook.removeListener('keyup', this.keyupHandler)
      this.keyupHandler = undefined
    }

    // Note: uiohook-napi doesn't appear to have a stop() method in the current version
    // The library manages its lifecycle internally, so we just remove our listeners
    
    this.keyStates.clear()
  }

  // Get currently pressed keys
  getPressedKeys(): string[] {
    return Array.from(this.keyStates.keys())
  }

  // Check if a specific key is currently pressed
  isKeyPressed(key: string): boolean {
    return this.keyStates.has(key)
  }

  // Helper method to format key combinations
  static formatKeyCombination(event: KeyboardEvent): string {
    const parts: string[] = []

    if (event.modifiers.ctrl) parts.push('Ctrl')
    if (event.modifiers.alt) parts.push('Alt')
    if (event.modifiers.shift) parts.push('Shift')
    if (event.modifiers.meta) parts.push('Meta')

    parts.push(event.key)

    return parts.join('+')
  }
}

// Singleton instance
export const keyboardHandler = new KeyboardHandler()
