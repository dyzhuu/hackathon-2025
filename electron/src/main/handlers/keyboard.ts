import { EventEmitter } from 'events';
import { uIOhook, UiohookKey, UiohookKeyboardEvent } from 'uiohook-napi';

export interface KeyboardEvent {
  type: 'key_down' | 'key_up';
  key: string;
  keyCode: number;
  modifiers: {
    ctrl: boolean;
    alt: boolean;
    shift: boolean;
    meta: boolean;
  };
  timestamp: number;
}

export class KeyboardHandler extends EventEmitter {
  private isTracking: boolean = false;
  private keyStates: Map<number, boolean> = new Map();

  constructor() {
    super();
    this.setupUiohookListeners();
  }

  start(): void {
    if (this.isTracking) return;

    this.isTracking = true;

    try {
      uIOhook.start();
      console.log('🚀 Global keyboard tracking started with uiohook-napi');
      console.log('⌨️ Keyboard events will be logged with detailed information');
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
      console.log('Global keyboard tracking stopped');
    } catch (error) {
      console.error('Failed to stop uiohook-napi:', error);
    }

    this.keyStates.clear();
  }

  private setupUiohookListeners(): void {
    // Keyboard down events
    uIOhook.on('keydown', (event: UiohookKeyboardEvent) => {
      if (!this.isTracking) return;

      const keyboardEvent: KeyboardEvent = {
        type: 'key_down',
        key: this.mapKeyCode(event.keycode),
        keyCode: event.keycode,
        modifiers: {
          ctrl: event.ctrlKey,
          alt: event.altKey,
          shift: event.shiftKey,
          meta: event.metaKey
        },
        timestamp: Date.now()
      };

      // Track key states to detect held keys
      this.keyStates.set(event.keycode, true);

      this.emit('keyboard-event', keyboardEvent);
    });
  }

  private mapKeyCode(keycode: number): string {
    // Basic mapping of common keycodes to readable names
    // You can extend this mapping based on your needs
    const keyMap: { [key: number]: string } = {
      [UiohookKey.Backspace]: 'Backspace',
      [UiohookKey.Tab]: 'Tab',
      [UiohookKey.Enter]: 'Enter',
      [UiohookKey.CapsLock]: 'CapsLock',
      [UiohookKey.Escape]: 'Escape',
      [UiohookKey.Space]: 'Space',
      [UiohookKey.PageUp]: 'PageUp',
      [UiohookKey.PageDown]: 'PageDown',
      [UiohookKey.End]: 'End',
      [UiohookKey.Home]: 'Home',
      [UiohookKey.ArrowLeft]: 'ArrowLeft',
      [UiohookKey.ArrowUp]: 'ArrowUp',
      [UiohookKey.ArrowRight]: 'ArrowRight',
      [UiohookKey.ArrowDown]: 'ArrowDown',
      [UiohookKey.Insert]: 'Insert',
      [UiohookKey.Delete]: 'Delete',
      [UiohookKey['0']]: '0',
      [UiohookKey['1']]: '1',
      [UiohookKey['2']]: '2',
      [UiohookKey['3']]: '3',
      [UiohookKey['4']]: '4',
      [UiohookKey['5']]: '5',
      [UiohookKey['6']]: '6',
      [UiohookKey['7']]: '7',
      [UiohookKey['8']]: '8',
      [UiohookKey['9']]: '9',
      [UiohookKey.A]: 'A',
      [UiohookKey.B]: 'B',
      [UiohookKey.C]: 'C',
      [UiohookKey.D]: 'D',
      [UiohookKey.E]: 'E',
      [UiohookKey.F]: 'F',
      [UiohookKey.G]: 'G',
      [UiohookKey.H]: 'H',
      [UiohookKey.I]: 'I',
      [UiohookKey.J]: 'J',
      [UiohookKey.K]: 'K',
      [UiohookKey.L]: 'L',
      [UiohookKey.M]: 'M',
      [UiohookKey.N]: 'N',
      [UiohookKey.O]: 'O',
      [UiohookKey.P]: 'P',
      [UiohookKey.Q]: 'Q',
      [UiohookKey.R]: 'R',
      [UiohookKey.S]: 'S',
      [UiohookKey.T]: 'T',
      [UiohookKey.U]: 'U',
      [UiohookKey.V]: 'V',
      [UiohookKey.W]: 'W',
      [UiohookKey.X]: 'X',
      [UiohookKey.Y]: 'Y',
      [UiohookKey.Z]: 'Z',
      [UiohookKey.Meta]: 'Meta',
      [UiohookKey.F1]: 'F1',
      [UiohookKey.F2]: 'F2',
      [UiohookKey.F3]: 'F3',
      [UiohookKey.F4]: 'F4',
      [UiohookKey.F5]: 'F5',
      [UiohookKey.F6]: 'F6',
      [UiohookKey.F7]: 'F7',
      [UiohookKey.F8]: 'F8',
      [UiohookKey.F9]: 'F9',
      [UiohookKey.F10]: 'F10',
      [UiohookKey.F11]: 'F11',
      [UiohookKey.F12]: 'F12',
      [UiohookKey.F13]: 'F13',
      [UiohookKey.F14]: 'F14',
      [UiohookKey.F15]: 'F15',
      [UiohookKey.F16]: 'F16',
      [UiohookKey.F17]: 'F17',
      [UiohookKey.F18]: 'F18',
      [UiohookKey.F19]: 'F19',
      [UiohookKey.F20]: 'F20',
      [UiohookKey.F21]: 'F21',
      [UiohookKey.F22]: 'F22',
      [UiohookKey.F23]: 'F23',
      [UiohookKey.F24]: 'F24',
      [UiohookKey.Semicolon]: ';',
      [UiohookKey.Equal]: '=',
      [UiohookKey.Comma]: ',',
      [UiohookKey.Minus]: '-',
      [UiohookKey.Period]: '.',
      [UiohookKey.Slash]: '/',
      [UiohookKey.Backquote]: '`',
      [UiohookKey.BracketLeft]: '[',
      [UiohookKey.Backslash]: '\\',
      [UiohookKey.BracketRight]: ']',
      [UiohookKey.Quote]: "'",
      [UiohookKey.Ctrl]: 'Ctrl',
      [UiohookKey.CtrlRight]: 'CtrlRight',
      [UiohookKey.Alt]: 'Alt',
      [UiohookKey.AltRight]: 'AltRight',
      [UiohookKey.Shift]: 'Shift',
      [UiohookKey.ShiftRight]: 'ShiftRight',
      [UiohookKey.MetaRight]: 'MetaRight',
      [UiohookKey.NumLock]: 'NumLock',
      [UiohookKey.ScrollLock]: 'ScrollLock',
      [UiohookKey.PrintScreen]: 'PrintScreen'
    };

    return keyMap[keycode] || `Key${keycode}`;
  }

  // Get currently pressed keys
  getPressedKeys(): number[] {
    return Array.from(this.keyStates.keys());
  }

  // Check if a specific key is currently pressed
  isKeyPressed(keyCode: number): boolean {
    return this.keyStates.has(keyCode);
  }

  // Helper method to check if a key by name is pressed
  isKeyNamePressed(keyName: string): boolean {
    for (const [keyCode] of this.keyStates) {
      if (this.mapKeyCode(keyCode) === keyName) {
        return true;
      }
    }
    return false;
  }

  // Helper method to format key combinations
  static formatKeyCombination(event: KeyboardEvent): string {
    const parts: string[] = [];

    if (event.modifiers.ctrl) parts.push('Ctrl');
    if (event.modifiers.alt) parts.push('Alt');
    if (event.modifiers.shift) parts.push('Shift');
    if (event.modifiers.meta) parts.push('Meta');

    parts.push(event.key);

    return parts.join('+');
  }
}

// Singleton instance
export const keyboardHandler = new KeyboardHandler();
