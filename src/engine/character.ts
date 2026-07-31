/**
 /** Character system — modular pet body presets with gradient colors,
  * accessories, and canvas drawing functions.
  *
  * Inspired by the classic-web-dashboard mascot demo.
  *
  * @module engine/character
  */

 /* -------------------------------------------------------- */
 /*  Types                                                  */
 /* -------------------------------------------------------- */

export type CharacterId =
  | 'gloop'
  | 'robo'
  | 'goober'
  | 'kitty'
  | 'chick'
  | 'alien'

export type AccessoryType = 'ears' | 'antenna' | 'none'

export interface CharacterDef {
  readonly id: CharacterId
  readonly name: string
  readonly label: string
  readonly emoji: string
  /** Radial gradient stops for the body blob. */
  readonly bodyStops: [string, string, string]
  /** Eyelid fill color (typically body stop 2). */
  readonly eyelidColor: string
  /** Iris radial gradient stops. */
  readonly irisStops: [string, string, string]
  /** Accessory type. */
  readonly accessory: AccessoryType
}

/* -------------------------------------------------------- */
/*  Character definitions                                   */
/* -------------------------------------------------------- */

export const CHARACTERS: Record<CharacterId, CharacterDef> = {
  gloop: {
    id: 'gloop',
    name: 'Gloop',
    label: 'Gloop',
    emoji: '👾',
    bodyStops: ['#a855f7', '#7e22ce', '#581c87'],
    eyelidColor: '#7e22ce',
    irisStops: ['#38bdf8', '#0284c7', '#0369a1'],
    accessory: 'ears',
  },
  robo: {
    id: 'robo',
    name: 'Robo Bot',
    label: 'Robo Bot',
    emoji: '🤖',
    bodyStops: ['#38bdf8', '#0284c7', '#075985'],
    eyelidColor: '#0284c7',
    irisStops: ['#facc15', '#eab308', '#ca8a04'],
    accessory: 'antenna',
  },
  goober: {
    id: 'goober',
    name: 'Goober',
    label: 'Goober',
    emoji: '👹',
    bodyStops: ['#34d399', '#059669', '#064e3b'],
    eyelidColor: '#059669',
    irisStops: ['#f43f5e', '#e11d48', '#9f1239'],
    accessory: 'ears',
  },
  kitty: {
    id: 'kitty',
    name: 'Neko Kitty',
    label: 'Kitty',
    emoji: '🐱',
    bodyStops: ['#fbbf24', '#d97706', '#78350f'],
    eyelidColor: '#d97706',
    irisStops: ['#34d399', '#059669', '#064e3b'],
    accessory: 'ears',
  },
  chick: {
    id: 'chick',
    name: 'Sunny Bird',
    label: 'Bird',
    emoji: '🐤',
    bodyStops: ['#fde047', '#eab308', '#a16207'],
    eyelidColor: '#eab308',
    irisStops: ['#a855f7', '#7e22ce', '#581c87'],
    accessory: 'none',
  },
  alien: {
    id: 'alien',
    name: 'Alien ZORP',
    label: 'ZORP',
    emoji: '👽',
    bodyStops: ['#6366f1', '#4338ca', '#312e81'],
    eyelidColor: '#4338ca',
    irisStops: ['#4ade80', '#16a34a', '#14532d'],
    accessory: 'antenna',
  },
}

export const CHARACTER_LIST: CharacterDef[] = Object.values(CHARACTERS)

/* -------------------------------------------------------- */
/*  Drawing functions                                       */
/* -------------------------------------------------------- */

/** Current character state, set externally. */
let _currentCharacter: CharacterId = 'gloop'

export function setCharacter(c: CharacterId): void {
  _currentCharacter = c
}

export function getCharacter(): CharacterId {
  return _currentCharacter
}

export function getCharacterDef(id?: CharacterId): CharacterDef {
  return CHARACTERS[id ?? _currentCharacter] ?? CHARACTERS.gloop
}

/**
 * Draw the character body (blob shape + gradient) on the canvas.
 */
export function drawBody(
  ctx: CanvasRenderingContext2D,
  size: number,
  character?: CharacterDef,
): void {
  const c = character ?? getCharacterDef()
  const cx = size / 2
  const cy = size / 2
  const radius = size * 0.42

  /* Radial gradient */
  const grad = ctx.createRadialGradient(
    cx - radius * 0.15, cy - radius * 0.2, 0,
    cx, cy, radius,
  )
  grad.addColorStop(0, c.bodyStops[0])
  grad.addColorStop(0.6, c.bodyStops[1])
  grad.addColorStop(1, c.bodyStops[2])

  ctx.beginPath()
  ctx.ellipse(cx, cy, radius, radius * 1.05, 0, 0, Math.PI * 2)
  ctx.fillStyle = grad
  ctx.fill()

  /* Outline */
  ctx.strokeStyle = 'rgba(0,0,0,0.3)'
  ctx.lineWidth = Math.max(size * 0.02, 2)
  ctx.stroke()
}

/**
 * Draw character accessories (ears, antenna).
 */
export function drawAccessories(
  ctx: CanvasRenderingContext2D,
  size: number,
  character?: CharacterDef,
): void {
  const c = character ?? getCharacterDef()
  const cx = size / 2

  ctx.lineCap = 'round'
  ctx.strokeStyle = c.bodyStops[2]
  ctx.lineWidth = Math.max(size * 0.025, 2)

  if (c.accessory === 'ears') {
    /* Left ear */
    ctx.beginPath()
    ctx.moveTo(cx - size * 0.28, size * 0.3)
    ctx.lineTo(cx - size * 0.38, size * 0.05)
    ctx.lineTo(cx - size * 0.15, size * 0.2)
    ctx.closePath()
    ctx.fillStyle = c.bodyStops[1]
    ctx.fill()
    ctx.stroke()

    /* Right ear */
    ctx.beginPath()
    ctx.moveTo(cx + size * 0.28, size * 0.3)
    ctx.lineTo(cx + size * 0.38, size * 0.05)
    ctx.lineTo(cx + size * 0.15, size * 0.2)
    ctx.closePath()
    ctx.fillStyle = c.bodyStops[1]
    ctx.fill()
    ctx.stroke()
  } else if (c.accessory === 'antenna') {
    /* Stem */
    ctx.beginPath()
    ctx.moveTo(cx, size * 0.25)
    ctx.lineTo(cx, size * 0.08)
    ctx.stroke()

    /* Orb */
    ctx.beginPath()
    ctx.arc(cx, size * 0.06, size * 0.035, 0, Math.PI * 2)
    ctx.fillStyle = '#facc15'
    ctx.fill()
    ctx.stroke()
  }
}

/**
 * Draw eyebrows based on emotion state.
 * eyeAngle: positive = arched up (happy), negative = furrowed (angry)
 */
export function drawEyebrows(
  ctx: CanvasRenderingContext2D,
  size: number,
  eyeAngle: number,
  color: string,
): void {
  const cx = size / 2
  const browW = size * 0.22
  const browY = size * 0.28
  const strokeW = Math.max(size * 0.035, 3)

  ctx.save()
  ctx.strokeStyle = color
  ctx.lineWidth = strokeW
  ctx.lineCap = 'round'

  /* Left eyebrow */
  const leftStartX = cx - browW - size * 0.04
  const leftEndX = cx - size * 0.03
  const leftMidX = (leftStartX + leftEndX) / 2
  const leftMidY = browY - eyeAngle * size * 0.08

  ctx.beginPath()
  ctx.moveTo(leftStartX, browY)
  ctx.quadraticCurveTo(leftMidX, leftMidY, leftEndX, browY - eyeAngle * size * 0.04)
  ctx.stroke()

  /* Right eyebrow */
  const rightStartX = cx + size * 0.03
  const rightEndX = cx + browW + size * 0.04

  // Mirror the angle (left brow up = right brow up for most emotions)
  const rightMidX = (rightStartX + rightEndX) / 2
  const rightMidY = browY - eyeAngle * size * 0.08

  ctx.beginPath()
  ctx.moveTo(rightStartX, browY - eyeAngle * size * 0.04)
  ctx.quadraticCurveTo(rightMidX, rightMidY, rightEndX, browY)
  ctx.stroke()

  ctx.restore()
}

/**
 * Draw blink/eyelid effect.
 * openness: 0 = fully open, 1 = fully closed
 */
export function drawEyelids(
  ctx: CanvasRenderingContext2D,
  size: number,
  openness: number,
  eyelidColor: string,
): void {
  if (openness <= 0) return

  const cx = size / 2
  const eyeY = size * 0.42
  const eyeW = size * 0.2
  const eyeH = size * 0.24

  const coverH = eyeH * openness

  ctx.fillStyle = eyelidColor

  /* Top eyelid */
  ctx.fillRect(cx - eyeW, eyeY - eyeH, eyeW * 2, coverH)

  /* Bottom eyelid */
  ctx.fillRect(cx - eyeW, eyeY + eyeH - coverH, eyeW * 2, coverH)
}

/**
 * Draw a mouth based on emotion draw state.
 * Replaces the simpler version in emotion.ts.
 */
export function drawMouth(
  ctx: CanvasRenderingContext2D,
  size: number,
  mouthCurvature: number,
  mouthOpenness: number,
  trembling: number,
  color: string,
  time: number,
): void {
  const cx = size / 2
  const mouthY = size * 0.68
  const mouthW = size * 0.28
  const strokeW = Math.max(size * 0.04, 2.5)

  ctx.save()
  ctx.strokeStyle = color
  ctx.lineWidth = strokeW
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'

  if (mouthOpenness > 0.3) {
    /* Open mouth (surprised, scared) — draw an oval */
    const oh = mouthOpenness * mouthW * 0.55
    const ow = mouthW * (0.55 + mouthOpenness * 0.4)
    ctx.beginPath()
    ctx.ellipse(cx, mouthY + oh * 0.15, ow / 2, oh / 2, 0, 0, Math.PI * 2)
    ctx.fillStyle = '#111'
    ctx.fill()
    ctx.stroke()
  } else {
    /* Closed mouth — curved arc */
    const curvature = mouthCurvature * mouthW * 0.4
    ctx.beginPath()
    ctx.moveTo(cx - mouthW / 2, mouthY)
    ctx.quadraticCurveTo(cx, mouthY - curvature, cx + mouthW / 2, mouthY)
    ctx.stroke()
  }

  /* Trembling effect */
  if (trembling > 0.05) {
    const amp = trembling * 2.5
    ctx.strokeStyle = `${color}60`
    ctx.lineWidth = strokeW * 0.5
    ctx.beginPath()
    ctx.moveTo(
      cx - mouthW / 2 + Math.sin(time * 15) * amp,
      mouthY + Math.cos(time * 17) * amp,
    )
    ctx.lineTo(
      cx + mouthW / 2 + Math.sin(time * 13 + 1) * amp,
      mouthY + Math.cos(time * 19 + 2) * amp,
    )
    ctx.stroke()
  }

  ctx.restore()
}

/* -------------------------------------------------------- */
/*  Shared runtime state for character + emotion rendering   */
/* -------------------------------------------------------- */

export interface CharacterRenderState {
  character: CharacterId
  /** Squash x scale (1 = normal, <1 = squished). */
  squashX: number
  /** Squash y scale (1 = normal, >1 = stretched). */
  squashY: number
  /** Time in seconds for animation effects. */
  time: number
}

let _state: CharacterRenderState = {
  character: 'gloop',
  squashX: 1,
  squashY: 1,
  time: 0,
}

export function getCharacterRenderState(): CharacterRenderState {
  return _state
}

export function setCharacterSquash(x: number, y: number): void {
  _state.squashX = x
  _state.squashY = y
}

export function updateCharacterTime(delta: number): void {
  _state.time += delta / 1000
}