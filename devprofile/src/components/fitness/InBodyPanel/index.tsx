/*
  InBodyPanel — правая колонка, сводка по последнему скану InBody.
  Структурный клон components/stats/SteamStats (без аватара/ссылки).
*/

import { sortByDateAsc } from '../../../utils/fitnessCalc'
import { EmptyCard } from '../../shared/Card'
import { useInBodyResults } from '../../../hooks/useFitnessData'

export function InBodyPanel() {
  const { inbodyResults } = useInBodyResults()

  if (inbodyResults.length === 0) {
    return (
      <div className="dp-panel overflow-hidden">
        <div className="dp-section-title">InBody</div>
        <EmptyCard message="Сканов пока нет" />
      </div>
    )
  }

  const sorted = sortByDateAsc(inbodyResults)
  const latest = sorted[sorted.length - 1]
  const prev = sorted.length > 1 ? sorted[sorted.length - 2] : undefined
  const fatDelta = prev ? latest.bodyFatPercent - prev.bodyFatPercent : 0

  return (
    <div className="dp-panel overflow-hidden">
      <div className="dp-section-title">InBody · последний скан</div>

      <div className="p-3 flex flex-col gap-3">
        <div className="text-xs" style={{ color: 'var(--dp-text-muted)' }}>
          {new Date(latest.date).toLocaleDateString('ru-RU', {
            day: 'numeric', month: 'long', year: 'numeric',
          })}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-lg font-semibold" style={{ color: 'var(--dp-text-white)' }}>
            {latest.bodyFatPercent}%
          </span>
          <span className="text-xs" style={{ color: 'var(--dp-text-muted)' }}>жира в теле</span>
          {prev && (
            <span
              className="text-xs font-mono ml-auto"
              style={{ color: fatDelta <= 0 ? 'var(--dp-green)' : 'var(--dp-red)' }}
            >
              {fatDelta > 0 ? '+' : ''}{fatDelta.toFixed(1)}%
            </span>
          )}
        </div>

        <div className="grid grid-cols-2 gap-2">
          <MiniStat label="Мышечная масса" value={`${latest.muscleMassKg} кг`} />
          <MiniStat label="Вода в теле" value={`${latest.bodyWaterPercent}%`} />
          <MiniStat label="ИМТ" value={`${latest.bmi}`} />
          <MiniStat label="Висцеральный жир" value={`${latest.visceralFatLevel}`} />
        </div>

        <div
          className="text-xs px-2 py-1.5 rounded"
          style={{ background: 'var(--dp-bg-card)', border: '1px solid var(--dp-border)', color: 'var(--dp-text-secondary)' }}
        >
          Базовый метаболизм: {latest.basalMetabolicRateKcal} ккал
        </div>
      </div>
    </div>
  )
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-sm font-medium" style={{ color: 'var(--dp-text-primary)' }}>{value}</div>
      <div className="text-xs" style={{ color: 'var(--dp-text-muted)' }}>{label}</div>
    </div>
  )
}
