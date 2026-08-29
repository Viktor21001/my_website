/*
  WorkoutPlayer — живой проигрыватель уже подтверждённой тренировки.
  Тренировка на этот момент уже сохранена на сервер (см. AddWorkoutForm) —
  плеер ничего не сохраняет, чисто интерфейсный проход по шагам:
  упражнение → отдых → короткая подготовка → следующее упражнение.

  Упражнения с инвентарём (не bodyweightOnly) требуют явного подтверждения
  веса на каждом шаге — поле ввода + кнопка «Подтвердить вес» вместо
  «Готово»/обратного отсчёта, пока не подтверждено. Для bodyweightOnly вес
  не спрашивается (он и так тело пользователя, не вводится руками нигде).

  Тикающий таймер — тот же паттерн setInterval, что и в WorkoutTimer
  (devprofile\src\components\fitness\WorkoutTimer), плюс проверка
  isPaused перед декрементом вместо остановки интервала.
*/

import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { slideUpVariants } from '../../../hooks/useAnimatedMount'

const PREP_SECONDS = 8

export interface PlayerStep {
  exerciseName: string
  isTimeBased: boolean
  target: number // повторы, либо минуты — если isTimeBased
  weightKg: number
  bodyweightOnly: boolean
}

type Phase = 'exercise' | 'rest' | 'prep' | 'done'

function formatTime(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60)
  const s = totalSeconds % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

export function WorkoutPlayer({
  steps,
  restSeconds,
  onClose,
}: {
  steps: PlayerStep[]
  restSeconds: number
  onClose: () => void
}) {
  const [stepIndex, setStepIndex] = useState(0)
  const [phase, setPhase] = useState<Phase>('exercise')
  const [remaining, setRemaining] = useState(() => (steps[0]?.isTimeBased ? steps[0].target * 60 : 0))
  const [isPaused, setIsPaused] = useState(false)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  // Интервал не пересоздаётся каждую секунду (не держим remaining в deps
  // эффекта ниже), поэтому для чтения актуального remaining внутри тика
  // используем ref, синхронизируемый отдельным эффектом без setState
  const remainingRef = useRef(remaining)
  useEffect(() => {
    remainingRef.current = remaining
  }, [remaining])

  const step = steps[stepIndex]
  const isLastStep = stepIndex >= steps.length - 1

  // Для упражнений с инвентарём (не bodyweightOnly) — вес нужно ввести и
  // подтвердить прямо на шаге, прежде чем можно перейти дальше (или
  // запустить обратный отсчёт, если упражнение вдруг ещё и на время).
  // Сбрасывается на каждый новый шаг — подтверждать нужно на каждый подход.
  const needsWeightConfirm = !!step && !step.bodyweightOnly
  const [weightInput, setWeightInput] = useState(() => (step ? String(step.weightKg || '') : ''))
  const [weightConfirmed, setWeightConfirmed] = useState(!needsWeightConfirm)
  // Сброс подтверждения веса на новый шаг — не через эффект (React-паттерн
  // "adjusting state during render" для сброса состояния при смене ключа),
  // иначе setState в теле эффекта на каждый рендер даёт лишний каскад
  const [weightStepIndex, setWeightStepIndex] = useState(stepIndex)
  if (stepIndex !== weightStepIndex) {
    setWeightStepIndex(stepIndex)
    setWeightInput(step ? String(step.weightKg || '') : '')
    setWeightConfirmed(!needsWeightConfirm)
  }

  const isTicking =
    phase === 'rest' ||
    phase === 'prep' ||
    (phase === 'exercise' && !!step?.isTimeBased && (!needsWeightConfirm || weightConfirmed))

  function advance() {
    if (phase === 'exercise') {
      if (isLastStep) {
        setPhase('done')
      } else {
        setPhase('rest')
        setRemaining(restSeconds)
      }
    } else if (phase === 'rest') {
      setPhase('prep')
      setRemaining(PREP_SECONDS)
    } else if (phase === 'prep') {
      const next = stepIndex + 1
      setStepIndex(next)
      setPhase('exercise')
      setRemaining(steps[next]?.isTimeBased ? steps[next].target * 60 : 0)
    }
  }

  // Переход фазы вызывается прямо из колбэка таймера (не синхронно в теле
  // эффекта) — иначе setState в теле эффекта на каждое изменение remaining
  // даёт каскад лишних рендеров
  useEffect(() => {
    if (!isTicking || isPaused) return
    intervalRef.current = setInterval(() => {
      if (remainingRef.current <= 1) {
        advance()
      } else {
        setRemaining((r) => r - 1)
      }
    }, 1000)
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isTicking, isPaused, phase, stepIndex])

  const total = steps.length
  const phaseTitle =
    phase === 'exercise' ? 'Упражнение' : phase === 'rest' ? 'Отдых' : phase === 'prep' ? 'Приготовься' : 'Готово'

  return (
    <AnimatePresence>
      <motion.div
        key="backdrop"
        className="fixed inset-0 z-40"
        style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(2px)' }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      />

      <motion.div
        key="panel"
        className="fixed bottom-0 left-0 right-0 z-50"
        style={{
          background: 'var(--dp-bg-panel)',
          borderTop: '1px solid var(--dp-border-accent)',
          boxShadow: '0 -8px 32px rgba(0,0,0,0.7)',
          borderRadius: '12px 12px 0 0',
        }}
        variants={slideUpVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
      >
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full" style={{ background: 'var(--dp-border-light)' }} />
        </div>

        <div className="px-5 pb-6 flex flex-col items-center gap-4">
          {phase !== 'done' && (
            <div className="text-xs" style={{ color: 'var(--dp-text-muted)' }}>
              Шаг {stepIndex + 1} из {total}
            </div>
          )}

          <div className="text-sm font-semibold uppercase tracking-wider" style={{ color: 'var(--dp-accent-bright)' }}>
            {phaseTitle}
          </div>

          {phase === 'done' ? (
            <>
              <div className="text-2xl font-bold" style={{ color: 'var(--dp-text-white)' }}>
                Тренировка завершена! 🎉
              </div>
              <button onClick={onClose} className="dp-btn-primary text-xs">
                Закрыть
              </button>
            </>
          ) : (
            <>
              <div className="text-xl font-semibold text-center" style={{ color: 'var(--dp-text-white)' }}>
                {phase === 'exercise' ? step.exerciseName : phase === 'prep' && steps[stepIndex + 1]
                  ? `Далее: ${steps[stepIndex + 1].exerciseName}`
                  : 'Отдыхай'}
              </div>

              {phase === 'exercise' && (
                <div className="text-xs" style={{ color: 'var(--dp-text-secondary)' }}>
                  {step.isTimeBased
                    ? null
                    : `Цель: ${step.target} повторений`}
                  {step.bodyweightOnly && ' · свой вес'}
                  {needsWeightConfirm && weightConfirmed && ` · ${weightInput} кг`}
                </div>
              )}

              {phase === 'exercise' && needsWeightConfirm && !weightConfirmed && (
                <div className="flex gap-2 w-full items-center">
                  <input
                    type="number" step="0.5" placeholder="Вес, кг" className="dp-input text-xs flex-1"
                    value={weightInput} onChange={(e) => setWeightInput(e.target.value)} autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => setWeightConfirmed(true)}
                    className="dp-btn-primary text-xs shrink-0"
                    disabled={!weightInput || Number.isNaN(Number(weightInput))}
                  >
                    Подтвердить вес
                  </button>
                </div>
              )}

              {isTicking && (
                <>
                  <div
                    className="font-mono font-bold tabular-nums"
                    style={{ fontSize: 40, color: remaining === 0 ? 'var(--dp-green)' : 'var(--dp-text-white)' }}
                  >
                    {formatTime(remaining)}
                  </div>
                  <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--dp-border)' }}>
                    <motion.div
                      className="h-full rounded-full"
                      style={{ background: 'var(--dp-accent)' }}
                      animate={{
                        width: `${
                          phase === 'exercise'
                            ? ((step.target * 60 - remaining) / (step.target * 60 || 1)) * 100
                            : phase === 'rest'
                              ? ((restSeconds - remaining) / (restSeconds || 1)) * 100
                              : ((PREP_SECONDS - remaining) / PREP_SECONDS) * 100
                        }%`,
                      }}
                      transition={{ duration: 0.3 }}
                    />
                  </div>
                </>
              )}

              <div className="flex gap-2 w-full">
                {phase === 'exercise' && !step.isTimeBased && (!needsWeightConfirm || weightConfirmed) && (
                  <button onClick={advance} className="dp-btn-primary flex-1 text-xs">
                    ✓ Готово
                  </button>
                )}
                {isTicking && (
                  <>
                    <button onClick={() => setIsPaused((p) => !p)} className="dp-btn-ghost text-xs">
                      {isPaused ? '▶ Продолжить' : '⏸ Пауза'}
                    </button>
                    {phase !== 'exercise' && (
                      <button onClick={advance} className="dp-btn-ghost text-xs">
                        Пропустить
                      </button>
                    )}
                  </>
                )}
              </div>

              <button onClick={onClose} className="text-xs" style={{ color: 'var(--dp-text-muted)' }}>
                Прервать тренировку
              </button>
            </>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  )
}
