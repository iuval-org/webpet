/**
 * RenderMode determines how the Renderer draws its output.
 * - `canvas`: uses a standard <canvas> element with 2D context.
 * - `div`: creates a <div> suitable for SVG / DOM children.
 */
export type RenderMode = 'canvas' | 'div'

/** Configuration for creating a Renderer. */
export interface RendererConfig {
  readonly container: HTMLElement
  readonly width?: number
  readonly height?: number
  readonly mode?: RenderMode
}

/**
 * Base renderer that manages a canvas (2D context) or a div container.
 * Handles resize, clear, and provides the drawing surface to behaviors.
 */
export class Renderer {
  readonly mode: RenderMode
  readonly container: HTMLElement
  readonly canvas: HTMLCanvasElement | null
  readonly div: HTMLDivElement | null
  readonly ctx: CanvasRenderingContext2D | null

  private _width: number
  private _height: number

  constructor(config: RendererConfig) {
    this.mode = config.mode ?? 'canvas'
    this.container = config.container
    this._width = config.width ?? config.container.clientWidth
    this._height = config.height ?? config.container.clientHeight

    if (this.mode === 'canvas') {
      const cvs = document.createElement('canvas')
      cvs.width = this._width
      cvs.height = this._height
      cvs.style.display = 'block'
      config.container.appendChild(cvs)
      this.canvas = cvs
      this.div = null
      this.ctx = cvs.getContext('2d')
    } else {
      const el = document.createElement('div')
      el.style.width = `${this._width}px`
      el.style.height = `${this._height}px`
      el.style.position = 'relative'
      el.style.overflow = 'hidden'
      config.container.appendChild(el)
      this.div = el
      this.canvas = null
      this.ctx = null
    }
  }

  /** Current render width in pixels. */
  get width(): number {
    return this._width
  }

  /** Current render height in pixels. */
  get height(): number {
    return this._height
  }

  /** Resize the drawing surface. */
  resize(w: number, h: number): void {
    this._width = w
    this._height = h
    if (this.canvas) {
      this.canvas.width = w
      this.canvas.height = h
    }
    if (this.div) {
      this.div.style.width = `${w}px`
      this.div.style.height = `${h}px`
    }
  }

  /** Clear the entire drawing surface. */
  clear(): void {
    if (this.ctx) {
      this.ctx.clearRect(0, 0, this._width, this._height)
    }
    if (this.div) {
      this.div.innerHTML = ''
    }
  }

  /** Remove the canvas/div from the DOM and release references. */
  destroy(): void {
    if (this.canvas?.parentNode) {
      this.canvas.parentNode.removeChild(this.canvas)
    }
    if (this.div?.parentNode) {
      this.div.parentNode.removeChild(this.div)
    }
  }
}