import { useState } from 'react'
import { motion } from 'framer-motion'
import { staggerItemVariants } from '../../../hooks/useAnimatedMount'
import { useExercises, useAddExerciseMutation } from '../../../hooks/useFitnessData'
import { extractApiError } from '../../../utils/apiError'
import type { MuscleGroup } from '../../../types/fitness'

const GROUP_LABELS: Record<MuscleGroup, string> = {
  chest: 'Грудь',
  back: 'Спина',
  legs: 'Ноги',
  shoulders: 'Плечи',
  arms: 'Руки',
  core: 'Пресс',
  cardio: 'Кардио',
}

export function ExerciseLibrary() {
  const { exercises } = useExercises()

  const groups = (Object.keys(GROUP_LABELS) as MuscleGroup[])
    .map((g) => ({ group: g, items: exercises.filter((e) => e.muscleGroup === g) }))
    .filter((g) => g.items.length > 0)

  return (
    <motion.div className="dp-panel" variants={staggerItemVariants}>
      <div className="dp-section-title">
        Библиотека упражнений{' '}
        <span style={{ color: 'var(--dp-accent)' }}>{exercises.length}</span>
      </div>

      <div className="p-3 flex flex-col gap-3">
        {groups.map(({ group, items }) => (
          <div key={group}>
            <div
              className="text-xs uppercase tracking-wider mb-1.5"
              style={{ color: 'var(--dp-text-muted)' }}
            >
              {GROUP_LABELS[group]}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {items.map((e) => (
                <span
                  key={e.id}
                  className="text-xs px-2 py-1 rounded"
                  style={{
                    background: 'var(--dp-bg-card)',
                    border: '1px solid var(--dp-border)',
                    color: 'var(--dp-text-primary)',
                  }}
                >
                  {e.name}
                  {e.equipment && (
                    <span style={{ color: 'var(--dp-text-muted)' }}> · {e.equipment}</span>
                  )}
                </span>
              ))}
            </div>
          </div>
        ))}

        <AddExerciseForm />
      </div>
    </motion.div>
  )
}

const EMPTY_STATE = {
  name: '',
  muscleGroup: 'chest' as MuscleGroup,
  equipment: '',
  homeFriendly: false,
  isTimeBased: false,
}

function AddExerciseForm() {
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState(EMPTY_STATE)
  const [addExercise, { isLoading, error }] = useAddExerciseMutation()

  function toggle(field: 'homeFriendly' | 'isTimeBased') {
    setForm((f) => ({ ...f, [field]: !f[field] }))
  }

  // Свой вес против веса, который можно скорректировать — не отдельный
  // тумблер, а прямое следствие того, указан ли инвентарь: нет инвентаря —
  // значит вес тела, есть инвентарь — значит вес вводится и корректируется
  const isBodyweight = !form.equipment.trim()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) return
    try {
      await addExercise({
        name: form.name.trim(),
        muscleGroup: form.muscleGroup,
        equipment: form.equipment.trim() || undefined,
        homeFriendly: form.homeFriendly,
        bodyweightOnly: isBodyweight,
        isTimeBased: form.isTimeBased,
      }).unwrap()
      setForm(EMPTY_STATE)
      setOpen(false)
    } catch {
      // ошибка уже отражена через error ниже
    }
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="dp-btn-ghost text-xs self-start">
        + Добавить упражнение
      </button>
    )
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-2 p-2"
      style={{ border: '1px solid var(--dp-border)', borderRadius: 'var(--dp-radius-sm)' }}
    >
      <div className="grid grid-cols-2 gap-2">
        <input
          type="text" placeholder="Название" className="dp-input text-xs" value={form.name}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required autoFocus
        />
        <select
          className="dp-input text-xs"
          value={form.muscleGroup}
          onChange={(e) => setForm((f) => ({ ...f, muscleGroup: e.target.value as MuscleGroup }))}
        >
          {(Object.keys(GROUP_LABELS) as MuscleGroup[]).map((g) => (
            <option key={g} value={g}>{GROUP_LABELS[g]}</option>
          ))}
        </select>
      </div>

      <input
        type="text" placeholder="Инвентарь (необязательно)" className="dp-input text-xs"
        value={form.equipment} onChange={(e) => setForm((f) => ({ ...f, equipment: e.target.value }))}
      />
      <div className="text-xs" style={{ color: 'var(--dp-text-muted)' }}>
        {isBodyweight
          ? 'Инвентарь не указан — вес в тренировке будет свой (не редактируется)'
          : 'Инвентарь указан — вес в тренировке можно будет вводить и менять'}
      </div>

      <div className="flex flex-wrap gap-1.5">
        <ToggleTag label="Можно дома" active={form.homeFriendly} onClick={() => toggle('homeFriendly')} />
        <ToggleTag label="На время" active={form.isTimeBased} onClick={() => toggle('isTimeBased')} />
      </div>

      {error && <div className="dp-error">{extractApiError(error, 'Не удалось добавить упражнение')}</div>}

      <div className="flex gap-2">
        <button type="submit" className="dp-btn-primary text-xs" disabled={isLoading}>
          {isLoading ? 'Сохраняем…' : 'Сохранить'}
        </button>
        <button
          type="button" className="dp-btn-ghost text-xs"
          onClick={() => { setForm(EMPTY_STATE); setOpen(false) }}
        >
          Отмена
        </button>
      </div>
    </form>
  )
}

function ToggleTag({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="text-xs px-2 py-1 rounded"
      style={{
        background: active ? 'var(--dp-bg-card-hover)' : 'transparent',
        border: `1px solid ${active ? 'var(--dp-border-accent)' : 'var(--dp-border)'}`,
        color: active ? 'var(--dp-accent-bright)' : 'var(--dp-text-secondary)',
      }}
    >
      {active && '✓ '}{label}
    </button>
  )
}
