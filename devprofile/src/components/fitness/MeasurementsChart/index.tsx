/*
  MeasurementsChart — график изменения замеров тела по датам.
  Каждый показатель (вес, талия, грудь и т.д.) — отдельная линия
  своего цвета, точки стоят на реальных датах замера (расстояние
  между точками по X пропорционально числу дней между замерами,
  а не просто порядковому номеру записи). Под графиком — легенда:
  какой цвет что означает и текущее значение.

  Точки по каждой линии нормализуются в свой собственный диапазон
  (min..max этого показателя), а не в общую шкалу — иначе вес в кг
  и обхват бицепса в см на одной оси делали бы почти все линии,
  кроме веса, визуально плоскими.
*/

import { useMemo, useState } from 'react'
import type { BodyMeasurement } from '../../../types/fitness'
import { sortByDateAsc } from '../../../utils/fitnessCalc'

type MetricKey = 'weightKg' | 'chestCm' | 'waistCm' | 'hipsCm' | 'bicepCm' | 'thighCm'

const METRICS: { key: MetricKey; label: string; unit: string; color: string }[] = [
  { key: 'weightKg', label: 'Вес',     unit: 'кг', color: 'var(--dp-accent)' },
  { key: 'waistCm',  label: 'Талия',   unit: 'см', color: 'var(--dp-green)' },
  { key: 'chestCm',  label: 'Грудь',   unit: 'см', color: 'var(--dp-orange)' },
  { key: 'bicepCm',  label: 'Бицепс',  unit: 'см', color: 'var(--dp-red)' },
  { key: 'hipsCm',   label: 'Бёдра',   unit: 'см', color: '#a374db' },
  { key: 'thighCm',  label: 'Бедро',   unit: 'см', color: '#4ec9b0' },
]

const CHART_WIDTH = 640
const CHART_HEIGHT = 200
const PAD_TOP = 14
const PAD_BOTTOM = 24
const PAD_X = 10
const PLOT_HEIGHT = CHART_HEIGHT - PAD_TOP - PAD_BOTTOM
const PLOT_WIDTH = CHART_WIDTH - PAD_X * 2

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })
}

export function MeasurementsChart({ measurements }: { measurements: BodyMeasurement[] }) {
  const [hovered, setHovered] = useState<{ metric: MetricKey; index: number } | null>(null)

  const chronological = useMemo(() => sortByDateAsc(measurements), [measurements])

  if (chronological.length < 2) {
    return (
      <div className="px-4 py-6 text-center text-xs" style={{ color: 'var(--dp-text-muted)', borderBottom: '1px solid var(--dp-border)' }}>
        Добавь ещё один замер, чтобы увидеть график изменений
      </div>
    )
  }

  const firstDate = new Date(chronological[0].date).getTime()
  const lastDate = new Date(chronological[chronological.length - 1].date).getTime()
  const dateSpan = lastDate - firstDate || 1

  function x(dateIso: string): number {
    const t = new Date(dateIso).getTime()
    return PAD_X + ((t - firstDate) / dateSpan) * PLOT_WIDTH
  }

  const lines = METRICS.map((metric) => {
    const values = chronological.map((m) => m[metric.key])
    const min = Math.min(...values)
    const max = Math.max(...values)
    const range = max - min
    const paddedMin = range === 0 ? min - 1 : min - range * 0.15
    const paddedMax = range === 0 ? max + 1 : max + range * 0.15
    const paddedRange = paddedMax - paddedMin

    function y(value: number): number {
      return PAD_TOP + (1 - (value - paddedMin) / paddedRange) * PLOT_HEIGHT
    }

    const points = chronological.map((m) => ({
      cx: x(m.date),
      cy: y(m[metric.key]),
      value: m[metric.key],
      date: m.date,
    }))

    return { ...metric, points, latest: values[values.length - 1] }
  })

  return (
    <div>
      <div className="pb-2">
        <svg
          viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
          width="100%"
          height={CHART_HEIGHT}
          preserveAspectRatio="none"
          style={{ display: 'block', overflow: 'visible' }}
        >
          {lines.map((line) => (
            <g key={line.key}>
              <polyline
                points={line.points.map((p) => `${p.cx},${p.cy}`).join(' ')}
                fill="none"
                stroke={line.color}
                strokeWidth={1.75}
                strokeLinejoin="round"
                strokeLinecap="round"
                opacity={hovered && hovered.metric !== line.key ? 0.25 : 0.9}
              />
              {line.points.map((p, i) => (
                <circle
                  key={i}
                  cx={p.cx}
                  cy={p.cy}
                  r={hovered?.metric === line.key && hovered.index === i ? 4.5 : 3}
                  fill={line.color}
                  stroke="var(--dp-bg-panel)"
                  strokeWidth={1.5}
                  opacity={hovered && hovered.metric !== line.key ? 0.25 : 1}
                  style={{ cursor: 'pointer' }}
                  onMouseEnter={() => setHovered({ metric: line.key, index: i })}
                  onMouseLeave={() => setHovered(null)}
                >
                  <title>{`${line.label}: ${p.value} ${line.unit} — ${formatDate(p.date)}`}</title>
                </circle>
              ))}
            </g>
          ))}

          <text x={PAD_X} y={CHART_HEIGHT - 6} fontSize={10} fill="var(--dp-text-muted)">
            {formatDate(chronological[0].date)}
          </text>
          <text x={CHART_WIDTH - PAD_X} y={CHART_HEIGHT - 6} fontSize={10} fill="var(--dp-text-muted)" textAnchor="end">
            {formatDate(chronological[chronological.length - 1].date)}
          </text>
        </svg>
      </div>

      {/* Легенда — цвет линии и текущее (последнее) значение */}
      <div className="flex flex-wrap gap-x-4 gap-y-1.5">
        {lines.map((line) => (
          <div
            key={line.key}
            className="flex items-center gap-1.5 text-xs"
            style={{ color: 'var(--dp-text-secondary)', cursor: 'pointer' }}
            onMouseEnter={() => setHovered({ metric: line.key, index: line.points.length - 1 })}
            onMouseLeave={() => setHovered(null)}
          >
            <span
              className="shrink-0 rounded-full"
              style={{ width: 8, height: 8, background: line.color }}
            />
            {line.label}
            <span className="font-mono" style={{ color: 'var(--dp-text-primary)' }}>
              {line.latest} {line.unit}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
