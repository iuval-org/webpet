import { useCallback, useState } from 'react'

/* -------------------------------------------------------- */
/*  Types                                                   */
/* -------------------------------------------------------- */

interface ExportModalProps {
  behaviors: string[] // active behavior names
  color: string // hex with #, e.g. "#ff6b6b"
  size: number
  emotion?: string // current emotion
  character?: string // current character
  onClose: () => void
}

/* -------------------------------------------------------- */
/*  Helpers                                                 */
/* -------------------------------------------------------- */

const BASE_URL = import.meta.env.DEV
  ? window.location.origin
  : 'https://pets.webpet.dev'

function serializeBehaviors(names: string[]): string {
  // Map internal names to display-friendly Spanish
  const map: Record<string, string> = {
    ojos: 'ojos',
    eyes: 'ojos',
    blink: 'parpadeo',
    parpadeo: 'parpadeo',
    click: 'click',
  }
  return names.map((n) => map[n] ?? n).join(',')
}

function buildUrl(behaviors: string[], color: string, size: number, emotion?: string, character?: string): string {
  const b = serializeBehaviors(behaviors)
  const c = color.replace('#', '')
  const params = new URLSearchParams()
  if (emotion && emotion !== 'neutral') params.set('emotion', emotion)
  if (character && character !== 'gloop') params.set('character', character)
  const qs = params.toString()
  return `${BASE_URL}/p/${b}/${c}/${size}${qs ? '?' + qs : ''}`
}

function buildDevUrl(
  behaviors: string[],
  color: string,
  size: number,
  emotion?: string,
  character?: string,
): string {
  const b = serializeBehaviors(behaviors)
  const c = color.replace('#', '')
  let url = `${BASE_URL}/?pet=${b}&color=${c}&size=${size}`
  if (emotion && emotion !== 'neutral') url += `&emotion=${emotion}`
  if (character && character !== 'gloop') url += `&character=${character}`
  return url
}

function estimateBundleSize(behaviors: string[]): string {
  // Rough estimates per behavior module
  const baseSize = 3.2 // kB — engine core
  const perBehavior: Record<string, number> = {
    ojos: 1.8,
    eyes: 1.8,
    parpadeo: 1.2,
    blink: 1.2,
    click: 1.5,
  }
  const behaviorSize = behaviors.reduce(
    (acc, n) => acc + (perBehavior[n] ?? 1.0),
    0,
  )
  return `${(baseSize + behaviorSize).toFixed(1)} kB`
}

/* -------------------------------------------------------- */
/*  Component                                               */
/* -------------------------------------------------------- */

export default function ExportModal({
  behaviors,
  color,
  size,
  emotion,
  character,
  onClose,
}: ExportModalProps) {
  const [copied, setCopied] = useState(false)

  const isDev = import.meta.env.DEV
  const fullUrl = isDev
    ? buildDevUrl(behaviors, color, size, emotion, character)
    : buildUrl(behaviors, color, size, emotion, character)

  const scriptTag = `<script src="${fullUrl}" async></script>`
  const estimatedSize = estimateBundleSize(behaviors)

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(scriptTag)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Fallback: select text range
      const el = document.getElementById('script-tag-text')
      if (el) {
        const range = document.createRange()
        range.selectNodeContents(el)
        const selection = window.getSelection()
        selection?.removeAllRanges()
        selection?.addRange(range)
        document.execCommand('copy')
        selection?.removeAllRanges()
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      }
    }
  }, [scriptTag])

  const handleOpenStandalone = useCallback(() => {
    window.open(fullUrl, '_blank', 'noopener,noreferrer')
  }, [fullUrl])

  /* ————— Overlay ————— */
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={(e) => {
        // Close on backdrop click
        if (e.target === e.currentTarget) onClose()
      }}
    >
      {/* ————— Card ————— */}
      <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-white/10 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-2">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
            📋 Export Pet
          </h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors text-xl leading-none"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="px-6 pb-6 space-y-5">
          {/* Bundle size badge */}
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            <span className="inline-flex items-center gap-1 rounded-full bg-purple-100 dark:bg-purple-900/30 px-2.5 py-0.5 text-purple-700 dark:text-purple-300 font-medium">
              ⚡ {estimatedSize}
            </span>
            <span>minified + gzipped</span>
          </div>

          {/* Script tag */}
          <div>
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
              Script Tag
            </label>
            <div className="relative">
              <pre
                id="script-tag-text"
                className="overflow-x-auto rounded-xl bg-slate-950 dark:bg-slate-800 p-3 text-xs font-mono text-green-400 leading-relaxed border border-white/5"
              >
                {scriptTag}
              </pre>
            </div>
          </div>

          {/* URL preview */}
          <div>
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
              Standalone URL
            </label>
            <p className="text-sm font-mono text-slate-700 dark:text-slate-300 truncate bg-slate-100 dark:bg-slate-800/50 rounded-lg px-3 py-2 border border-white/5">
              {fullUrl}
            </p>
          </div>

          {/* Config summary */}
          <div className="flex flex-wrap gap-2 text-xs">
            <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 dark:bg-slate-800 px-2 py-1 text-slate-600 dark:text-slate-300">
              🎨 {color}
            </span>
            <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 dark:bg-slate-800 px-2 py-1 text-slate-600 dark:text-slate-300">
              📐 {size}px
            </span>
            {emotion && (
              <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 dark:bg-slate-800 px-2 py-1 text-slate-600 dark:text-slate-300">
                😌 {emotion}
              </span>
            )}
            {character && (
              <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 dark:bg-slate-800 px-2 py-1 text-slate-600 dark:text-slate-300">
                👾 {character}
              </span>
            )}
            {behaviors.map((b) => (
              <span
                key={b}
                className="inline-flex items-center gap-1 rounded-md bg-slate-100 dark:bg-slate-800 px-2 py-1 text-slate-600 dark:text-slate-300"
              >
                🧩 {b}
              </span>
            ))}
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3 pt-1">
            <button
              onClick={handleCopy}
              className={`flex-1 py-2.5 px-4 rounded-xl font-medium text-sm transition-all duration-200 ${
                copied
                  ? 'bg-green-500 text-white shadow-lg shadow-green-500/25'
                  : 'bg-purple-600 text-white hover:bg-purple-500 shadow-lg shadow-purple-500/20'
              }`}
            >
              {copied ? '✅ Copied!' : '📋 Copy to clipboard'}
            </button>
            <button
              onClick={handleOpenStandalone}
              className="flex-1 py-2.5 px-4 rounded-xl font-medium text-sm bg-white/10 text-slate-700 dark:text-white border border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/20 transition-colors"
            >
              Open standalone →
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}