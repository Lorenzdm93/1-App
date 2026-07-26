/**
 * Emoji confetti — pure CSS, ~2 KB, no dependencies. Renders a fixed layer of
 * drifting emoji for celebratory moments (workout saved with PRs, week won).
 * Honors prefers-reduced-motion by rendering nothing at all.
 */
import { useMemo } from 'react'

const SETS: Record<string, string[]> = {
  workout: ['🎉', '💪', '🔥', '⚡️', '🏋️', '✨', '🏆'],
  week: ['🎉', '✨', '📈', '🏆', '💚', '🎊'],
}

export default function Confetti({ kind = 'week', count = 26 }: { kind?: 'workout' | 'week'; count?: number }) {
  const parts = useMemo(() => {
    const pool = SETS[kind] ?? SETS.week
    return Array.from({ length: count }, (_, i) => ({
      id: i,
      emoji: pool[Math.floor(Math.random() * pool.length)],
      left: Math.random() * 100,
      delay: Math.random() * 0.9,
      dur: 2.6 + Math.random() * 2,
      size: 16 + Math.random() * 14,
      sway: (Math.random() - 0.5) * 80,
    }))
  }, [kind, count])
  return (
    <div className="confetti-layer" aria-hidden="true">
      {parts.map((p) => (
        <span
          key={p.id}
          style={{
            left: `${p.left}%`,
            fontSize: p.size,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.dur}s`,
            ['--sway' as string]: `${p.sway}px`,
          }}
        >
          {p.emoji}
        </span>
      ))}
    </div>
  )
}
