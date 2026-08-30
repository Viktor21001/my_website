/*
  Stopwatch — секундомер вместо таймера отдыха. Полностью локальное
  состояние, без store/бэкенда. Время считается не наивным декрементом на
  каждый тик (дрейфует при троттлинге фоновой вкладки), а как разница
  между Date.now() и моментом старта текущего отрезка — тик раз в 50мс
  только форсирует перерисовку.

  Круг — SVG-циферблат: цифровое время в центре и две стрелки, обе делают
  полный оборот за 60 секунд (как секундная стрелка обычного секундомера):
  «общая» — с начала запуска (не сбрасывается кругами), «круговая» —
  с последнего круга (сбрасывается на 12 часов при каждом «Круге»).

  Состояния и подписи кнопок — ровно как в сценарии:
  idle (одна кнопка «Старт») → running (Круг слева / Стоп справа) →
  paused (Сбросить секундомер слева / Продолжить справа). История кругов
  видна во время running и paused, очищается только по «Сбросить секундомер».
*/

import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { staggerItemVariants } from '../../../hooks/useAnimatedMount'
import { PanelHeader } from '../../shared/PanelHeader'

type Status = 'idle' | 'running' | 'paused'

interface Lap {
  lapNumber: number
  lapTimeMs: number
  totalTimeMs: number
}

const DIAL_CENTER = 100
const DIAL_RADIUS = 88

function formatStopwatch(ms: number): string {
  const totalTenths = Math.floor(ms / 100)
  const tenths = totalTenths % 10
  const totalSeconds = Math.floor(ms / 1000)
  const seconds = totalSeconds % 60
  const minutes = Math.floor(totalSeconds / 60)
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${tenths}`
}

// Обе стрелки — секундные, полный оборот за 60с (как на обычном секундомере)
function handAngle(ms: number): number {
  return ((ms / 1000) % 60) / 60 * 360
}

function Hand({ angleDeg, length, color, width }: { angleDeg: number; length: number; color: string; width: number }) {
  const rad = ((angleDeg - 90) * Math.PI) / 180
  const x2 = DIAL_CENTER + length * Math.cos(rad)
  const y2 = DIAL_CENTER + length * Math.sin(rad)
  return (
    <line
      x1={DIAL_CENTER} y1={DIAL_CENTER} x2={x2} y2={y2}
      stroke={color} strokeWidth={width} strokeLinecap="round"
    />
  )
}

export function Stopwatch() {
  const [status, setStatus] = useState<Status>('idle')
  const [laps, setLaps] = useState<Lap[]>([]) // самый новый круг — первый
  // elapsedMs — обычный state, а не Date.now()/ref, читаемые прямо в рендере
  // (это нарушало бы чистоту рендера) — обновляется только из тикающего
  // интервала и обработчиков кликов, снаружи рендера
  const [elapsedMs, setElapsedMs] = useState(0)

  const accumulatedRef = useRef(0) // мс, накопленные до текущего отрезка
  const runningSinceRef = useRef<number | null>(null)

  useEffect(() => {
    if (status !== 'running') return
    const id = setInterval(() => {
      if (runningSinceRef.current !== null) {
        setElapsedMs(accumulatedRef.current + (Date.now() - runningSinceRef.current))
      }
    }, 50)
    return () => clearInterval(id)
  }, [status])

  function handleStart() {
    runningSinceRef.current = Date.now()
    setStatus('running')
  }
  function handleStop() {
    if (runningSinceRef.current !== null) {
      accumulatedRef.current += Date.now() - runningSinceRef.current
    }
    runningSinceRef.current = null
    setElapsedMs(accumulatedRef.current)
    setStatus('paused')
  }
  function handleResume() {
    runningSinceRef.current = Date.now()
    setStatus('running')
  }
  function handleLap() {
    const prevTotal = laps[0]?.totalTimeMs ?? 0
    setLaps((prev) => [
      { lapNumber: prev.length + 1, lapTimeMs: elapsedMs - prevTotal, totalTimeMs: elapsedMs },
      ...prev,
    ])
  }
  function handleReset() {
    accumulatedRef.current = 0
    runningSinceRef.current = null
    setElapsedMs(0)
    setLaps([])
    setStatus('idle')
  }

  const lastLapTotalMs = laps[0]?.totalTimeMs ?? 0
  const totalHandAngle = handAngle(elapsedMs)
  const lapHandAngle = handAngle(elapsedMs - lastLapTotalMs)

  return (
    <motion.div className="dp-panel" variants={staggerItemVariants}>
      <PanelHeader title="Секундомер" />

      <div className="p-4 flex flex-col items-center gap-4">
        <svg viewBox="0 0 200 200" width={180} height={180}>
          <circle
            cx={DIAL_CENTER} cy={DIAL_CENTER} r={DIAL_RADIUS}
            fill="var(--dp-bg-card)" stroke="var(--dp-border)" strokeWidth={2}
          />
          {Array.from({ length: 12 }).map((_, i) => {
            const angle = ((i * 30 - 90) * Math.PI) / 180
            const inner = i % 3 === 0 ? DIAL_RADIUS - 12 : DIAL_RADIUS - 7
            const x1 = DIAL_CENTER + inner * Math.cos(angle)
            const y1 = DIAL_CENTER + inner * Math.sin(angle)
            const x2 = DIAL_CENTER + (DIAL_RADIUS - 2) * Math.cos(angle)
            const y2 = DIAL_CENTER + (DIAL_RADIUS - 2) * Math.sin(angle)
            return (
              <line
                key={i} x1={x1} y1={y1} x2={x2} y2={y2}
                stroke="var(--dp-border-light)" strokeWidth={i % 3 === 0 ? 2 : 1}
              />
            )
          })}

          <Hand angleDeg={totalHandAngle} length={DIAL_RADIUS - 16} color="var(--dp-accent)" width={2.5} />
          <Hand angleDeg={lapHandAngle} length={DIAL_RADIUS - 34} color="var(--dp-orange)" width={2.5} />
          <circle cx={DIAL_CENTER} cy={DIAL_CENTER} r={4} fill="var(--dp-text-white)" />

          <text
            x={DIAL_CENTER} y={DIAL_CENTER + 40} textAnchor="middle"
            fontSize={17} fontFamily="inherit" fontWeight={700}
            fill="var(--dp-text-white)" className="font-mono tabular-nums"
          >
            {formatStopwatch(elapsedMs)}
          </text>
        </svg>

        <div className="flex gap-3 text-xs" style={{ color: 'var(--dp-text-muted)' }}>
          <span><span style={{ color: 'var(--dp-accent)' }}>●</span> общее</span>
          <span><span style={{ color: 'var(--dp-orange)' }}>●</span> круг</span>
        </div>

        {status === 'idle' ? (
          <button onClick={handleStart} className="dp-btn-primary w-full">
            ▶ Старт
          </button>
        ) : (
          <div className="flex gap-2 w-full">
            {status === 'running' ? (
              <>
                <button onClick={handleLap} className="dp-btn-ghost flex-1 text-xs">
                  Круг
                </button>
                <button onClick={handleStop} className="dp-btn-primary flex-1 text-xs">
                  ⏸ Стоп
                </button>
              </>
            ) : (
              <>
                <button onClick={handleReset} className="dp-btn-ghost flex-1 text-xs">
                  ⟲ Сбросить секундомер
                </button>
                <button onClick={handleResume} className="dp-btn-primary flex-1 text-xs">
                  ▶ Продолжить
                </button>
              </>
            )}
          </div>
        )}

        {laps.length > 0 && (
          <div className="w-full flex flex-col" style={{ maxHeight: 160, overflowY: 'auto' }}>
            <div
              className="grid grid-cols-3 text-xs pb-1 mb-1"
              style={{ color: 'var(--dp-text-muted)', borderBottom: '1px solid var(--dp-border)' }}
            >
              <span>Круг</span>
              <span className="text-right">Время круга</span>
              <span className="text-right">Общее время</span>
            </div>
            {laps.map((lap) => (
              <div key={lap.lapNumber} className="grid grid-cols-3 text-xs font-mono py-0.5" style={{ color: 'var(--dp-text-secondary)' }}>
                <span>#{lap.lapNumber}</span>
                <span className="text-right">{formatStopwatch(lap.lapTimeMs)}</span>
                <span className="text-right">{formatStopwatch(lap.totalTimeMs)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  )
}
