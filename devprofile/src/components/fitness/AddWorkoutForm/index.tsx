/*
  AddWorkoutForm — дата/название/длительность + динамический список
  подходов (упражнение + повторы + вес). setNumber считается автоматически
  по счётчику повторений одного и того же упражнения в форме.
*/

import { useState } from 'react'
import { useExercises, useAddWorkoutMutation } from '../../../hooks/useFitnessData'
import { extractApiError } from '../../../utils/apiError'
import type { NewWorkoutSet } from '../../../types/fitness'

const TODAY = () => new Date().toISOString().slice(0, 10)

interface SetRow {
  exerciseId: string
  reps: string
  weightKg: string
}

const EMPTY_SET_ROW: SetRow = { exerciseId: '', reps: '', weightKg: '' }

export function AddWorkoutForm() {
  const [open, setOpen] = useState(false)
  const [date, setDate] = useState(TODAY())
  const [title, setTitle] = useState('')
  const [durationMin, setDurationMin] = useState('')
  const [rows, setRows] = useState<SetRow[]>([{ ...EMPTY_SET_ROW }])

  const { exercises } = useExercises()
  const [addWorkout, { isLoading, error }] = useAddWorkoutMutation()

  function updateRow(index: number, field: keyof SetRow, value: string) {
    setRows((r) => r.map((row, i) => (i === index ? { ...row, [field]: value } : row)))
  }

  function addRow() {
    setRows((r) => [...r, { ...EMPTY_SET_ROW }])
  }

  function removeRow(index: number) {
    setRows((r) => (r.length > 1 ? r.filter((_, i) => i !== index) : r))
  }

  function reset() {
    setDate(TODAY())
    setTitle('')
    setDurationMin('')
    setRows([{ ...EMPTY_SET_ROW }])
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    const duration = Number(durationMin)
    if (!title || Number.isNaN(duration)) return
    if (rows.some((r) => !r.exerciseId || Number.isNaN(Number(r.reps)) || Number.isNaN(Number(r.weightKg)))) {
      return
    }

    // setNumber — порядковый номер подхода для КАЖДОГО упражнения отдельно
    const perExerciseCount: Record<string, number> = {}
    const sets: NewWorkoutSet[] = rows.map((r) => {
      perExerciseCount[r.exerciseId] = (perExerciseCount[r.exerciseId] ?? 0) + 1
      return {
        exerciseId: r.exerciseId,
        setNumber: perExerciseCount[r.exerciseId],
        reps: Number(r.reps),
        weightKg: Number(r.weightKg),
      }
    })

    try {
      await addWorkout({
        date: new Date(date).toISOString(),
        title,
        durationMin: duration,
        sets,
      }).unwrap()
      reset()
      setOpen(false)
    } catch {
      // ошибка уже отражена через error ниже
    }
  }

  if (!open) {
    return (
      <div className="p-3" style={{ borderBottom: '1px solid var(--dp-border)' }}>
        <button onClick={() => setOpen(true)} className="dp-btn-ghost text-xs">
          + Добавить тренировку
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
      <div className="grid grid-cols-3 gap-2">
        <input
          type="date" className="dp-input text-xs" value={date}
          onChange={(e) => setDate(e.target.value)} required
        />
        <input
          type="text" placeholder="Название" className="dp-input text-xs" value={title}
          onChange={(e) => setTitle(e.target.value)} required
        />
        <input
          type="number" placeholder="Минут" className="dp-input text-xs" value={durationMin}
          onChange={(e) => setDurationMin(e.target.value)} required
        />
      </div>

      <div className="flex flex-col gap-1.5">
        {rows.map((row, i) => (
          <div key={i} className="grid grid-cols-4 gap-2 items-center">
            <select
              className="dp-input text-xs col-span-2"
              value={row.exerciseId}
              onChange={(e) => updateRow(i, 'exerciseId', e.target.value)}
              required
            >
              <option value="">Упражнение…</option>
              {exercises.map((ex) => (
                <option key={ex.id} value={ex.id}>{ex.name}</option>
              ))}
            </select>
            <input
              type="number" placeholder="Повторы" className="dp-input text-xs"
              value={row.reps} onChange={(e) => updateRow(i, 'reps', e.target.value)} required
            />
            <div className="flex gap-1">
              <input
                type="number" step="0.5" placeholder="Вес, кг" className="dp-input text-xs"
                value={row.weightKg} onChange={(e) => updateRow(i, 'weightKg', e.target.value)} required
              />
              <button
                type="button"
                onClick={() => removeRow(i)}
                className="dp-btn-ghost text-xs shrink-0"
                aria-label="Удалить подход"
              >
                ✕
              </button>
            </div>
          </div>
        ))}
      </div>

      <button type="button" onClick={addRow} className="dp-btn-ghost text-xs self-start">
        + Подход
      </button>

      {error && <div className="dp-error">{extractApiError(error, 'Не удалось сохранить тренировку')}</div>}

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
