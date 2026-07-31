import { useEffect, useRef, useState } from 'react'
import type { PetInstance } from './engine'
import { createPet } from './engine'
import { createEyesBehavior, createBlinkBehavior, createClickBehavior } from './engine/behaviors'

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

function App() {
  const containerRef = useRef<HTMLDivElement>(null)
  const petRef = useRef<PetInstance | null>(null)

  const [behaviors, setBehaviors] = useState<BehaviorState>(ALL_ACTIVE)
  const [color, setColor] = useState('#ff6b6b')
  const [size, setSize] = useState(120)
  const [eyeSpeed, setEyeSpeed] = useState(0.15)

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

    const pet = createPet({
      id: 'builder',
      color,
      size,
      behaviors: behaviorList,
    })

    /* Mount into the container */
    if (containerRef.current) {
      pet.mount(containerRef.current)
    }

    petRef.current = pet

    return () => {
      pet.unmount()
      petRef.current = null
    }
  }, [behaviors, color, size, eyeSpeed])

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

            {/* Appearance section */}
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
                    min={32}
                    max={200}
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

            {/* Generate Code placeholder (ticket #7) */}
            <button
              disabled
              className="w-full py-3 px-4 rounded-xl bg-white/5 text-white/30 border border-white/10 font-medium text-sm cursor-not-allowed transition-colors"
            >
              📋 Generate Code &rarr; (ticket #7)
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default App