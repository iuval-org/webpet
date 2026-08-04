/**
 * Snapshot of user input state in a given frame.
 * Updated every frame by the InputController singleton.
 */
export interface InputState {
  readonly mouseX: number
  readonly mouseY: number
  readonly isClicking: boolean
  readonly scrollY: number
  readonly canvasX: number
  readonly canvasY: number
}

type InputListener = (state: InputState) => void

/**
 * Singleton that tracks mouse position, clicks, and scroll.
 * Emits updates to registered listeners on every frame before the tick.
 */
class InputController {
  private _state: InputState = {
    mouseX: 0,
    mouseY: 0,
    isClicking: false,
    scrollY: 0,
    canvasX: 0,
    canvasY: 0,
  }

  private readonly _listeners: Set<InputListener> = new Set()
  private _canvas: HTMLElement | null = null
  private _boundHandleMove: (e: MouseEvent) => void
  private _boundHandleDown: (e: MouseEvent) => void
  private _boundHandleUp: (e: MouseEvent) => void
  private _boundHandleScroll: (e: Event) => void

  constructor() {
    this._boundHandleMove = this._handleMouseMove.bind(this)
    this._boundHandleDown = this._handleMouseDown.bind(this)
    this._boundHandleUp = this._handleMouseUp.bind(this)
    this._boundHandleScroll = this._handleScroll.bind(this)
  }

  /** Provide the canvas element so mouse coords are normalized to it. */
  setCanvas(canvas: HTMLElement | null): void {
    this._canvas = canvas
  }

  /** Attach global DOM listeners. */
  start(): void {
    window.addEventListener('mousemove', this._boundHandleMove)
    window.addEventListener('mousedown', this._boundHandleDown)
    window.addEventListener('mouseup', this._boundHandleUp)
    window.addEventListener('scroll', this._boundHandleScroll, { passive: true })
  }

  /** Detach all DOM listeners. */
  stop(): void {
    window.removeEventListener('mousemove', this._boundHandleMove)
    window.removeEventListener('mousedown', this._boundHandleDown)
    window.removeEventListener('mouseup', this._boundHandleUp)
    window.removeEventListener('scroll', this._boundHandleScroll)
    this._listeners.clear()
  }

  /** Register a listener that fires before each tick. */
  subscribe(fn: InputListener): () => void {
    this._listeners.add(fn)
    return () => this._listeners.delete(fn)
  }

  /** Get a read-only snapshot of the current input state. */
  getState(): InputState {
    return this._state
  }

  /** Called by the core loop to propagate input before behaviors tick. */
  notifyListeners(): void {
    for (const fn of this._listeners) {
      fn(this._state)
    }
  }

  /* ---- internal handlers ---- */

  private _handleMouseMove(e: MouseEvent): void {
    this._state = { ...this._state, mouseX: e.clientX, mouseY: e.clientY }
    if (this._canvas) {
      const rect = this._canvas.getBoundingClientRect()
      this._state = {
        ...this._state,
        canvasX: e.clientX - rect.left,
        canvasY: e.clientY - rect.top,
      }
    }
  }

  private _handleMouseDown(_e: MouseEvent): void {
    this._state = { ...this._state, isClicking: true }
  }

  private _handleMouseUp(_e: MouseEvent): void {
    this._state = { ...this._state, isClicking: false }
  }

  private _handleScroll(_e: Event): void {
    this._state = { ...this._state, scrollY: window.scrollY }
  }
}

/** Global input controller singleton. */
export const input = new InputController()