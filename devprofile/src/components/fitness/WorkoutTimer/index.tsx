/*
  WorkoutTimer — рабочий таймер отдыха между подходами.
  Полностью локальное состояние, без store/бэкенда —
  единственный по-настоящему интерактивный элемент в моковой оболочке.
*/

import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { staggerItemVariants } from '../../../hooks/useAnimatedMount'

const PRESETS = [30, 60, 90, 120]

function formatTime(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60)
  const s = totalSeconds % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

export function WorkoutTimer() {
  const [duration, setDuration] = useState(90)
  const [remaining, setRemaining] = useState(90)
  const [isRunning, setIsRunning] = useState(false)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (!isRunning) return

    intervalRef.current = setInterval(() => {
      setRemaining((r) => {
        if (r <= 1) {
          setIsRunning(false)
          return 0
        }
        return r - 1
      })
    }, 1000)

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [isRunning])

  const isDone = remaining === 0
  const progressPercent = duration > 0 ? ((duration - remaining) / duration) * 100 : 0

  function handlePreset(seconds: number) {
    setIsRunning(false)
    setDuration(seconds)
    setRemaining(seconds)
  }

  function handleStartPause() {
    if (isDone) {
      setRemaining(duration)
      setIsRunning(true)
    } else {
      setIsRunning((r) => !r)
    }
  }

  function handleReset() {
    setIsRunning(false)
    setRemaining(duration)
  }

  return (
    <motion.div className="dp-panel" variants={staggerItemVariants}>
      <div className="dp-section-title">Таймер отдыха</div>

      <div className="p-4 flex flex-col items-center gap-4">
        <div
          className="font-mono font-bold tabular-nums"
          style={{
            fontSize: 40,
            color: isDone ? 'var(--dp-green)' : 'var(--dp-text-white)',
          }}
        >
          {formatTime(remaining)}
        </div>

        <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--dp-border)' }}>
          <motion.div
            className="h-full rounded-full"
            style={{ background: isDone ? 'var(--dp-green)' : 'var(--dp-accent)' }}
            animate={{ width: `${progressPercent}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>

        <div className="flex gap-2">
          {PRESETS.map((p) => (
            <button
              key={p}
              onClick={() => handlePreset(p)}
              className="dp-btn-ghost text-xs"
              style={duration === p ? { borderColor: 'var(--dp-accent)', color: 'var(--dp-accent-bright)' } : undefined}
            >
              {p}с
            </button>
          ))}
        </div>

        <div className="flex gap-2 w-full">
          <button onClick={handleStartPause} className="dp-btn-primary flex-1">
            {isDone ? '↻ Заново' : isRunning ? '⏸ Пауза' : '▶ Старт'}
          </button>
          <button onClick={handleReset} className="dp-btn-ghost">
            ⟲
          </button>
        </div>
      </div>
    </motion.div>
  )
}
