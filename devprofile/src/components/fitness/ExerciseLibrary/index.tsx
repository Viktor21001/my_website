/*
  ExerciseLibrary — три вкладки над одним и тем же списком упражнений
  (useExercises() отдаёт вообще все строки разом — конструктору тренировок
  auto-жа нужен полный список независимо от автора):

  - Системная   — createdByUserId === null (сид), только чтение, никто не
                  может её менять.
  - Моя (имя настраивается) — createdByUserId === мой id: полный CRUD
                  (добавить/изменить/удалить), плюс переименование самой
                  вкладки (User.exerciseLibraryName).
  - Сообщество  — createdByUserId чужой (не null и не мой): только чтение
                  + «Копировать себе» — открывает ту же форму добавления,
                  предзаполненную значениями исходного упражнения, кнопка
                  сохранения заблокирована, пока хоть одно поле не
                  отличается от оригинала (иначе — точная копия, только
                  захламляет хранилище).
*/

import { useState } from 'react'
import { motion } from 'framer-motion'
import { staggerItemVariants, fadeVariants } from '../../../hooks/useAnimatedMount'
import { useAppSelector } from '../../../hooks/redux'
import {
  useExercises,
  useAddExerciseMutation,
  useUpdateExerciseMutation,
  useDeleteExerciseMutation,
} from '../../../hooks/useFitnessData'
import { useUpdateProfile } from '../../../hooks/useProfile'
import { extractApiError } from '../../../utils/apiError'
import { PanelHeader } from '../../shared/PanelHeader'
import type { Exercise, MuscleGroup, NewExercise } from '../../../types/fitness'

const GROUP_LABELS: Record<MuscleGroup, string> = {
  chest: 'Грудь',
  back: 'Спина',
  legs: 'Ноги',
  shoulders: 'Плечи',
  arms: 'Руки',
  core: 'Пресс',
  cardio: 'Кардио',
}

type Tab = 'system' | 'mine' | 'community'

export function ExerciseLibrary() {
  const [tab, setTab] = useState<Tab>('system')
  const { exercises } = useExercises()
  const userId = useAppSelector((state) => state.auth.user?.id)
  const libraryName = useAppSelector((state) => state.auth.user?.exerciseLibraryName ?? null)

  const systemExercises = exercises.filter((e) => e.createdByUserId === null)
  const myExercises = exercises.filter((e) => e.createdByUserId === userId)
  const communityExercises = exercises.filter((e) => e.createdByUserId !== null && e.createdByUserId !== userId)

  const TABS: { id: Tab; label: string; count: number }[] = [
    { id: 'system', label: 'Системная', count: systemExercises.length },
    { id: 'mine', label: libraryName || 'Моя библиотека', count: myExercises.length },
    { id: 'community', label: 'Сообщество', count: communityExercises.length },
  ]

  return (
    <motion.div className="dp-panel overflow-hidden" variants={staggerItemVariants}>
      <PanelHeader
        title="Библиотека упражнений"
        right={
          <div className="flex">
            {TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className="relative flex items-center gap-1.5 px-3 py-2.5 text-xs transition-all duration-150"
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: tab === t.id ? 'var(--dp-text-white)' : 'var(--dp-text-secondary)',
                }}
              >
                {t.label} <span style={{ color: 'var(--dp-text-muted)' }}>{t.count}</span>
                {tab === t.id && (
                  <motion.div
                    className="absolute bottom-0 left-0 right-0 h-0.5"
                    style={{ background: 'var(--dp-green)' }}
                    layoutId="activeExerciseLibraryTab"
                    transition={{ duration: 0.2, ease: 'easeOut' }}
                  />
                )}
              </button>
            ))}
          </div>
        }
      />

      {/*
        variants вместо своих initial/animate — тван на key={tab}-ремаунте
        застревал в initial (opacity:0) до наведения мышью (см. такой же
        фикс в RecentActivity/WorkoutLog). Через variants состояние
        читается из контекста родителя, а не из своего же эффекта.
      */}
      <motion.div key={tab} variants={fadeVariants}>
        {tab === 'system' && (
          <div className="p-3">
            <ExerciseGroupList exercises={systemExercises} emptyMessage="Системная библиотека пуста" />
          </div>
        )}
        {tab === 'mine' && <MyLibraryTab exercises={myExercises} libraryName={libraryName} />}
        {tab === 'community' && <CommunityTab exercises={communityExercises} />}
      </motion.div>
    </motion.div>
  )
}

function ExerciseGroupList({
  exercises, emptyMessage, showAuthor, renderActions,
}: {
  exercises: Exercise[]
  emptyMessage: string
  showAuthor?: boolean
  renderActions?: (exercise: Exercise) => React.ReactNode
}) {
  const groups = (Object.keys(GROUP_LABELS) as MuscleGroup[])
    .map((g) => ({ group: g, items: exercises.filter((e) => e.muscleGroup === g) }))
    .filter((g) => g.items.length > 0)

  if (groups.length === 0) {
    return <div className="text-xs" style={{ color: 'var(--dp-text-muted)' }}>{emptyMessage}</div>
  }

  return (
    <div className="flex flex-col gap-3">
      {groups.map(({ group, items }) => (
        <div key={group}>
          <div className="text-xs uppercase tracking-wider mb-1.5" style={{ color: 'var(--dp-text-muted)' }}>
            {GROUP_LABELS[group]}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {items.map((e) => (
              <span
                key={e.id}
                className="text-xs px-2 py-1 rounded flex items-center gap-1.5"
                style={{ background: 'var(--dp-bg-card)', border: '1px solid var(--dp-border)', color: 'var(--dp-text-primary)' }}
              >
                <span>
                  {e.name}
                  {e.equipment && <span style={{ color: 'var(--dp-text-muted)' }}> · {e.equipment}</span>}
                  {showAuthor && e.createdByUsername && (
                    <span style={{ color: 'var(--dp-text-muted)' }}> · @{e.createdByUsername}</span>
                  )}
                </span>
                {renderActions?.(e)}
              </span>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

// ── Форма добавления/редактирования/копирования — общая для всех трёх сценариев ──

interface ExerciseFormState {
  name: string
  muscleGroup: MuscleGroup
  equipment: string
  homeFriendly: boolean
  isTimeBased: boolean
}

const EMPTY_FORM_STATE: ExerciseFormState = {
  name: '', muscleGroup: 'chest', equipment: '', homeFriendly: false, isTimeBased: false,
}

function toFormState(e: Exercise): ExerciseFormState {
  return {
    name: e.name, muscleGroup: e.muscleGroup, equipment: e.equipment ?? '',
    homeFriendly: e.homeFriendly, isTimeBased: e.isTimeBased,
  }
}

function formsEqual(a: ExerciseFormState, b: ExerciseFormState): boolean {
  return a.name.trim() === b.name.trim()
    && a.muscleGroup === b.muscleGroup
    && a.equipment.trim() === b.equipment.trim()
    && a.homeFriendly === b.homeFriendly
    && a.isTimeBased === b.isTimeBased
}

function ExerciseForm({
  initial, requireChangeFrom, submitLabel, isLoading, error, onSubmit, onCancel,
}: {
  initial?: ExerciseFormState
  requireChangeFrom?: ExerciseFormState
  submitLabel: string
  isLoading: boolean
  error: unknown
  onSubmit: (payload: NewExercise) => void
  onCancel: () => void
}) {
  const [form, setForm] = useState<ExerciseFormState>(initial ?? EMPTY_FORM_STATE)

  function toggle(field: 'homeFriendly' | 'isTimeBased') {
    setForm((f) => ({ ...f, [field]: !f[field] }))
  }

  // Свой вес против веса, который можно скорректировать — не отдельный
  // тумблер, а прямое следствие того, указан ли инвентарь
  const isBodyweight = !form.equipment.trim()
  const unchanged = requireChangeFrom ? formsEqual(form, requireChangeFrom) : false

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim() || unchanged) return
    onSubmit({
      name: form.name.trim(),
      muscleGroup: form.muscleGroup,
      equipment: form.equipment.trim() || undefined,
      homeFriendly: form.homeFriendly,
      bodyweightOnly: isBodyweight,
      isTimeBased: form.isTimeBased,
    })
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

      {unchanged && (
        <div className="text-xs" style={{ color: 'var(--dp-text-muted)' }}>
          Измените хотя бы одно поле, чтобы скопировать упражнение себе — точная копия не сохранится
        </div>
      )}

      {error != null && <div className="dp-error">{extractApiError(error, 'Не удалось сохранить упражнение')}</div>}

      <div className="flex gap-2">
        <button type="submit" className="dp-btn-primary text-xs" disabled={isLoading || unchanged}>
          {isLoading ? 'Сохраняем…' : submitLabel}
        </button>
        <button type="button" className="dp-btn-ghost text-xs" onClick={onCancel}>
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

// ── Вкладка «Моя библиотека» — полный CRUD над своими упражнениями ──

type MyLibraryMode = { kind: 'idle' } | { kind: 'add' } | { kind: 'edit'; exercise: Exercise }

function MyLibraryTab({ exercises, libraryName }: { exercises: Exercise[]; libraryName: string | null }) {
  const [mode, setMode] = useState<MyLibraryMode>({ kind: 'idle' })
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [addExercise, { isLoading: adding, error: addError }] = useAddExerciseMutation()
  const [updateExercise, { isLoading: updating, error: updateError }] = useUpdateExerciseMutation()
  const [deleteExercise, { error: deleteError }] = useDeleteExerciseMutation()

  async function handleDelete(id: string) {
    setDeletingId(id)
    try {
      await deleteExercise(id).unwrap()
    } catch {
      // ошибка уже отражена через deleteError ниже
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="p-3 flex flex-col gap-3">
      <LibraryNameEditor currentName={libraryName} />

      <ExerciseGroupList
        exercises={exercises}
        emptyMessage="В вашей библиотеке пока нет упражнений — добавьте своё ниже"
        renderActions={(e) => (
          <span className="flex items-center gap-1 shrink-0">
            <button
              type="button" onClick={() => setMode({ kind: 'edit', exercise: e })}
              aria-label="Изменить" style={{ color: 'var(--dp-text-muted)', cursor: 'pointer' }}
            >
              ✎
            </button>
            <button
              type="button" onClick={() => handleDelete(e.id)} disabled={deletingId === e.id}
              aria-label="Удалить" style={{ color: 'var(--dp-text-muted)', cursor: 'pointer' }}
            >
              ✕
            </button>
          </span>
        )}
      />
      {deleteError != null && <div className="dp-error">{extractApiError(deleteError, 'Не удалось удалить упражнение')}</div>}

      {mode.kind === 'idle' && (
        <button onClick={() => setMode({ kind: 'add' })} className="dp-btn-ghost text-xs self-start">
          + Добавить упражнение
        </button>
      )}
      {mode.kind === 'add' && (
        <ExerciseForm
          submitLabel="Сохранить"
          isLoading={adding}
          error={addError}
          onCancel={() => setMode({ kind: 'idle' })}
          onSubmit={(payload) => {
            addExercise(payload).unwrap()
              .then(() => setMode({ kind: 'idle' }))
              .catch(() => {})
          }}
        />
      )}
      {mode.kind === 'edit' && (
        <ExerciseForm
          initial={toFormState(mode.exercise)}
          submitLabel="Сохранить изменения"
          isLoading={updating}
          error={updateError}
          onCancel={() => setMode({ kind: 'idle' })}
          onSubmit={(payload) => {
            updateExercise({ id: mode.exercise.id, ...payload }).unwrap()
              .then(() => setMode({ kind: 'idle' }))
              .catch(() => {})
          }}
        />
      )}
    </div>
  )
}

function LibraryNameEditor({ currentName }: { currentName: string | null }) {
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(currentName ?? '')
  const [updateProfile, { isLoading }] = useUpdateProfile()

  async function save() {
    try {
      await updateProfile({ exerciseLibraryName: name.trim() || null })
      setEditing(false)
    } catch {
      // остаёмся в режиме редактирования, чтобы попробовать снова
    }
  }

  if (!editing) {
    return (
      <button
        type="button"
        onClick={() => { setName(currentName ?? ''); setEditing(true) }}
        className="text-xs self-start"
        style={{ color: 'var(--dp-text-muted)', cursor: 'pointer' }}
      >
        ✎ Переименовать библиотеку
      </button>
    )
  }

  return (
    <div className="flex gap-2">
      <input
        type="text" className="dp-input text-xs" placeholder="Моя библиотека" autoFocus
        value={name} onChange={(e) => setName(e.target.value)}
      />
      <button onClick={save} className="dp-btn-primary text-xs" disabled={isLoading}>OK</button>
      <button onClick={() => setEditing(false)} className="dp-btn-ghost text-xs">✕</button>
    </div>
  )
}

// ── Вкладка «Сообщество» — чужие упражнения, можно только копировать себе ──

function CommunityTab({ exercises }: { exercises: Exercise[] }) {
  const [copying, setCopying] = useState<Exercise | null>(null)
  const [addExercise, { isLoading, error }] = useAddExerciseMutation()

  return (
    <div className="p-3 flex flex-col gap-3">
      <ExerciseGroupList
        exercises={exercises}
        emptyMessage="Другие пользователи пока не добавили своих упражнений"
        showAuthor
        renderActions={(e) => (
          <button
            type="button" onClick={() => setCopying(e)}
            className="text-xs shrink-0" style={{ color: 'var(--dp-accent-bright)', cursor: 'pointer' }}
          >
            Копировать
          </button>
        )}
      />

      {copying && (
        <ExerciseForm
          initial={toFormState(copying)}
          requireChangeFrom={toFormState(copying)}
          submitLabel="Скопировать себе"
          isLoading={isLoading}
          error={error}
          onCancel={() => setCopying(null)}
          onSubmit={(payload) => {
            addExercise(payload).unwrap()
              .then(() => setCopying(null))
              .catch(() => {})
          }}
        />
      )}
    </div>
  )
}
