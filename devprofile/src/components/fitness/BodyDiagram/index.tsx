/*
  BodyDiagram — контур фигуры по точкам, вручную размеченным пользователем
  на референсной анатомической иллюстрации (обвёл силуэт координатами).
  Правая половина в исходных точках была неполной (рука обрывалась на
  бицепсе) — по договорённости с пользователем зеркалим левую половину,
  так фигура всегда симметрична и без дыр в данных.

  Формат — контурная линия без заливки (как на референсе), а не сплошной
  силуэт: три обведённые пользователем линии (голова, рука, нога+бок
  торса) рендерятся как открытые сглаженные пути (smoothOpenPath — та же
  идея квадратичных кривых через середины отрезков, что и раньше, только
  для незамкнутой ломаной).

  Между рукой и ногой в исходной трассировке есть разрыв — верх торса
  (подмышка → грудь → талия) не был обведён отдельной линией. Эта часть
  дорисована как синтетические опорные точки (TORSO_BRIDGE_PTS) и
  сглаживается вместе с ногой в одну линию.

  Динамика: контур не перерисовывается с нуля под замеры — точки остаются
  те же (сохраняется характер обведённой линии), но каждая точка сдвигается
  по X от своей анатомической оси на коэффициент масштаба, который плавно
  меняется по Y между опорными высотами (грудь/талия/бёдра/бедро на торсе
  и ноге, бицепс на руке) — тот же принцип lerp/clamp, что и в предыдущей
  версии, только применяется поверх реальных, а не сгенерированных точек.
*/

import { useMemo } from 'react'
import type { BodyMeasurement } from '../../../types/fitness'
import { useMeasurements } from '../../../hooks/useFitnessData'
import { sortByDateAsc } from '../../../utils/fitnessCalc'
import { EmptyCard } from '../../shared/Card'

type Pt = [number, number]

// ── Точки, обведённые пользователем по референсу (авто-разбито по разрывам между соседними точками) ──
const HEAD_PTS: Pt[] = [[87,11],[81,12],[76,14],[72,19],[70,23],[69,28],[69,33],[69,37],[67,37],[66,37],[65,40],[66,43],[67,46],[68,49],[70,52],[72,54],[73,57],[73,61],[74,64],[75,66],[79,70],[81,70],[86,70],[89,70],[93,70],[97,67],[100,66],[102,64],[103,61],[102,57],[102,54],[105,52],[107,50],[109,47],[109,44],[109,41],[110,38],[110,36],[106,37],[106,33],[107,30],[107,28],[107,26],[106,23],[105,20],[103,18],[101,17],[98,14],[95,13],[91,12],[88,11]]

// Плечо → кисть → обратно вверх по внутреннему краю руки
const ARM_PTS: Pt[] = [[74,68],[74,72],[72,75],[70,77],[63,79],[63,82],[58,83],[56,85],[50,86],[48,86],[44,87],[39,88],[36,90],[34,93],[30,98],[29,101],[27,104],[26,107],[25,111],[25,114],[26,118],[26,121],[26,124],[26,126],[26,127],[26,129],[25,130],[24,132],[24,135],[22,144],[22,147],[23,153],[22,157],[22,162],[22,166],[21,169],[20,173],[20,177],[20,180],[20,185],[20,190],[20,193],[20,195],[20,198],[20,202],[21,205],[20,210],[20,214],[20,218],[21,222],[21,228],[22,230],[22,234],[23,237],[23,240],[24,243],[25,245],[25,248],[25,252],[24,256],[23,259],[23,263],[24,266],[26,271],[29,272],[32,275],[36,276],[38,275],[41,274],[43,272],[43,269],[42,268],[41,266],[40,263],[39,261],[39,257],[38,256],[42,265],[42,260],[43,258],[44,254],[42,252],[39,250],[38,247],[37,245],[36,242],[34,239],[34,235],[34,232],[35,227],[37,223],[37,220],[38,216],[39,210],[39,207],[40,203],[40,199],[40,197],[41,191],[41,186],[40,181],[40,177],[41,172],[41,165],[42,157],[43,154],[44,148],[45,143],[45,140],[45,133],[44,130],[43,122],[45,123],[46,125],[49,127],[51,130],[54,132],[58,134],[60,134],[66,134],[69,133],[74,131],[76,130]]

// Бедро (таз) → ступня → обратно вверх по внутреннему краю ноги
const LEG_PTS: Pt[] = [[45,144],[46,149],[49,153],[51,156],[52,161],[54,165],[55,171],[54,184],[54,187],[54,191],[52,196],[50,201],[49,207],[50,213],[50,218],[50,220],[49,224],[48,227],[48,231],[48,233],[48,232],[47,240],[49,247],[49,252],[50,259],[50,267],[51,276],[53,284],[54,297],[56,299],[57,304],[59,310],[60,314],[61,316],[62,319],[63,323],[63,328],[61,334],[60,338],[60,345],[58,349],[58,356],[57,364],[57,378],[59,384],[62,389],[66,404],[67,414],[69,416],[70,420],[71,424],[71,429],[66,434],[63,439],[61,442],[58,446],[59,447],[63,448],[72,450],[76,449],[81,448],[83,446],[86,444],[86,442],[86,438],[88,435],[87,432],[85,429],[85,427],[84,421],[82,416],[82,412],[81,409],[81,402],[81,399],[82,392],[82,389],[84,376],[82,363],[82,359],[82,355],[86,347],[87,342],[88,335],[85,321],[83,313]]

/*
  Верх торса (подмышка → грудь → талия) в исходной трассировке не обведён
  отдельной линией — разрыв между концом ARM_PTS и началом LEG_PTS.
  Достраиваем синтетически: подмышка стыкуется с ARM_PTS[0], талия — с
  LEG_PTS[0] (бедро).
*/
const TORSO_BRIDGE_PTS: Pt[] = [[74, 70], [68, 96], [73, 130]]

const CENTERLINE_X = 87.5
const SHOULDER_AXIS_X = 74 // точка крепления руки к плечу — локальная ось для масштабирования руки

const RANGES = {
  chestCm: { min: 75, max: 135 },
  waistCm: { min: 60, max: 125 },
  hipsCm:  { min: 75, max: 135 },
  bicepCm: { min: 24, max: 48 },
  thighCm: { min: 40, max: 75 },
} as const

function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v))
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

function scaleFor(value: number, key: keyof typeof RANGES): number {
  const { min, max } = RANGES[key]
  const t = clamp((value - min) / (max - min), 0, 1)
  return lerp(0.85, 1.15, t)
}

interface Anchor { y: number; scale: number }

// Плавно интерполирует масштаб между опорными высотами; вне диапазона — берёт крайнее значение
function scaleAtY(y: number, anchors: Anchor[]): number {
  if (y <= anchors[0].y) return anchors[0].scale
  for (let i = 0; i < anchors.length - 1; i++) {
    const a = anchors[i], b = anchors[i + 1]
    if (y >= a.y && y <= b.y) {
      const t = (y - a.y) / (b.y - a.y || 1)
      return lerp(a.scale, b.scale, t)
    }
  }
  return anchors[anchors.length - 1].scale
}

/*
  Раньше здесь был жёсткий clamp смещения каждой точки от оси — при
  выходе за порог все точки упирались в один и тот же предел и
  контур схлопывался в прямую линию (рука выглядела сломанной палкой).
  Диапазон scaleFor() уже сам по себе ограничен (0.85–1.15), поэтому
  смещение и без того не улетает бесконечно — отдельный clamp здесь
  был лишним и только портил форму.
*/
function scaleAroundAxis(points: Pt[], axisX: number, anchors: Anchor[]): Pt[] {
  return points.map(([x, y]): Pt => [axisX + (x - axisX) * scaleAtY(y, anchors), y])
}

function mirrorX(points: Pt[]): Pt[] {
  return points.map(([x, y]): Pt => [2 * CENTERLINE_X - x, y])
}

/*
  Сглаживает открытую (незамкнутую) ломаную — тот же приём с квадратичными
  кривыми через середины отрезков, что и в закрытых фигурах прошлой
  версии, но без замыкания в петлю.
*/
function smoothOpenPath(points: Pt[]): string {
  if (points.length < 2) return ''
  const mid = (a: Pt, b: Pt): Pt => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]
  let d = `M ${points[0][0]},${points[0][1]}`
  for (let i = 1; i < points.length; i++) {
    const p = points[i]
    if (i === points.length - 1) {
      d += ` L ${p[0]},${p[1]}`
    } else {
      const m = mid(p, points[i + 1])
      d += ` Q ${p[0]},${p[1]} ${m[0]},${m[1]}`
    }
  }
  return d
}

export function BodyDiagram() {
  const { measurements } = useMeasurements()
  const latest = useMemo(() => sortByDateAsc(measurements).at(-1), [measurements])

  if (!latest) {
    return (
      <div className="dp-panel overflow-hidden" style={{ width: 153 }}>
        <div className="dp-section-title">Силуэт</div>
        <EmptyCard message="Добавь замер, чтобы увидеть силуэт" />
      </div>
    )
  }

  return <BodyDiagramFigure measurement={latest} />
}

function BodyDiagramFigure({ measurement: m }: { measurement: BodyMeasurement }) {
  const chestScale = scaleFor(m.chestCm, 'chestCm')
  const waistScale = scaleFor(m.waistCm, 'waistCm')
  const hipsScale  = scaleFor(m.hipsCm, 'hipsCm')
  const bicepScale = scaleFor(m.bicepCm, 'bicepCm')
  const thighScale = scaleFor(m.thighCm, 'thighCm')

  const torsoLegAnchors: Anchor[] = [
    { y: 70,  scale: 1 },           // подмышка — не замеряется, фиксирована
    { y: 96,  scale: chestScale },  // грудь
    { y: 130, scale: waistScale },  // талия
    { y: 144, scale: hipsScale },   // бёдра (таз)
    { y: 240, scale: thighScale },  // бедро (верх ноги)
    { y: 300, scale: 1 },           // голень/щиколотка/стопа — не замеряются
  ]

  const armAnchors: Anchor[] = [
    { y: 68,  scale: 1 },
    { y: 90,  scale: 1 },
    { y: 195, scale: bicepScale }, // бицепс — самая широкая точка руки в трассировке
    { y: 245, scale: 1 },          // кисть — не замеряется
  ]

  const torsoLegLeft = scaleAroundAxis([...TORSO_BRIDGE_PTS, ...LEG_PTS], CENTERLINE_X, torsoLegAnchors)
  const armLeft = scaleAroundAxis(ARM_PTS, SHOULDER_AXIS_X, armAnchors)

  const torsoLegRight = mirrorX(torsoLegLeft)
  const armRight = mirrorX(armLeft)

  const strokeStyle = { fill: 'none', stroke: 'var(--dp-border-light)', strokeWidth: 1.4, strokeLinejoin: 'round' as const, strokeLinecap: 'round' as const }

  /*
    Точки для выносок ищем не по заранее угаданной высоте, а как реальный
    локальный экстремум контура (самая выступающая или самая узкая точка)
    внутри анатомического диапазона высот — на уже отмасштабированных
    точках. Так стрелка всегда указывает на настоящий видимый изгиб линии,
    а не на условную высоту, которая при экстремальном замере могла бы
    не совпасть с тем, что реально нарисовано.
  */
  const mirrorPt = ([x, y]: Pt): Pt => [2 * CENTERLINE_X - x, y]

  // Всегда ищем на ЛЕВОЙ (немасштабированной по стороне) версии контура — там "шире" однозначно
  // означает "меньше x". Для правых выносок результат затем зеркалим одной точкой.
  function extremumInRange(points: Pt[], yMin: number, yMax: number, mode: 'widest' | 'narrowest'): Pt {
    const inRange = points.filter((p) => p[1] >= yMin && p[1] <= yMax)
    const pool = inRange.length > 0 ? inRange : points
    return pool.reduce((best, p) => {
      const better = mode === 'widest' ? p[0] < best[0] : p[0] > best[0]
      return better ? p : best
    })
  }

  const chestPt = extremumInRange(torsoLegLeft, 75, 128, 'widest')
  const waistPt = extremumInRange(torsoLegLeft, 96, 144, 'narrowest')
  const hipsPt = mirrorPt(extremumInRange(torsoLegLeft, 130, 210, 'widest'))
  const thighPt = extremumInRange(torsoLegLeft, 195, 280, 'widest')
  const bicepPt = mirrorPt(extremumInRange(armLeft, 90, 230, 'widest'))

  return (
    <div className="dp-panel overflow-hidden" style={{ width: 153 }}>
      <div className="dp-section-title">Силуэт</div>

      <div className="p-2">
        <svg viewBox="0 0 176 460" width="100%" style={{ display: 'block', overflow: 'visible' }}>
          <path d={smoothOpenPath(HEAD_PTS)} style={strokeStyle} />
          <path d={smoothOpenPath(armLeft)} style={strokeStyle} />
          <path d={smoothOpenPath(armRight)} style={strokeStyle} />
          <path d={smoothOpenPath(torsoLegLeft)} style={strokeStyle} />
          <path d={smoothOpenPath(torsoLegRight)} style={strokeStyle} />

          {/* ── Подписи-выноски ── */}
          <Callout label="Грудь" value={`${m.chestCm} см`} x1={12} y1={chestPt[1] - 4} x2={chestPt[0]} y2={chestPt[1]} align="left" />
          <Callout label="Талия" value={`${m.waistCm} см`} x1={12} y1={waistPt[1]} x2={waistPt[0]} y2={waistPt[1]} align="left" />
          <Callout label="Бедро" value={`${m.thighCm} см`} x1={12} y1={thighPt[1]} x2={thighPt[0]} y2={thighPt[1]} align="left" />

          <Callout label="Бицепс" value={`${m.bicepCm} см`} x1={168} y1={bicepPt[1]} x2={bicepPt[0]} y2={bicepPt[1]} align="right" />
          <Callout label="Бёдра" value={`${m.hipsCm} см`} x1={168} y1={hipsPt[1] - 4} x2={hipsPt[0]} y2={hipsPt[1]} align="right" />
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
