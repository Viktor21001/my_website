/*
  AddMeasurementForm — свёрнутая кнопка "+ Добавить замер", разворачивается
  в компактную форму. Реальный ввод данных, которого не было в моковой версии —
  без него у нового аккаунта Замеры навсегда остались бы пустыми.
*/

import { useState } from 'react'
import { useAddMeasurementMutation } from '../../../hooks/useFitnessData'
import { extractApiError } from '../../../utils/apiError'

const TODAY = () => new Date().toISOString().slice(0, 10)

const EMPTY_FORM = {
  date: TODAY(),
  weightKg: '',
  chestCm: '',
  waistCm: '',
  hipsCm: '',
  bicepCm: '',
  thighCm: '',
}

export function AddMeasurementForm() {
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [addMeasurement, { isLoading, error }] = useAddMeasurementMutation()

  function setField(field: keyof typeof form, value: string) {
    setForm((f) => ({ ...f, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const numbers = {
      weightKg: Number(form.weightKg),
      chestCm: Number(form.chestCm),
      waistCm: Number(form.waistCm),
      hipsCm: Number(form.hipsCm),
      bicepCm: Number(form.bicepCm),
      thighCm: Number(form.thighCm),
    }
    if (Object.values(numbers).some((n) => Number.isNaN(n))) return

    try {
      await addMeasurement({ date: new Date(form.date).toISOString(), ...numbers }).unwrap()
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
          + Добавить замер
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
          type="date"
          className="dp-input text-xs"
          value={form.date}
          onChange={(e) => setField('date', e.target.value)}
          required
        />
        <input
          type="number" step="0.1" placeholder="Вес, кг" className="dp-input text-xs"
          value={form.weightKg} onChange={(e) => setField('weightKg', e.target.value)} required
        />
        <input
          type="number" step="0.1" placeholder="Грудь, см" className="dp-input text-xs"
          value={form.chestCm} onChange={(e) => setField('chestCm', e.target.value)} required
        />
        <input
          type="number" step="0.1" placeholder="Талия, см" className="dp-input text-xs"
          value={form.waistCm} onChange={(e) => setField('waistCm', e.target.value)} required
        />
        <input
          type="number" step="0.1" placeholder="Бёдра, см" className="dp-input text-xs"
          value={form.hipsCm} onChange={(e) => setField('hipsCm', e.target.value)} required
        />
        <input
          type="number" step="0.1" placeholder="Бицепс, см" className="dp-input text-xs"
          value={form.bicepCm} onChange={(e) => setField('bicepCm', e.target.value)} required
        />
        <input
          type="number" step="0.1" placeholder="Бедро, см" className="dp-input text-xs"
          value={form.thighCm} onChange={(e) => setField('thighCm', e.target.value)} required
        />
      </div>

      {error && <div className="dp-error">{extractApiError(error, 'Не удалось сохранить замер')}</div>}

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
