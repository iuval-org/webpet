import { useEffect, useRef } from 'react'
import { createPet } from './engine'
import { createEyesBehavior, createBlinkBehavior, createClickBehavior } from './engine/behaviors'

function App() {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const pet = createPet({
      id: 'demo',
      color: '#ff6b6b',
      size: 120,
      behaviors: [
        createEyesBehavior({ irisColor: '#4a90d9', followSpeed: 0.15 }),
        createBlinkBehavior({ interval: 3000, duration: 150 }),
        createClickBehavior({ intensity: 0.6, reactionType: 'random' }),
      ],
    })

    if (containerRef.current) {
      pet.mount(containerRef.current)
    }

    return () => {
      pet.unmount()
    }
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-slate-900 flex flex-col items-center justify-center gap-6 px-6">
      <h1 className="text-4xl md:text-5xl font-bold text-white tracking-tight">
        WebPet — Demo
      </h1>

      <p className="text-base md:text-lg text-purple-200/80 text-center max-w-md">
        Mové el mouse sobre el canvas y hacé click
      </p>

      <div
        ref={containerRef}
        className="rounded-2xl border border-white/15 bg-white/5 shadow-2xl"
        style={{ width: 300, height: 300 }}
      />

      <p className="text-sm text-purple-300/60 text-center">
        Behaviors: Eyes 👀 + Blink 😴 + Click 🖱️
      </p>
    </div>
  )
}

export default App