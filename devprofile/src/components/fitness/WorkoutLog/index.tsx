/*
  WorkoutLog — центральная панель фитнес-раздела: локальные вкладки
  Тренировки / Замеры / InBody. Структурный клон табов из
  components/activity/RecentActivity (та же анимация подчёркивания).
*/

import { useState } from 'react'
import { motion } from 'framer-motion'
import { staggerItemVariants } from '../../../hooks/useAnimatedMount'
import { sortByDateAsc } from '../../../utils/fitnessCalc'
import { useWorkouts, useInBodyResults } from '../../../hooks/useFitnessData'
import { WorkoutCard } from '../WorkoutCard'
import { MeasurementsHistory } from '../MeasurementsHistory'
import { AddWorkoutForm } from '../AddWorkoutForm'
import { AddInBodyForm } from '../AddInBodyForm'
import { EmptyCard } from '../../shared/Card'

type Tab = 'workouts' | 'measurements' | 'inbody'

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'workouts',     label: 'Тренировки', icon: '🏋️' },
  { id: 'measurements', label: 'Замеры',      icon: '📏' },
  { id: 'inbody',       label: 'InBody',      icon: '🔬' },
]

export function WorkoutLog() {
  const [activeTab, setActiveTab] = useState<Tab>('workouts')

  const { workouts } = useWorkouts()
  const { inbodyResults } = useInBodyResults()

  const workoutsDesc = [...workouts].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  )
  const inbodyDesc = sortByDateAsc(inbodyResults).reverse()

  return (
    <motion.div className="dp-panel" variants={staggerItemVariants}>
      {/* Шапка с вкладками */}
      <div
        className="flex items-center justify-between"
        style={{ background: 'rgba(0,0,0,0.2)', borderBottom: '1px solid var(--dp-border)' }}
      >
        <span className="dp-section-title" style={{ border: 'none', background: 'none' }}>
          Дневник тренировок
        </span>

        <div className="flex">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="relative flex items-center gap-1.5 px-3 py-2.5 text-xs transition-all duration-150"
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: activeTab === tab.id ? 'var(--dp-text-white)' : 'var(--dp-text-secondary)',
              }}
            >
              <span style={{ fontSize: 10 }}>{tab.icon}</span>
              {tab.label}
              {activeTab === tab.id && (
                <motion.div
                  className="absolute bottom-0 left-0 right-0 h-0.5"
                  style={{ background: 'var(--dp-green)' }}
                  layoutId="activeFitnessTab"
                  transition={{ duration: 0.2, ease: 'easeOut' }}
                />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Контент вкладок */}
      <motion.div
        key={activeTab}
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.18 }}
      >
        {activeTab === 'workouts' && (
          <div className="flex flex-col">
            <AddWorkoutForm />
            {workoutsDesc.length === 0
              ? <EmptyCard message="Тренировок пока нет" />
              : workoutsDesc.map((w) => <WorkoutCard key={w.id} workout={w} />)}
          </div>
        )}

        {activeTab === 'measurements' && <MeasurementsHistory />}

        {activeTab === 'inbody' && (
          <div className="flex flex-col">
            <AddInBodyForm />
            {inbodyDesc.length === 0
              ? <EmptyCard message="Сканов InBody пока нет" />
              : (
              <div className="flex flex-col">
                {inbodyDesc.map((r) => (
                  <div
                    key={r.id}
                    className="flex items-center gap-3 p-3 text-xs"
                    style={{ borderBottom: '1px solid var(--dp-border)' }}
                  >
                    <div className="shrink-0 w-20 font-mono" style={{ color: 'var(--dp-text-muted)' }}>
                      {new Date(r.date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}
                    </div>
                    <div className="flex-1 grid grid-cols-4 gap-2">
                      <Stat label="Вес" value={`${r.weightKg} кг`} />
                      <Stat label="Жир" value={`${r.bodyFatPercent}%`} />
                      <Stat label="Мышцы" value={`${r.muscleMassKg} кг`} />
                      <Stat label="Вода" value={`${r.bodyWaterPercent}%`} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </motion.div>
    </motion.div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div style={{ color: 'var(--dp-text-primary)' }}>{value}</div>
      <div className="text-xs" style={{ color: 'var(--dp-text-muted)' }}>{label}</div>
    </div>
  )
}
