/**
 * Standalone Pet Page — full dashboard that mounts the real engine.
 *
 * Reads URL params: ?pet=<body>&color=<c>&size=<n>&emotion=<e>&character=<c>&body=<b>&eyes=<e>&arms=<a>&headgear=<h>
 * Renders a responsive dark-mode dashboard with the pet, header, HUD controls,
 * fly/walk modes, and animated background particles.
 */
import { useEffect, useRef, useState, useCallback } from 'react'
import type {
  BodyType, CharacterId, Emotion, EyeType, ArmType, Headgear,
  PetInstance, LocomotionMode,
} from './engine'
import type { LocomotionAPI } from './engine/locomotion.ts'
import {
  createPet,
  setCharacter as _setGlobalCharacter,
  createLocomotionBehavior,
  toggleAudio,
  isAudioEnabled,
  CHARACTER_LIST,
} from './engine'
import { createEyesBehavior, createBlinkBehavior, createClickBehavior } from './engine/behaviors'
import { setBodyType as _setBodyType, setEyeType as _setEyeType, setArmType as _setArmType, setHeadgearType as _setHeadgearType } from './engine/character.ts'

/* -------------------------------------------------------- */
/*  Emotion → badge mapping                                 */
/* -------------------------------------------------------- */

interface MoodBadge {
  readonly label: string
  readonly emoji: string
}

const MOOD_MAP: Record<Emotion, MoodBadge> = {
  neutral:   { label: 'Neutral',    emoji: '😐' },
  happy:     { label: 'Playful',    emoji: '🥰' },
  sad:       { label: 'Sad',        emoji: '😢' },
  angry:     { label: 'Angry',      emoji: '😠' },
  surprised: { label: 'Surprised',  emoji: '😮' },
  sleepy:    { label: 'Sleepy',     emoji: '😴' },
  scared:    { label: 'Scared',     emoji: '😨' },
  love:      { label: 'Lovestruck', emoji: '😍' },
  cool:      { label: 'Cool',       emoji: '😎' },
  dizzy:     { label: 'Dizzy',      emoji: '😵' },
  silly:     { label: 'Silly',      emoji: '🤪' },
  skeptical: { label: 'Skeptical',  emoji: '🤨' },
}

const EMOTIONS = Object.keys(MOOD_MAP) as Emotion[]

/* -------------------------------------------------------- */
/*  URL param parsing                                       */
/* -------------------------------------------------------- */

function parseUrlParams() {
  const p = new URLSearchParams(window.location.search)

  const rawColor = p.get('color') || '#ff6b6b'
  const color = rawColor.startsWith('#') ? rawColor : `#${rawColor}`

  const size = Math.max(64, Math.min(600, Number(p.get('size')) || 256))
  const emotion = (EMOTIONS.includes(p.get('emotion') as Emotion) ? p.get('emotion') : 'neutral') as Emotion
  const character = (p.get('character') || 'gloop') as CharacterId
  const bodyType = (p.get('body') || p.get('pet') || 'round') as BodyType
  const eyeType = (p.get('eyes') || 'round') as EyeType
  const armType = (p.get('arms') || 'stubby') as ArmType
  const headgear = (p.get('headgear') || 'none') as Headgear

  return { color, size, emotion, character, bodyType, eyeType, armType, headgear }
}

/* -------------------------------------------------------- */
/*  CSS particles — decorative floating dots                */
/* -------------------------------------------------------- */

function CssParticles() {
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0" aria-hidden>
      {Array.from({ length: 20 }).map((_, i) => (
        <div
          key={i}
          className="absolute rounded-full"
          style={{
            width: `${2 + Math.random() * 6}px`,
            height: `${2 + Math.random() * 6}px`,
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            backgroundColor: `hsla(${Math.random() * 360}, 70%, 70%, ${0.15 + Math.random() * 0.25})`,
            animation: `standalone-float ${8 + Math.random() * 12}s ease-in-out infinite`,
            animationDelay: `${Math.random() * 5}s`,
          }}
        />
      ))}
    </div>
  )
}

/* -------------------------------------------------------- */
/*  Header component                                        */
/* -------------------------------------------------------- */

function Header({ mood, onToggleAudio, audioEnabled }: {
  mood: MoodBadge
  onToggleAudio: () => void
  audioEnabled: boolean
}) {
  return (
    <header className="flex items-center justify-between px-4 md:px-8 py-3">
      <div className="flex items-center gap-3">
        <h1 className="text-lg md:text-xl font-bold text-white tracking-tight">
          🐾 WebPet
        </h1>
        <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/30 text-[11px] font-medium">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          Tracking Cursor
        </span>
      </div>

      <div className="flex items-center gap-3">
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-500/15 text-purple-200 ring-1 ring-purple-400/30 text-xs font-medium">
          {mood.emoji} {mood.label}
        </span>
        <button
          onClick={onToggleAudio}
          className="px-2 py-1 rounded-lg text-[10px] font-mono transition-all cursor-pointer bg-white/5 text-white/40 hover:text-white/60 ring-1 ring-white/10"
        >
          {audioEnabled ? '🔊' : '🔇'}
        </button>
      </div>
    </header>
  )
}

/* -------------------------------------------------------- */
/*  Control buttons                                         */
/* -------------------------------------------------------- */

function ToggleSegmented<T extends string>({ options, value, onChange, className }: {
  options: { value: T; label: string; icon: string }[]
  value: T
  onChange: (v: T) => void
  className?: string
}) {
  return (
    <div className={`bg-white/5 p-0.5 rounded-xl border border-white/10 flex items-center ${className ?? ''}`}>
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={`flex-1 py-1.5 px-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
            value === opt.value
              ? 'bg-purple-500/20 text-purple-200 border border-purple-500/40'
              : 'text-white/50 hover:text-white/70'
          }`}
        >
          {opt.icon} {opt.label}
        </button>
      ))}
    </div>
  )
}

/* -------------------------------------------------------- */
/*  Range slider                                            */
/* -------------------------------------------------------- */

function RangeSlider({ label, value, onChange, min, max, step, formatValue }: {
  label: string
  value: number
  onChange: (v: number) => void
  min: number
  max: number
  step?: number
  formatValue?: (v: number) => string
}) {
  return (
    <div>
      <label className="flex items-center justify-between text-sm text-white/70 mb-1.5">
        <span>{label}</span>
        <span className="font-mono text-purple-400 text-xs">
          {formatValue ? formatValue(value) : value}
        </span>
      </label>
      <input
        type="range"
        min={min}
        max={max}
        step={step ?? 1}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-1.5 rounded-full appearance-none cursor-pointer
          bg-white/10 accent-purple-500
          [&::-webkit-slider-thumb]:appearance-none
          [&::-webkit-slider-thumb]:w-4
          [&::-webkit-slider-thumb]:h-4
          [&::-webkit-slider-thumb]:rounded-full
          [&::-webkit-slider-thumb]:bg-purple-500
          [&::-webkit-slider-thumb]:shadow-lg
          [&::-webkit-slider-thumb]:cursor-pointer
          [&::-moz-range-thumb]:w-4
          [&::-moz-range-thumb]:h-4
          [&::-moz-range-thumb]:rounded-full
          [&::-moz-range-thumb]:bg-purple-500
          [&::-moz-range-thumb]:border-0
          [&::-moz-range-thumb]:shadow-lg
          [&::-moz-range-thumb]:cursor-pointer"
      />
    </div>
  )
}

/* -------------------------------------------------------- */
/*  Character button                                        */
/* -------------------------------------------------------- */

function CharButton({ emoji, label, active, onClick }: {
  emoji: string
  label: string
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 cursor-pointer ${
        active
          ? 'bg-purple-500/20 text-purple-200 ring-1 ring-purple-400/50'
          : 'bg-white/5 text-white/50 hover:bg-white/10 hover:text-white/70 ring-1 ring-white/5'
      }`}
    >
      <span className="text-sm">{emoji}</span>
      <span className="hidden sm:inline truncate max-w-16">{label}</span>
    </button>
  )
}

/* -------------------------------------------------------- */
/*  Emotion button                                          */
/* -------------------------------------------------------- */

function EmojiButton({ emoji, label, active, onClick }: {
  emoji: string
  label: string
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 cursor-pointer ${
        active
          ? 'bg-purple-500/20 text-purple-200 ring-1 ring-purple-400/50'
          : 'bg-white/5 text-white/50 hover:bg-white/10 hover:text-white/70 ring-1 ring-white/5'
      }`}
    >
      <span className="text-sm">{emoji}</span>
      <span className="hidden sm:inline">{label}</span>
    </button>
  )
}

/* -------------------------------------------------------- */
/*  Main dashboard component                                */
/* -------------------------------------------------------- */

export default function StandalonePet() {
  const params = useRef(parseUrlParams()).current

  const containerRef = useRef<HTMLDivElement>(null)
  const petRef = useRef<PetInstance | null>(null)
  const locomotionRef = useRef<LocomotionAPI | null>(null)

  /* ---- Live state ---- */
  const [emotion, setEmotion] = useState<Emotion>(params.emotion)
  const [character, setCharacterState] = useState<CharacterId>(params.character)
  const [mode, setMode] = useState<LocomotionMode>('fly')
  const [energy, setEnergy] = useState(3)
  const [scaleVal, setScaleVal] = useState(1)
  const [audioEnabled, setAudioEnabled] = useState(isAudioEnabled())
  const [mood, setMood] = useState<MoodBadge>(MOOD_MAP[params.emotion])

  /* ---- Spawn the pet ---- */
  useEffect(() => {
    const prev = petRef.current
    if (prev) {
      prev.unmount()
      petRef.current = null
    }

    const locoBehavior = createLocomotionBehavior({ defaultMode: 'fly', energy: 3, scale: 1 })
    locomotionRef.current = locoBehavior

    const behaviorList = [
      createEyesBehavior({ irisColor: params.color, followSpeed: 0.15 }),
      createBlinkBehavior({ interval: 3000, duration: 150 }),
      createClickBehavior({ intensity: 0.6, reactionType: 'random' }),
      locoBehavior,
    ]

    const pet = createPet({
      id: 'standalone',
      color: params.color,
      size: params.size,
      behaviors: behaviorList,
      defaultEmotion: params.emotion,
      character: params.character,
    })

    if (containerRef.current) {
      pet.mount(containerRef.current)
    }
    petRef.current = pet

    /* Listen for emotion changes */
    const unsub = pet.onEmotionChange?.((e: Emotion) => {
      setEmotion(e)
      setMood(MOOD_MAP[e])
    })

    /* Sync appearance */
    _setBodyType(params.bodyType)
    _setEyeType(params.eyeType)
    _setArmType(params.armType)
    _setHeadgearType(params.headgear)

    return () => {
      unsub?.()
      pet.unmount()
      petRef.current = null
      locomotionRef.current = null
    }
    // Only run once on mount — live changes use the ref directly
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /* ---- Live emotion changes (no remount) ---- */
  useEffect(() => {
    petRef.current?.setEmotion?.(emotion)
  }, [emotion])

  /* ---- Live character changes ---- */
  useEffect(() => {
    _setGlobalCharacter(character)
  }, [character])

  /* ---- Live locomotion ---- */
  useEffect(() => {
    locomotionRef.current?.setMode(mode)
  }, [mode])

  useEffect(() => {
    locomotionRef.current?.setEnergy(energy)
  }, [energy])

  useEffect(() => {
    locomotionRef.current?.setScale(scaleVal)
  }, [scaleVal])

  /* ---- Audio toggle ---- */
  const handleToggleAudio = useCallback(() => {
    const on = toggleAudio()
    setAudioEnabled(on)
  }, [])

  /* ---- Energy label ---- */
  const formatEnergy = useCallback((v: number) => {
    if (v === 0) return '0 (Calm)'
    if (v <= 3) return `${v} (Low)`
    if (v <= 7) return `${v} (Hyper)`
    return `${v} (MAX ⚡)`
  }, [])

  /* ---- Responsive container size ---- */
  const petSize = Math.min(
    params.size,
    typeof window !== 'undefined'
      ? Math.min(window.innerWidth - 48, window.innerHeight * 0.5, 400)
      : params.size,
  )

  /* ---- Render ---- */
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-950 via-purple-950 to-slate-950 flex flex-col relative">
      {/* CSS background particles */}
      <CssParticles />

      {/* Inject keyframes */}
      <style>{`
        @keyframes standalone-float {
          0%, 100% { transform: translateY(0) translateX(0); opacity: 0.3; }
          25% { transform: translateY(-30px) translateX(10px); opacity: 0.7; }
          50% { transform: translateY(-10px) translateX(-15px); opacity: 0.5; }
          75% { transform: translateY(-40px) translateX(5px); opacity: 0.8; }
        }
      `}</style>

      {/* Header */}
      <Header mood={mood} onToggleAudio={handleToggleAudio} audioEnabled={audioEnabled} />

      {/* Pet area — centered, fills remaining space */}
      <div className="flex-1 flex items-center justify-center px-4 py-4 relative z-10">
        <div className="relative">
          {/* Glow behind pet */}
          <div
            className="absolute inset-0 rounded-full opacity-20 blur-3xl"
            style={{
              background: `radial-gradient(circle, ${params.color}88 0%, transparent 70%)`,
              transform: 'scale(1.5)',
            }}
          />

          {/* Pet canvas container */}
          <div
            ref={containerRef}
            className="rounded-2xl overflow-hidden relative z-10"
            style={{ width: petSize, height: petSize }}
          />
        </div>
      </div>

      {/* HUD Footer */}
      <footer className="relative z-10 px-4 md:px-8 py-4 bg-black/30 backdrop-blur-md border-t border-white/5">
        <div className="max-w-4xl mx-auto space-y-3">
          {/* Row 1: Character + Emotion */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Character */}
            <span className="text-[10px] font-semibold text-white/40 uppercase tracking-widest mr-1">
              Character
            </span>
            {CHARACTER_LIST.map((c) => (
              <CharButton
                key={c.id}
                emoji={c.emoji}
                label={c.label}
                active={character === c.id}
                onClick={() => setCharacterState(c.id)}
              />
            ))}

            <span className="w-px h-6 bg-white/10 mx-2 hidden sm:block" />

            {/* Emotion */}
            <span className="text-[10px] font-semibold text-white/40 uppercase tracking-widest mr-1">
              Mood
            </span>
            {EMOTIONS.map((e) => (
              <EmojiButton
                key={e}
                emoji={MOOD_MAP[e].emoji}
                label={MOOD_MAP[e].label}
                active={emotion === e}
                onClick={() => setEmotion(e)}
              />
            ))}
          </div>

          {/* Row 2: Mode + Energy + Scale + Audio */}
          <div className="flex flex-wrap items-end gap-4">
            {/* Fly/Walk toggle */}
            <div className="w-36">
              <span className="block text-[10px] font-semibold text-white/40 uppercase tracking-widest mb-1.5">
                Mode
              </span>
              <ToggleSegmented
                options={[
                  { value: 'fly' as LocomotionMode, label: 'Float', icon: '🛸' },
                  { value: 'walk' as LocomotionMode, label: 'Walk', icon: '🐾' },
                ]}
                value={mode}
                onChange={setMode}
              />
            </div>

            {/* Energy */}
            <div className="flex-1 min-w-[120px] max-w-[200px]">
              <RangeSlider
                label="Energy"
                value={energy}
                onChange={setEnergy}
                min={0}
                max={10}
                formatValue={formatEnergy}
              />
            </div>

            {/* Scale */}
            <div className="flex-1 min-w-[100px] max-w-[160px]">
              <RangeSlider
                label="Scale"
                value={Math.round(scaleVal * 100)}
                onChange={(v) => setScaleVal(v / 100)}
                min={50}
                max={160}
                formatValue={(v) => `${(v / 100).toFixed(2)}x`}
              />
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}