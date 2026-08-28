/*
  BodyDiagram — силуэт фигуры, ширина частей которого меняется по
  последнему замеру (грудь/талия/бёдра/бицепс/бедро — те же поля,
  что и в форме и истории замеров), с подписями и
  линиями-выносками как на референсе с разметкой замеров, только в
  стиле сайта: SVG-контур вместо реалистичного рисунка, без сторонних
  библиотек.

  Каждое значение переводится в масштаб ширины через clamp+lerp в
  своём биологически разумном диапазоне (см. RANGES) — так силуэт
  реагирует на любое реальное значение, а не только на историю
  замеров конкретного пользователя (в отличие от графика, диаграмма
  не требует двух точек — достаточно одного замера).
*/

import { useMemo } from 'react'
import type { BodyMeasurement } from '../../../types/fitness'
import { useMeasurements } from '../../../hooks/useFitnessData'
import { sortByDateAsc } from '../../../utils/fitnessCalc'
import { EmptyCard } from '../../shared/Card'

const RANGES = {
  chestCm: { min: 75, max: 135 },
  waistCm: { min: 60, max: 125 },
  hipsCm:  { min: 75, max: 135 },
  bicepCm: { min: 24, max: 48 },
  thighCm: { min: 40, max: 75 },
} as const

const SCALE_MIN = 0.8
const SCALE_MAX = 1.3

function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v))
}

function scaleFor(value: number, key: keyof typeof RANGES): number {
  const { min, max } = RANGES[key]
  const t = clamp((value - min) / (max - min), 0, 1)
  return SCALE_MIN + t * (SCALE_MAX - SCALE_MIN)
}

// Базовые (при масштабе 1.0) полуширины частей тела в координатах viewBox
const BASE = {
  chestHalf: 32,
  waistHalf: 24,
  hipsHalf:  30,
  bicepHalf: 9,
  thighHalf: 13,
}

const ANKLE_HALF = 9 // фиксированная полуширина щиколотки — эта часть тела не замеряется

const CX = 120
const Y = {
  head: 28,
  neckTop: 44,
  shoulders: 60,
  chestMid: 92,
  waist: 140,
  hips: 168,
  armWrist: 208,
  thigh: 224, // самая широкая точка ноги — сюда указывает замер "Бедро", а не к щиколотке
  legEnd: 328,
  footEnd: 344,
}

function poly(points: [number, number][]): string {
  return points.map(([x, y]) => `${x},${y}`).join(' ')
}

export function BodyDiagram() {
  const { measurements } = useMeasurements()
  const latest = useMemo(() => sortByDateAsc(measurements).at(-1), [measurements])

  if (!latest) {
    return (
      <div className="dp-panel overflow-hidden" style={{ width: 230 }}>
        <div className="dp-section-title">Силуэт</div>
        <EmptyCard message="Добавь замер, чтобы увидеть силуэт" />
      </div>
    )
  }

  return <BodyDiagramFigure measurement={latest} />
}

function BodyDiagramFigure({ measurement: m }: { measurement: BodyMeasurement }) {
  const chestHalf = BASE.chestHalf * scaleFor(m.chestCm, 'chestCm')
  const waistHalf = BASE.waistHalf * scaleFor(m.waistCm, 'waistCm')
  const hipsHalf  = BASE.hipsHalf  * scaleFor(m.hipsCm, 'hipsCm')
  const bicepHalf = BASE.bicepHalf * scaleFor(m.bicepCm, 'bicepCm')
  const thighHalf = BASE.thighHalf * scaleFor(m.thighCm, 'thighCm')

  // Торс — многоугольник по 4 опорным рядам (плечи → грудь → талия → бёдра)
  const torso = poly([
    [CX - chestHalf, Y.shoulders],
    [CX - chestHalf * 0.92, Y.chestMid],
    [CX - waistHalf, Y.waist],
    [CX - hipsHalf, Y.hips],
    [CX + hipsHalf, Y.hips],
    [CX + waistHalf, Y.waist],
    [CX + chestHalf * 0.92, Y.chestMid],
    [CX + chestHalf, Y.shoulders],
  ])

  // Руки — трапеция от плеча до запястья, снаружи торса
  const armCenterOffset = chestHalf + bicepHalf * 0.9
  function armPoly(side: 1 | -1): string {
    const cx = CX + side * armCenterOffset
    return poly([
      [cx - bicepHalf, Y.shoulders + 5],
      [cx - bicepHalf * 0.55, Y.armWrist],
      [cx + bicepHalf * 0.55, Y.armWrist],
      [cx + bicepHalf, Y.shoulders + 5],
    ])
  }

  /*
    Нога — от бедра (таз) через самую широкую точку — верхнюю часть ноги
    на уровне Y.thigh, которую и задаёт замер "Бедро" — сужается к
    щиколотке (Y.legEnd). Раньше замер "Бедро" ошибочно управлял
    шириной у щиколотки, из-за чего широкая часть ноги оказывалась
    внизу, у стоп.
  */
  function legPoly(side: 1 | -1): string {
    const innerGap = 4
    const hipInner = CX + side * innerGap
    const hipOuter = CX + side * hipsHalf * 0.95
    const thighOuter = CX + side * thighHalf
    const thighInner = CX + side * thighHalf * 0.35
    const ankleOuter = CX + side * ANKLE_HALF
    const ankleInner = CX + side * ANKLE_HALF * 0.3
    return poly([
      [hipInner, Y.hips],
      [hipOuter, Y.hips],
      [thighOuter, Y.thigh],
      [ankleOuter, Y.legEnd],
      [ankleInner, Y.legEnd],
      [thighInner, Y.thigh],
    ])
  }

  const figureStyle = { fill: 'var(--dp-bg-card)', stroke: 'var(--dp-border-light)', strokeWidth: 1.5 }

  return (
    <div className="dp-panel overflow-hidden" style={{ width: 230 }}>
      <div className="dp-section-title">Силуэт</div>

      <div className="p-2">
        <svg viewBox="0 0 240 380" width="100%" style={{ display: 'block', overflow: 'visible' }}>
          {/* Ноги */}
          <polygon points={legPoly(-1)} style={figureStyle} />
          <polygon points={legPoly(1)} style={figureStyle} />
          {/* Ступни */}
          <ellipse cx={CX - ANKLE_HALF * 0.6} cy={Y.footEnd} rx={12} ry={5} style={figureStyle} />
          <ellipse cx={CX + ANKLE_HALF * 0.6} cy={Y.footEnd} rx={12} ry={5} style={figureStyle} />

          {/* Руки */}
          <polygon points={armPoly(-1)} style={figureStyle} />
          <polygon points={armPoly(1)} style={figureStyle} />
          {/* Кисти */}
          <circle cx={CX - armCenterOffset} cy={Y.armWrist + 6} r={6} style={figureStyle} />
          <circle cx={CX + armCenterOffset} cy={Y.armWrist + 6} r={6} style={figureStyle} />

          {/* Торс */}
          <polygon points={torso} style={figureStyle} />

          {/* Шея и голова */}
          <rect x={CX - 8} y={Y.neckTop} width={16} height={Y.shoulders - Y.neckTop + 4} style={figureStyle} />
          <circle cx={CX} cy={Y.head} r={17} style={figureStyle} />

          {/* ── Подписи-выноски ── */}
          <Callout label="Грудь" value={`${m.chestCm} см`} x1={30} y1={Y.chestMid - 10} x2={CX - chestHalf} y2={Y.chestMid - 10} align="left" />
          <Callout label="Талия" value={`${m.waistCm} см`} x1={30} y1={Y.waist} x2={CX - waistHalf} y2={Y.waist} align="left" />
          <Callout label="Бедро" value={`${m.thighCm} см`} x1={30} y1={Y.thigh} x2={CX - thighHalf} y2={Y.thigh} align="left" />

          <Callout label="Бицепс" value={`${m.bicepCm} см`} x1={210} y1={Y.shoulders + 12} x2={CX + armCenterOffset + bicepHalf} y2={Y.shoulders + 12} align="right" />
          <Callout label="Бёдра" value={`${m.hipsCm} см`} x1={210} y1={Y.hips} x2={CX + hipsHalf} y2={Y.hips} align="right" />
        </svg>
      </div>

      <div
        className="flex items-center justify-center gap-1.5 pb-3 text-xs"
        style={{ color: 'var(--dp-text-secondary)' }}
      >
        ⚖ Вес <span className="font-mono" style={{ color: 'var(--dp-text-primary)' }}>{m.weightKg} кг</span>
      </div>
    </div>
  )
}

function Callout({
  label, value, x1, y1, x2, y2, align,
}: {
  label: string
  value: string
  x1: number
  y1: number
  x2: number
  y2: number
  align: 'left' | 'right'
}) {
  return (
    <g>
      <line
        x1={x1} y1={y1} x2={x2} y2={y2}
        stroke="var(--dp-accent)"
        strokeWidth={1}
        strokeDasharray="2 2"
      />
      <circle cx={x2} cy={y2} r={2} fill="var(--dp-accent)" />
      <text
        x={x1} y={y1 - 6}
        fontSize={10}
        fontWeight={600}
        textAnchor={align === 'left' ? 'start' : 'end'}
        fill="var(--dp-text-white)"
      >
        {label}
      </text>
      <text
        x={x1} y={y1 + 10}
        fontSize={9}
        fontFamily="monospace"
        textAnchor={align === 'left' ? 'start' : 'end'}
        fill="var(--dp-text-code)"
      >
        {value}
      </text>
    </g>
  )
}
