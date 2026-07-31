/**
 * Audio system — Web Audio API synthesizer for mascot sound effects.
 *
 * @module engine/audio
 */

let _ctx: AudioContext | null = null
let _enabled = false

function ctx(): AudioContext | null {
  if (!_ctx) {
    const AudioCtor = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (AudioCtor) {
      _ctx = new AudioCtor()
    }
  }
  return _ctx
}

export function isAudioEnabled(): boolean {
  return _enabled
}

export function setAudioEnabled(v: boolean): void {
  if (v) ctx() // init on first enable
  _enabled = v
}

export function toggleAudio(): boolean {
  _enabled = !_enabled
  if (_enabled) ctx()
  return _enabled
}

/** Play a quick sine sweep (blink, poke). */
function playSweep(
  freqStart: number,
  freqEnd: number,
  duration: number,
  type: OscillatorType = 'sine',
  volume = 0.08,
): void {
  const ac = ctx()
  if (!_enabled || !ac) return
  try {
    const osc = ac.createOscillator()
    const gain = ac.createGain()
    osc.type = type
    osc.frequency.setValueAtTime(freqStart, ac.currentTime)
    osc.frequency.exponentialRampToValueAtTime(freqEnd, ac.currentTime + duration)
    gain.gain.setValueAtTime(volume, ac.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + duration)
    osc.connect(gain)
    gain.connect(ac.destination)
    osc.start()
    osc.stop(ac.currentTime + duration)
  } catch {
    // Silently fail — audio is non-critical
  }
}

/** Blink sound — quick high pip. */
export function playBlink(): void {
  playSweep(600, 1200, 0.06, 'sine', 0.06)
}

/** Poke/click sound. */
export function playPoke(): void {
  playSweep(250, 700, 0.12, 'triangle', 0.12)
}

/** Jump / trick sound — rising sweep. */
export function playTrick(): void {
  playSweep(300, 1000, 0.25, 'sine', 0.1)
}

/** Landing thud. */
export function playLand(): void {
  playSweep(180, 60, 0.1, 'sine', 0.12)
}

/** Love arpeggio — C E G C. */
export function playLove(): void {
  const notes = [523.25, 659.25, 783.99, 1046.5]
  notes.forEach((freq, i) => {
    setTimeout(() => {
      playSweep(freq, freq * 1.01, 0.25, 'sine', 0.08)
    }, i * 60)
  })
}

/** Angry buzz — low sawtooth descending. */
export function playAngry(): void {
  const ac = ctx()
  if (!_enabled || !ac) return
  try {
    const osc = ac.createOscillator()
    const gain = ac.createGain()
    osc.type = 'sawtooth'
    osc.frequency.setValueAtTime(130, ac.currentTime)
    osc.frequency.linearRampToValueAtTime(80, ac.currentTime + 0.35)
    gain.gain.setValueAtTime(0.12, ac.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.35)
    osc.connect(gain)
    gain.connect(ac.destination)
    osc.start()
    osc.stop(ac.currentTime + 0.35)
  } catch { /* noop */ }
}

/** Sad slide — descending sine. */
export function playSad(): void {
  playSweep(500, 220, 0.4, 'sine', 0.1)
}

/** Cool jam — triangle chord sequence. */
export function playCool(): void {
  const notes = [330, 415, 493, 659]
  notes.forEach((freq) => {
    try {
      const ac = ctx()
      if (!ac) return
      const osc = ac.createOscillator()
      const gain = ac.createGain()
      osc.type = 'triangle'
      osc.frequency.setValueAtTime(freq, ac.currentTime)
      gain.gain.setValueAtTime(0.06, ac.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.3)
      osc.connect(gain)
      gain.connect(ac.destination)
      osc.start()
      osc.stop(ac.currentTime + 0.3)
    } catch { /* noop */ }
  })
}