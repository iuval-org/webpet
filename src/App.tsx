import { useEffect, useRef, useState } from 'react'
import type { BodyType, CharacterId, Emotion, EyeType, ArmType, Headgear, LocomotionMode, PetInstance } from './engine'
import { createPet, toggleAudio, isAudioEnabled } from './engine'
import { CHARACTER_LIST, BODY_OPTIONS, EYE_OPTIONS, ARM_OPTIONS, HEADGEAR_OPTIONS } from './engine'
import { createLocomotionBehavior } from './engine'
import { createEyesBehavior, createBlinkBehavior, createClickBehavior } from './engine/behaviors'
import ExportModal from './ExportModal'
import StandalonePet from './StandalonePet'
import { setBodyType as _setBodyType, setEyeType as _setEyeType, setArmType as _setArmType, setHeadgearType as _setHeadgearType } from './engine/character.ts'

/* -------------------------------------------------------- */
/*  Constants                                               */
/* -------------------------------------------------------- */

interface EmotionOption {
  readonly id: Emotion
  readonly label: string
  readonly emoji: string
}

const EMOTIONS: EmotionOption[] = [
  { id: 'neutral',   label: 'Neutral',   emoji: '😐' },
  { id: 'happy',     label: 'Feliz',     emoji: '😊' },
  { id: 'sad',       label: 'Triste',    emoji: '😢' },
  { id: 'angry',     label: 'Enojado',  emoji: '😠' },
  { id: 'surprised', label: 'Sorprendido', emoji: '😮' },
  { id: 'sleepy',    label: 'Soñoliento', emoji: '😴' },
  { id: 'scared',    label: 'Asustado',  emoji: '😨' },
]

/* -------------------------------------------------------- */
/*  Toggle switch component                                 */
/* -------------------------------------------------------- */

function Toggle({
  id,
  checked,
  onChange,
  children,
}: {
  id: string
  checked: boolean
  onChange: (v: boolean) => void
  children: React.ReactNode
}) {
  return (
    <label
      htmlFor={id}
      className="flex items-center gap-3 cursor-pointer group"
    >
      <div className="relative">
        <input
          id={id}
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="sr-only peer"
        />
        <div className="w-10 h-6 rounded-full transition-colors duration-200 bg-white/10 peer-checked:bg-purple-500" />
        <div className="absolute left-0.5 top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 peer-checked:translate-x-4" />
      </div>
      <span className="text-sm text-white/70 group-hover:text-white transition-colors">
        {children}
      </span>
    </label>
  )
}

/* -------------------------------------------------------- */
/*  Emotion button component                                */
/* -------------------------------------------------------- */

function EmotionButton({
  option,
  active,
  onClick,
}: {
  option: EmotionOption
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-200 cursor-pointer ${
        active
          ? 'bg-purple-500/30 text-purple-200 ring-1 ring-purple-400/50 shadow-lg shadow-purple-500/10'
          : 'bg-white/5 text-white/50 hover:bg-white/10 hover:text-white/70 ring-1 ring-white/5'
      }`}
    >
      <span className="text-base">{option.emoji}</span>
      <span>{option.label}</span>
    </button>
  )
}

/* -------------------------------------------------------- */
/*  Behavior state                                          */
/* -------------------------------------------------------- */

interface BehaviorState {
  eyes: boolean
  blink: boolean
  click: boolean
}

const ALL_ACTIVE: BehaviorState = { eyes: true, blink: true, click: true }

/* -------------------------------------------------------- */
/*  App — Builder                                           */
/* -------------------------------------------------------- */

function isStandaloneRoute(): boolean {
  const params = new URLSearchParams(window.location.search)
  if (params.has('pet')) return true
  return /^\/p\//.test(window.location.pathname)
}

function App() {
  const containerRef = useRef<HTMLDivElement>(null)
  const petRef = useRef<PetInstance | null>(null)

  const [behaviors, setBehaviors] = useState<BehaviorState>(ALL_ACTIVE)
  const [color, setColor] = useState('#ff6b6b')
  const [size, setSize] = useState(256)
  const [eyeSpeed, setEyeSpeed] = useState(0.15)
  const [emotion, setEmotion] = useState<Emotion>('neutral')
  const [character, setCharacterState] = useState<CharacterId>('gloop')
  const [audioEnabled, setAudioEnabled] = useState(isAudioEnabled())
  const [showExport, setShowExport] = useState(false)

  /* ---- Appearance state ---- */
  const [bodyType, setBodyType] = useState<BodyType>('round')
  const [eyeType, setEyeType] = useState<EyeType>('round')
  const [armType, setArmType] = useState<ArmType>('stubby')
  const [headgearType, setHeadgearType] = useState<Headgear>('none')

  /* ---- Locomotion state ---- */
  const [mode, setMode] = useState<LocomotionMode>('fly')
  const [energy, setEnergy] = useState(3)

  /* ---- Route: standalone pet page ---- */

  if (isStandaloneRoute()) {
    return <StandalonePet />
  }

  /* ---- Spawn / re-spawn the pet whenever controls change ---- */

  useEffect(() => {
    // Unmount previous pet (StrictMode cleanup, state change)
    const prev = petRef.current
    if (prev) {
      prev.unmount()
      petRef.current = null
    }

    const behaviorList: import('./engine/behavior.ts').Behavior[] = []

    if (behaviors.eyes) {
      behaviorList.push(
        createEyesBehavior({ irisColor: color, followSpeed: eyeSpeed }),
      )
    }
    if (behaviors.blink) {
      behaviorList.push(createBlinkBehavior({ interval: 3000, duration: 150 }))
    }
    if (behaviors.click) {
      behaviorList.push(
        createClickBehavior({ intensity: 0.6, reactionType: 'random' }),
      )
    }

    /* Locomotion behavior */
    behaviorList.push(
      createLocomotionBehavior({
        defaultMode: mode,
        energy,
      }),
    )

    const pet = createPet({
      id: 'builder',
      color,
      size,
      behaviors: behaviorList,
      defaultEmotion: emotion,
    })

    /* Mount into the container */
    if (containerRef.current) {
      pet.mount(containerRef.current)
    }

    petRef.current = pet

    /* Set appearance on the character system */
    _setBodyType(bodyType)
    _setEyeType(eyeType)
    _setArmType(armType)
    _setHeadgearType(headgearType)

    return () => {
      pet.unmount()
      petRef.current = null
    }
  }, [behaviors, color, size, eyeSpeed, emotion, character, mode, energy, bodyType, eyeType, armType, headgearType])

  /* ---- Helpers ---- */

  const handleToggle = (key: keyof BehaviorState) => (value: boolean) => {
    setBehaviors((prev) => ({ ...prev, [key]: value }))
  }

  /* ---- Render ---- */

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-950 via-purple-950 to-slate-950 flex items-center justify-center p-4 md:p-8">
      <div className="w-full max-w-4xl">
        {/* Header */}
        <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight mb-6">
          🐾 WebPet Builder
        </h1>

        <div className="flex flex-col md:flex-row gap-6">
          {/* ── Left panel — Preview ── */}
          <div className="flex-shrink-0">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 shadow-xl">
              <div
                ref={containerRef}
                className="rounded-xl overflow-hidden flex items-center justify-center"
                style={{ width: 300, height: 300 }}
              />
            </div>
          </div>

          {/* ── Right panel — Controls ── */}
          <div className="flex-1 bg-white/10 backdrop-blur-xl rounded-2xl border border-white/10 p-6 space-y-6 shadow-xl">
            {/* Header controls */}
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-xs font-semibold text-white/40 uppercase tracking-widest">
                Controles
              </h2>
              <button
                onClick={() => {
                  const on = toggleAudio()
                  setAudioEnabled(on)
                }}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-mono transition-all cursor-pointer ${
                  audioEnabled
                    ? 'bg-pink-500/20 text-pink-300 ring-1 ring-pink-400/40'
                    : 'bg-white/5 text-white/40 hover:text-white/60 ring-1 ring-white/10'
                }`}
              >
                {audioEnabled ? '🔊 Audio ON' : '🔇 Audio OFF'}
              </button>
            </div>

            {/* Behaviors section */}
            <section>
              <h2 className="text-xs font-semibold text-white/40 uppercase tracking-widest mb-3">
                Comportamientos
              </h2>
              <div className="space-y-3">
                <Toggle
                  id="eyes"
                  checked={behaviors.eyes}
                  onChange={handleToggle('eyes')}
                >
                  Ojos 👀
                </Toggle>
                <Toggle
                  id="blink"
                  checked={behaviors.blink}
                  onChange={handleToggle('blink')}
                >
                  Parpadeo 😴
                </Toggle>
                <Toggle
                  id="click"
                  checked={behaviors.click}
                  onChange={handleToggle('click')}
                >
                  Click 🖱️
                </Toggle>
              </div>
            </section>

            {/* Character section */}
            <section>
              <h2 className="text-xs font-semibold text-white/40 uppercase tracking-widest mb-3">
                Personaje
              </h2>
              <div className="grid grid-cols-3 gap-1.5">
                {CHARACTER_LIST.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => setCharacterState(c.id)}
                    className={`flex items-center gap-2 px-2 py-1.5 rounded-xl text-xs font-medium transition-all duration-200 cursor-pointer ${
                      character === c.id
                        ? 'bg-pink-500/20 text-pink-200 ring-1 ring-pink-400/50'
                        : 'bg-white/5 text-white/50 hover:bg-white/10 hover:text-white/70 ring-1 ring-white/5'
                    }`}
                  >
                    <span
                      className="w-3 h-3 rounded-full shrink-0"
                      style={{ backgroundColor: c.bodyStops[0] }}
                    />
                    <span className="truncate">{c.emoji} {c.label}</span>
                  </button>
                ))}
              </div>
            </section>

            {/* Movement section */}
            <section>
              <h2 className="text-xs font-semibold text-white/40 uppercase tracking-widest mb-3">
                Movimiento
              </h2>
              <div className="space-y-3">
                {/* Mode toggle */}
                <div className="bg-white/5 p-0.5 rounded-xl border border-white/10 flex items-center">
                  <button
                    onClick={() => setMode('fly')}
                    className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      mode === 'fly'
                        ? 'bg-pink-500/20 text-pink-300 border border-pink-500/40'
                        : 'text-white/50 hover:text-white/70'
                    }`}
                  >
                    🛸 Float
                  </button>
                  <button
                    onClick={() => setMode('walk')}
                    className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      mode === 'walk'
                        ? 'bg-pink-500/20 text-pink-300 border border-pink-500/40'
                        : 'text-white/50 hover:text-white/70'
                    }`}
                  >
                    🐾 Walk
                  </button>
                </div>

                {/* Energy slider */}
                <div>
                  <label className="flex items-center justify-between text-sm text-white/70 mb-1.5">
                    <span>Energía</span>
                    <span className="font-mono text-pink-400 text-xs">
                      {energy === 0 ? '0 (Calm)' : energy <= 3 ? `${energy} (Low)` : energy <= 7 ? `${energy} (Hyper)` : `${energy} (MAX ⚡)`}
                    </span>
                  </label>
                  <input
                    type="range"
                    min={0}
                    max={10}
                    value={energy}
                    onChange={(e) => setEnergy(Number(e.target.value))}
                    className="w-full h-1.5 rounded-full appearance-none cursor-pointer
                      bg-white/10 accent-pink-500
                      [&::-webkit-slider-thumb]:appearance-none
                      [&::-webkit-slider-thumb]:w-4
                      [&::-webkit-slider-thumb]:h-4
                      [&::-webkit-slider-thumb]:rounded-full
                      [&::-webkit-slider-thumb]:bg-pink-500
                      [&::-webkit-slider-thumb]:shadow-lg
                      [&::-webkit-slider-thumb]:cursor-pointer
                      [&::-moz-range-thumb]:w-4
                      [&::-moz-range-thumb]:h-4
                      [&::-moz-range-thumb]:rounded-full
                      [&::-moz-range-thumb]:bg-pink-500
                      [&::-moz-range-thumb]:border-0
                      [&::-moz-range-thumb]:shadow-lg
                      [&::-moz-range-thumb]:cursor-pointer"
                  />
                </div>
              </div>
            </section>

            {/* Emotions section */}
            <section>
              <h2 className="text-xs font-semibold text-white/40 uppercase tracking-widest mb-3">
                Emoción
              </h2>
              <div className="flex flex-wrap gap-2">
                {EMOTIONS.map((opt) => (
                  <EmotionButton
                    key={opt.id}
                    option={opt}
                    active={emotion === opt.id}
                    onClick={() => setEmotion(opt.id)}
                  />
                ))}
              </div>
            </section>

            {/* Appearance section */}
            <section>
              <h2 className="text-xs font-semibold text-white/40 uppercase tracking-widest mb-3">
                Cuerpo
              </h2>
              <div className="flex flex-wrap gap-1.5">
                {BODY_OPTIONS.map((opt) => (
                  <button
                    key={opt.id}
                    onClick={() => setBodyType(opt.id)}
                    className={`px-2 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                      bodyType === opt.id
                        ? 'bg-pink-500/20 text-pink-200 ring-1 ring-pink-400/50'
                        : 'bg-white/5 text-white/50 hover:bg-white/10 hover:text-white/70 ring-1 ring-white/5'
                    }`}
                  >
                    {opt.emoji} {opt.label}
                  </button>
                ))}
              </div>
              <h2 className="text-xs font-semibold text-white/40 uppercase tracking-widest mt-3 mb-2">
                Ojos
              </h2>
              <div className="flex flex-wrap gap-1.5">
                {EYE_OPTIONS.map((opt) => (
                  <button
                    key={opt.id}
                    onClick={() => setEyeType(opt.id)}
                    className={`px-2 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                      eyeType === opt.id
                        ? 'bg-pink-500/20 text-pink-200 ring-1 ring-pink-400/50'
                        : 'bg-white/5 text-white/50 hover:bg-white/10 hover:text-white/70 ring-1 ring-white/5'
                    }`}
                  >
                    {opt.emoji} {opt.label}
                  </button>
                ))}
              </div>
              <h2 className="text-xs font-semibold text-white/40 uppercase tracking-widest mt-3 mb-2">
                Brazos
              </h2>
              <div className="flex flex-wrap gap-1.5">
                {ARM_OPTIONS.map((opt) => (
                  <button
                    key={opt.id}
                    onClick={() => setArmType(opt.id)}
                    className={`px-2 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                      armType === opt.id
                        ? 'bg-pink-500/20 text-pink-200 ring-1 ring-pink-400/50'
                        : 'bg-white/5 text-white/50 hover:bg-white/10 hover:text-white/70 ring-1 ring-white/5'
                    }`}
                  >
                    {opt.emoji} {opt.label}
                  </button>
                ))}
              </div>
              <h2 className="text-xs font-semibold text-white/40 uppercase tracking-widest mt-3 mb-2">
                Accesorio
              </h2>
              <div className="flex flex-wrap gap-1.5">
                {HEADGEAR_OPTIONS.map((opt) => (
                  <button
                    key={opt.id}
                    onClick={() => setHeadgearType(opt.id)}
                    className={`px-2 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                      headgearType === opt.id
                        ? 'bg-pink-500/20 text-pink-200 ring-1 ring-pink-400/50'
                        : 'bg-white/5 text-white/50 hover:bg-white/10 hover:text-white/70 ring-1 ring-white/5'
                    }`}
                  >
                    {opt.emoji} {opt.label}
                  </button>
                ))}
              </div>
            </section>

            {/* Original Apariencia section */}
            <section>
              <h2 className="text-xs font-semibold text-white/40 uppercase tracking-widest mb-3">
                Apariencia
              </h2>
              <div className="space-y-5">
                {/* Color */}
                <div>
                  <label className="block text-sm text-white/70 mb-1.5">
                    Color
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={color}
                      onChange={(e) => setColor(e.target.value)}
                      className="w-10 h-10 rounded-lg cursor-pointer border border-white/10 bg-transparent p-0.5"
                    />
                    <span className="text-xs font-mono text-white/40">
                      {color}
                    </span>
                  </div>
                </div>

                {/* Size */}
                <div>
                  <label className="flex items-center justify-between text-sm text-white/70 mb-1.5">
                    <span>Tamaño</span>
                    <span className="font-mono text-purple-400 text-xs">
                      {size}px
                    </span>
                  </label>
                  <input
                    type="range"
                    min={64}
                    max={300}
                    value={size}
                    onChange={(e) => setSize(Number(e.target.value))}
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

                {/* Eye speed */}
                <div>
                  <label className="flex items-center justify-between text-sm text-white/70 mb-1.5">
                    <span>Velocidad ojos</span>
                    <span className="font-mono text-purple-400 text-xs">
                      {eyeSpeed.toFixed(2)}
                    </span>
                  </label>
                  <input
                    type="range"
                    min={0.05}
                    max={0.5}
                    step={0.01}
                    value={eyeSpeed}
                    onChange={(e) => setEyeSpeed(Number(e.target.value))}
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
              </div>
            </section>

            {/* Generate Code */}
            <button
              onClick={() => setShowExport(true)}
              className="w-full py-3 px-4 rounded-xl bg-purple-600 text-white font-medium text-sm hover:bg-purple-500 transition-colors shadow-lg shadow-purple-500/20 cursor-pointer"
            >
              📋 Generate Code &rarr;
            </button>
          </div>
        </div>
      </div>

      {/* Export Modal */}
      {showExport && (
        <ExportModal
          behaviors={Object.entries(behaviors)
            .filter(([, v]) => v)
            .map(([k]) => k)}
          color={color}
          size={size}
          emotion={emotion}
          character={character}
          bodyType={bodyType}
          eyeType={eyeType}
          armType={armType}
          headgearType={headgearType}
          onClose={() => setShowExport(false)}
        />
      )}
    </div>
  )
}

export default App