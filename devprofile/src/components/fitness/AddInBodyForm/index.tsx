import { useState } from 'react'
import { useAddInBodyResultMutation } from '../../../hooks/useFitnessData'
import { extractApiError } from '../../../utils/apiError'

const TODAY = () => new Date().toISOString().slice(0, 10)

const EMPTY_FORM = {
  date: TODAY(),
  weightKg: '',
  bodyFatPercent: '',
  skeletalMuscleMassKg: '',
  muscleMassKg: '',
  bodyWaterPercent: '',
  bmi: '',
  visceralFatLevel: '',
  basalMetabolicRateKcal: '',
}

export function AddInBodyForm() {
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [addInBodyResult, { isLoading, error }] = useAddInBodyResultMutation()

  function setField(field: keyof typeof form, value: string) {
    setForm((f) => ({ ...f, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const numbers = {
      weightKg: Number(form.weightKg),
      bodyFatPercent: Number(form.bodyFatPercent),
      skeletalMuscleMassKg: Number(form.skeletalMuscleMassKg),
      muscleMassKg: Number(form.muscleMassKg),
      bodyWaterPercent: Number(form.bodyWaterPercent),
      bmi: Number(form.bmi),
      visceralFatLevel: Number(form.visceralFatLevel),
      basalMetabolicRateKcal: Number(form.basalMetabolicRateKcal),
    }
    if (Object.values(numbers).some((n) => Number.isNaN(n))) return

    try {
      await addInBodyResult({ date: new Date(form.date).toISOString(), ...numbers }).unwrap()
      setForm(EMPTY_FORM)
      setOpen(false)
    } catch {
      // ошибка уже отражена через error ниже
    }
  }

  if (!open) {
    return (
      <div className="p-3" style={{ borderBottom: '1px solid var(--dp-border)' }}>
        <button onClick={() => setOpen(true)} className="dp-btn-ghost text-xs">
          + Добавить скан InBody
        </button>
      </div>
    )
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="p-3 flex flex-col gap-2"
      style={{ borderBottom: '1px solid var(--dp-border)' }}
    >
      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
        <input
          type="date" className="dp-input text-xs"
          value={form.date} onChange={(e) => setField('date', e.target.value)} required
        />
        <input
          type="number" step="0.1" placeholder="Вес, кг" className="dp-input text-xs"
          value={form.weightKg} onChange={(e) => setField('weightKg', e.target.value)} required
        />
        <input
          type="number" step="0.1" placeholder="Жир, %" className="dp-input text-xs"
          value={form.bodyFatPercent} onChange={(e) => setField('bodyFatPercent', e.target.value)} required
        />
        <input
          type="number" step="0.1" placeholder="Скелет. мышцы, кг" className="dp-input text-xs"
          value={form.skeletalMuscleMassKg} onChange={(e) => setField('skeletalMuscleMassKg', e.target.value)} required
        />
        <input
          type="number" step="0.1" placeholder="Мышечная масса, кг" className="dp-input text-xs"
          value={form.muscleMassKg} onChange={(e) => setField('muscleMassKg', e.target.value)} required
        />
        <input
          type="number" step="0.1" placeholder="Вода, %" className="dp-input text-xs"
          value={form.bodyWaterPercent} onChange={(e) => setField('bodyWaterPercent', e.target.value)} required
        />
        <input
          type="number" step="0.1" placeholder="ИМТ" className="dp-input text-xs"
          value={form.bmi} onChange={(e) => setField('bmi', e.target.value)} required
        />
        <input
          type="number" placeholder="Висцеральный жир" className="dp-input text-xs"
          value={form.visceralFatLevel} onChange={(e) => setField('visceralFatLevel', e.target.value)} required
        />
        <input
          type="number" placeholder="Метаболизм, ккал" className="dp-input text-xs"
          value={form.basalMetabolicRateKcal} onChange={(e) => setField('basalMetabolicRateKcal', e.target.value)} required
        />
      </div>

      {error && <div className="dp-error">{extractApiError(error, 'Не удалось сохранить скан')}</div>}

      <div className="flex gap-2">
        <button type="submit" className="dp-btn-primary text-xs" disabled={isLoading}>
          {isLoading ? 'Сохраняем…' : 'Сохранить'}
        </button>
        <button type="button" className="dp-btn-ghost text-xs" onClick={() => setOpen(false)}>
          Отмена
        </button>
      </div>
    </form>
  )
}
