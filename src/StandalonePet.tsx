import { useEffect, useRef } from 'react'
import { createPet } from './engine'
import type { CharacterId, Emotion } from './engine'
import { createEyesBehavior, createBlinkBehavior, createClickBehavior } from './engine/behaviors'
import type { Behavior } from './engine/behavior'

/* -------------------------------------------------------- */
/*  URL parameter parsing                                   */
/* -------------------------------------------------------- */

const VALID_EMOTIONS: Emotion[] = ['neutral', 'happy', 'sad', 'angry', 'surprised', 'sleepy', 'scared']
const VALID_CHARACTERS: CharacterId[] = ['gloop', 'robo', 'goober', 'kitty', 'chick', 'alien']

function parseEmotion(raw: string | null): Emotion {
  return VALID_EMOTIONS.includes(raw as Emotion) ? (raw as Emotion) : 'neutral'
}

function parseCharacter(raw: string | null): CharacterId {
  return VALID_CHARACTERS.includes(raw as CharacterId) ? (raw as CharacterId) : 'gloop'
}

interface StandaloneParams {
  behaviors: string[]
  color: string
  size: number
  eyeSpeed: number
  emotion: Emotion
  character: CharacterId
}

function parseParams(): StandaloneParams | null {
  const params = new URLSearchParams(window.location.search)
  const petParam = params.get('pet')
  if (petParam) {
    return {
      behaviors: petParam.split(',').filter(Boolean),
      color: params.get('color') ?? 'ff6b6b',
      size: Number(params.get('size')) || 120,
      eyeSpeed: Number(params.get('eyeSpeed')) || 0.15,
      emotion: parseEmotion(params.get('emotion')),
      character: parseCharacter(params.get('character')),
    }
  }

  // Also try path-based: /p/ojos,parpadeo,click/ff6b6b/120?emotion=happy
  const match = window.location.pathname.match(/^\/p\/([^/]+)\/([^/]+)\/(\d+)/)
  if (match) {
    return {
      behaviors: match[1].split(',').filter(Boolean),
      color: match[2],
      size: Number(match[3]) || 120,
      eyeSpeed: Number(params.get('eyeSpeed')) || 0.15,
      emotion: parseEmotion(params.get('emotion')),
      character: parseCharacter(params.get('character')),
    }
  }

  return null
}

/* -------------------------------------------------------- */
/*  Component                                               */
/* -------------------------------------------------------- */

export default function StandalonePet() {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const parsed = parseParams()
    if (!parsed) return

    const { behaviors: behaviorNames, color, size, eyeSpeed, emotion, character } = parsed

    const behaviorList: Behavior[] = []

    if (behaviorNames.includes('ojos') || behaviorNames.includes('eyes')) {
      behaviorList.push(
        createEyesBehavior({ irisColor: `#${color}`, followSpeed: eyeSpeed }),
      )
    }
    if (behaviorNames.includes('parpadeo') || behaviorNames.includes('blink')) {
      behaviorList.push(createBlinkBehavior({ interval: 3000, duration: 150 }))
    }
    if (behaviorNames.includes('click')) {
      behaviorList.push(
        createClickBehavior({ intensity: 0.6, reactionType: 'random' }),
      )
    }

    const pet = createPet({
      id: 'standalone',
      color: `#${color}`,
      size,
      defaultEmotion: emotion,
      character,
      behaviors: behaviorList,
    })

    if (containerRef.current) {
      pet.mount(containerRef.current)
    }

    return () => {
      pet.unmount()
    }
  }, [])

  if (!parseParams()) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-950 via-purple-950 to-slate-950 flex items-center justify-center">
        <div className="text-white/50 text-sm font-mono">
          Invalid pet configuration
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-950 via-purple-950 to-slate-950 flex items-center justify-center">
      <div
        ref={containerRef}
        className="rounded-xl overflow-hidden flex items-center justify-center"
        style={{ width: 300, height: 300 }}
      />
    </div>
  )
}