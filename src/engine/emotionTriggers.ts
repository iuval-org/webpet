/**
 * Emotion Triggers API — developer hooks for automatic emotion changes.
 *
 * Allows developers to map events / triggers to emotions:
 *
 * ```ts
 * const triggers = createEmotionTriggers(pet)
 * triggers.on('error', 'scared')
 * triggers.on('success', 'happy')
 * triggers.trigger('error')  // manually fire
 * ```
 *
 * Built-in automatic triggers are also provided.
 *
 * @module engine/emotionTriggers
 */

import type { Emotion, EmotionAPI } from './emotion.ts'

/* -------------------------------------------------------- */
/*  Types                                                  */
/* -------------------------------------------------------- */

/** Built-in automatic trigger names. */
export type BuiltinTrigger =
  | 'hover'     // mouse enters the pet canvas
  | 'leave'     // mouse leaves the pet canvas
  | 'click'     // pet is clicked
  | 'idle'      // no interaction for N seconds
  | 'doubleClick' // double click
  | 'dragStart' // starts being dragged
  | 'dragEnd'   // released after drag

export type TriggerName = BuiltinTrigger | (string & {})

export interface EmotionTriggerConfig {
  /** Emotion to set when this trigger fires. */
  readonly emotion: Emotion
  /** Duration in ms to hold this emotion before returning to default (0 = permanent). */
  readonly duration?: number
}

export interface EmotionTriggersAPI {
  /**
   * Register a trigger → emotion mapping.
   * When triggered, the pet's emotion changes.
   */
  on(trigger: TriggerName, emotion: Emotion, config?: Partial<Omit<EmotionTriggerConfig, 'emotion'>>): void

  /** Unregister a trigger. */
  off(trigger: TriggerName): void

  /** Manually fire a trigger. */
  trigger(name: TriggerName): void

  /** Set the default emotion (fallback when no active triggers). */
  setDefault(emotion: Emotion): void

  /** Remove all trigger registrations. */
  clear(): void
}

/* -------------------------------------------------------- */
/*  Factory                                                */
/* -------------------------------------------------------- */

interface InternalConfig {
  emotion: Emotion
  duration: number // ms; 0 = permanent
}

const DEFAULT_HOLD_MS = 1500

/**
 * Create an emotion triggers controller for a pet that has emotions enabled.
 *
 * @param emotionAPI - The pet's `EmotionAPI` (from `createEmotionBehavior()` or `pet.emotion`).
 * @returns An `EmotionTriggersAPI` instance.
 */
export function createEmotionTriggers(emotionAPI: EmotionAPI): EmotionTriggersAPI {
  const triggers = new Map<TriggerName, InternalConfig>()
  let defaultEmotion: Emotion = 'neutral'
  let activeTrigger: TriggerName | null = null
  let returnTimeout: ReturnType<typeof setTimeout> | null = null

  /* ---- Internal helpers ---- */

  function scheduleReturn(ms: number): void {
    if (returnTimeout !== null) {
      clearTimeout(returnTimeout)
    }
    if (ms > 0) {
      returnTimeout = setTimeout(() => {
        emotionAPI.setEmotion(defaultEmotion)
        activeTrigger = null
        returnTimeout = null
      }, ms)
    }
  }

  function fire(trigger: TriggerName): void {
    const config = triggers.get(trigger)
    if (!config) return

    activeTrigger = trigger
    emotionAPI.setEmotion(config.emotion)
    scheduleReturn(config.duration)
  }

  /* ---- Public API ---- */

  const api: EmotionTriggersAPI = {
    on(
      trigger: TriggerName,
      emotion: Emotion,
      partial?: Partial<Omit<EmotionTriggerConfig, 'emotion'>>,
    ): void {
      triggers.set(trigger, {
        emotion,
        duration: partial?.duration ?? DEFAULT_HOLD_MS,
      })
    },

    off(trigger: TriggerName): void {
      triggers.delete(trigger)
    },

    trigger(name: TriggerName): void {
      fire(name)
    },

    setDefault(emotion: Emotion): void {
      defaultEmotion = emotion
      // Apply immediately if no trigger is currently active
      if (activeTrigger === null) {
        emotionAPI.setEmotion(emotion)
      }
    },

    clear(): void {
      triggers.clear()
      if (returnTimeout !== null) {
        clearTimeout(returnTimeout)
        returnTimeout = null
      }
      activeTrigger = null
      emotionAPI.setEmotion(defaultEmotion)
    },
  }

  return api
}