/*
  MeasurementsChart — график изменения замеров тела по датам.
  Каждый показатель (вес, талия, грудь и т.д.) — отдельная линия
  своего цвета, точки стоят на реальных датах замера (расстояние
  между точками по X пропорционально числу дней между замерами,
  а не просто порядковому номеру записи).

  Общая шкала слева — целые числа с шагом 10 (см/кг), одна на все
  линии сразу: min/max берутся по всем показателям и округляются
  наружу до ближайшего десятка. Раньше каждая линия нормализовалась
  в свой собственный диапазон (иначе бицепс на фоне веса выглядел
  почти плоским) — от этого отказались в пользу честной общей оси,
  по которой видно и подписи слева, и фоновую сетку.

  Подписи дат снизу — не только первая и последняя точка, а до 6
  штук, равномерно выбранных по индексу среди реальных замеров
  (первая и последняя точка попадают в выборку всегда), так что при
  добавлении новых замеров ось подстраивается сама, без перегрузки
  подписями, если замеров много.
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
const CHART_HEIGHT = 350 // высота под стать соседней панели «Силуэт»
const PAD_TOP = 14
const PAD_BOTTOM = 24
const PAD_LEFT = 32 // место под подписи оси (до 3 цифр)
const PAD_RIGHT = 10
const AXIS_STEP = 10
const MAX_DATE_LABELS = 6
const PLOT_HEIGHT = CHART_HEIGHT - PAD_TOP - PAD_BOTTOM
const PLOT_WIDTH = CHART_WIDTH - PAD_LEFT - PAD_RIGHT

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })
}

// Равномерно выбирает до `max` индексов из [0, length-1], всегда включая первый и последний
function pickIndices(length: number, max: number): number[] {
  if (length <= max) return Array.from({ length }, (_, i) => i)
  const step = (length - 1) / (max - 1)
  const picked = new Set<number>()
  for (let i = 0; i < max; i++) picked.add(Math.round(i * step))
  return Array.from(picked).sort((a, b) => a - b)
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
    return PAD_LEFT + ((t - firstDate) / dateSpan) * PLOT_WIDTH
  }

  // Общий диапазон по всем показателям сразу, округлённый наружу до десятка
  const allValues = chronological.flatMap((m) => METRICS.map((metric) => m[metric.key]))
  const rawMin = Math.min(...allValues)
  const rawMax = Math.max(...allValues)
  let axisMin = Math.floor(rawMin / AXIS_STEP) * AXIS_STEP
  let axisMax = Math.ceil(rawMax / AXIS_STEP) * AXIS_STEP
  if (axisMin === axisMax) {
    axisMin -= AXIS_STEP
    axisMax += AXIS_STEP
  }
  const axisRange = axisMax - axisMin

  function y(value: number): number {
    return PAD_TOP + (1 - (value - axisMin) / axisRange) * PLOT_HEIGHT
  }

  const axisTicks: number[] = []
  for (let v = axisMin; v <= axisMax; v += AXIS_STEP) axisTicks.push(v)

  const dateLabelIndices = pickIndices(chronological.length, MAX_DATE_LABELS)

  const lines = METRICS.map((metric) => {
    const values = chronological.map((m) => m[metric.key])
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
          {/* ── Фоновая сетка + ось значений слева ── */}
          {axisTicks.map((v) => (
            <g key={v}>
              <line
                x1={PAD_LEFT} y1={y(v)} x2={CHART_WIDTH - PAD_RIGHT} y2={y(v)}
                stroke="var(--dp-border)"
                strokeWidth={1}
                opacity={0.4}
              />
              <text x={PAD_LEFT - 6} y={y(v) + 3} fontSize={9} textAnchor="end" fill="var(--dp-text-muted)">
                {v}
              </text>
            </g>
          ))}
          {dateLabelIndices.map((idx) => {
            const cx = x(chronological[idx].date)
            return (
              <line
                key={idx}
                x1={cx} y1={PAD_TOP} x2={cx} y2={CHART_HEIGHT - PAD_BOTTOM}
                stroke="var(--dp-border)"
                strokeWidth={1}
                opacity={0.25}
              />
            )
          })}

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

          {dateLabelIndices.map((idx, i) => {
            const isFirst = i === 0
            const isLast = i === dateLabelIndices.length - 1
            const anchor = isFirst ? 'start' : isLast ? 'end' : 'middle'
            return (
              <text
                key={idx}
                x={x(chronological[idx].date)}
                y={CHART_HEIGHT - 6}
                fontSize={10}
                fill="var(--dp-text-muted)"
                textAnchor={anchor}
              >
                {formatDate(chronological[idx].date)}
              </text>
            )
          })}
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
