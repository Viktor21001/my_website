import { EmptyCard } from '../../shared/Card'
import { sortByDateAsc } from '../../../utils/fitnessCalc'
import { useMeasurements } from '../../../hooks/useFitnessData'
import { AddMeasurementForm } from '../AddMeasurementForm'
import { MeasurementsChart } from '../MeasurementsChart'
import { BodyDiagram } from '../BodyDiagram'

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' })
}

function Delta({ value, goodWhenNegative }: { value: number; goodWhenNegative: boolean }) {
  if (Math.abs(value) < 0.05) {
    return <span style={{ color: 'var(--dp-text-muted)' }}>· 0</span>
  }
  const isGood = goodWhenNegative ? value < 0 : value > 0
  const color = isGood ? 'var(--dp-green)' : 'var(--dp-red)'
  const sign = value > 0 ? '+' : ''
  return (
    <span style={{ color }}>
      {sign}
      {value.toFixed(1)}
    </span>
  )
}

export function MeasurementsHistory() {
  const { measurements } = useMeasurements()

  // Новые сверху, дельта считается относительно предыдущего (более старого) замера
  const chronological = sortByDateAsc(measurements)

  return (
    <div className="flex flex-col">
      {measurements.length > 0 && (
        <div className="flex gap-3 p-3 items-start" style={{ borderBottom: '1px solid var(--dp-border)' }}>
          <div className="flex-1 min-w-0">
            <MeasurementsChart measurements={measurements} />
          </div>
          <BodyDiagram />
        </div>
      )}

      <AddMeasurementForm />

      {measurements.length === 0 && <EmptyCard message="Замеров пока нет" />}

      {chronological
        .slice()
        .reverse()
        .map((m) => {
          const idx = chronological.findIndex((x) => x.id === m.id)
          const prev = idx > 0 ? chronological[idx - 1] : undefined

          return (
            <div
              key={m.id}
              className="flex items-center gap-3 p-3 text-xs"
              style={{ borderBottom: '1px solid var(--dp-border)' }}
            >
              <div className="shrink-0 w-20 font-mono" style={{ color: 'var(--dp-text-muted)' }}>
                {formatDate(m.date)}
              </div>

              <div className="flex-1 grid grid-cols-4 gap-2">
                <div>
                  <div style={{ color: 'var(--dp-text-primary)' }}>{m.weightKg} кг</div>
                  <div className="text-xs" style={{ color: 'var(--dp-text-muted)' }}>Вес</div>
                </div>
                <div>
                  <div style={{ color: 'var(--dp-text-primary)' }}>
                    {m.waistCm} см{' '}
                    {prev && <Delta value={m.waistCm - prev.waistCm} goodWhenNegative />}
                  </div>
                  <div className="text-xs" style={{ color: 'var(--dp-text-muted)' }}>Талия</div>
                </div>
                <div>
                  <div style={{ color: 'var(--dp-text-primary)' }}>
                    {m.chestCm} см{' '}
                    {prev && <Delta value={m.chestCm - prev.chestCm} goodWhenNegative={false} />}
                  </div>
                  <div className="text-xs" style={{ color: 'var(--dp-text-muted)' }}>Грудь</div>
                </div>
                <div>
                  <div style={{ color: 'var(--dp-text-primary)' }}>
                    {m.bicepCm} см{' '}
                    {prev && <Delta value={m.bicepCm - prev.bicepCm} goodWhenNegative={false} />}
                  </div>
                  <div className="text-xs" style={{ color: 'var(--dp-text-muted)' }}>Бицепс</div>
                </div>
              </div>
            </div>
          )
        })}
    </div>
  )
}
