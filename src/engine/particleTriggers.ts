/**
 * Particle Triggers — automatic particle emission based on emotion state.
 *
 * Listens to emotion changes via `EmotionAPI.onEmotionChange` and emits
 * burst particles on transitions. Additionally, emits continuous particles
 * while certain emotions persist (happy → sparks+confetti, angry → red sparks).
 *
 * Returns a full Behavior so it integrates cleanly into the engine pipeline.
 *
 * @module engine/particleTriggers
 */

import type { Behavior } from './behavior.ts'
import type { InputState } from './input.ts'
import type { Emotion } from './emotion.ts'
import type { EmotionAPI } from './emotion.ts'
import type { ParticleBehavior, ParticleType, ParticleEmitConfig } from './particles.ts'

/* -------------------------------------------------------- */
/*  Burst configuration per transition                      */
/* -------------------------------------------------------- */

interface BurstConfig {
  readonly type: ParticleType
  readonly count: number
  readonly config: Partial<ParticleEmitConfig>
}

interface TransitionRule {
  readonly from?: Emotion       // undefined = any
  readonly to: Emotion
  readonly burst: BurstConfig
}

const TRANSITIONS: TransitionRule[] = [
  {
    from: 'neutral',
    to: 'happy',
    burst: { type: 'confetti', count: 30, config: { speed: 120, lifetime: 1.5, size: 5 } },
  },
  {
    to: 'surprised',
    burst: { type: 'star', count: 25, config: { speed: 150, lifetime: 1.2, size: 5, spread: Math.PI * 2 } },
  },
  {
    to: 'angry',
    burst: { type: 'spark', count: 15, config: { speed: 100, lifetime: 0.8, size: 4, color: '#ff4444' } },
  },
  {
    to: 'love',
    burst: { type: 'heart', count: 18, config: { speed: 110, lifetime: 1.6, size: 5 } },
  },
  {
    to: 'dizzy',
    burst: { type: 'star', count: 22, config: { speed: 140, lifetime: 1.3, size: 4, spread: Math.PI * 2 } },
  },
]

/* -------------------------------------------------------- */
/*  Continuous emission config per emotion                  */
/* -------------------------------------------------------- */

interface ContinuousRule {
  readonly type: ParticleType
  readonly countMin: number
  readonly countMax: number
  readonly intervalMs: number
  readonly config: Partial<ParticleEmitConfig>
}

const CONTINUOUS: Partial<Record<Emotion, ContinuousRule>> = {
  happy: {
    type: 'spark',
    countMin: 10,
    countMax: 15,
    intervalMs: 2000,
    config: { speed: 60, lifetime: 1.2, size: 3 },
  },
  angry: {
    type: 'spark',
    countMin: 5,
    countMax: 5,
    intervalMs: 800,
    config: { speed: 100, lifetime: 0.6, size: 3, color: '#ff4444' },
  },
  love: {
    type: 'heart',
    countMin: 3,
    countMax: 6,
    intervalMs: 1600,
    config: { speed: 50, lifetime: 1.4, size: 4 },
  },
  dizzy: {
    type: 'star',
    countMin: 2,
    countMax: 4,
    intervalMs: 900,
    config: { speed: 40, lifetime: 1.1, size: 3 },
  },
}

/**
 * Create a particle triggers behavior that ties emotion changes to particle
 * emissions. Automatically emits bursts on transitions and continuous streams
 * while certain emotions persist.
 *
 * @param emotionAPI - The pet's EmotionAPI (from createEmotionBehavior).
 * @param particleBehavior - The pet's ParticleBehavior (from createParticleBehavior).
 * @param petSize - The pet's render size in px (used to compute emission center).
 * @returns A Behavior ready to be registered in the BehaviorManager.
 */
export function createParticleTriggers(
  emotionAPI: EmotionAPI,
  particleBehavior: ParticleBehavior,
  petSize: number,
): Behavior {
  let currentEmotion: Emotion = emotionAPI.getEmotion()
  let continuousTimer = 0

  const centerX = petSize / 2
  const centerY = petSize / 2

  /* ---- Listen for emotion changes and fire bursts ---- */
  emotionAPI.onEmotionChange((emotion: Emotion): void => {
    const prev = currentEmotion
    currentEmotion = emotion

    // Check transition rules
    for (const rule of TRANSITIONS) {
      if (rule.to !== emotion) continue
      if (rule.from !== undefined && rule.from !== prev) continue

      const b = rule.burst
      particleBehavior.emit(centerX, centerY, b.type, b.count, b.config)
      break
    }
  })

  return {
    name: 'particle-triggers',

    onTick(delta: number, _input: InputState): void {
      continuousTimer += delta

      const rule = CONTINUOUS[currentEmotion]
      if (!rule) {
        continuousTimer = 0
        return
      }

      if (continuousTimer >= rule.intervalMs) {
        continuousTimer -= rule.intervalMs

        const count =
          rule.countMin === rule.countMax
            ? rule.countMin
            : rule.countMin + Math.floor(Math.random() * (rule.countMax - rule.countMin + 1))

        // Alternate between spark and confetti for happy
        const type: ParticleType =
          currentEmotion === 'happy' && Math.random() < 0.3
            ? 'confetti'
            : rule.type

        particleBehavior.emit(centerX, centerY, type, count, rule.config)
      }
    },
  }
}