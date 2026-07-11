/*
  PageWrapper теперь делает три вещи:
  1. Layout страницы (два столбца)
  2. Кнопка "Настроить фон" в правом углу
  3. Отступ сверху (z-index) чтобы контент был поверх Background
  
  Background и BackgroundEditor рендерятся в App.tsx —
  PageWrapper не знает о них, он только показывает кнопку.
*/

import type { ReactNode } from 'react'
import { useAppDispatch } from '../../../hooks/redux'
import { toggleBackgroundEditor } from '../../../store/slices/uiSlice'

interface PageWrapperProps {
  header: ReactNode
  leftColumn: ReactNode
  rightColumn: ReactNode
}

export function PageWrapper({ header, leftColumn, rightColumn }: PageWrapperProps) {
  const dispatch = useAppDispatch()

  return (
    /*
      relative z-10 — контент поверх Background компонента (z-0).
      min-h-screen — страница всегда на всю высоту.
    */
    <div className="relative z-10 min-h-screen">
      <div className="max-w-[990px] mx-auto px-4 pb-8">

        {/* Шапка профиля */}
        <div className="mb-4">
          {header}
        </div>

        {/* Кнопка настройки фона — правый верхний угол */}
        <div className="flex justify-end mb-3">
          <button
            onClick={() => dispatch(toggleBackgroundEditor())}
            className="px-3 py-1.5 text-xs rounded transition-all duration-150"
            style={{
              background: 'var(--dp-bg-card)',
              color: 'var(--dp-text-secondary)',
              border: '1px solid var(--dp-border)',
              cursor: 'pointer',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = 'var(--dp-text-white)'
              e.currentTarget.style.borderColor = 'var(--dp-border-light)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = 'var(--dp-text-secondary)'
              e.currentTarget.style.borderColor = 'var(--dp-border)'
            }}
          >
            🎨 Настроить фон
          </button>
        </div>

        {/* Два столбца */}
        <div className="flex gap-4 items-start">
          <div className="flex-1 min-w-0 flex flex-col gap-4">
            {leftColumn}
          </div>
          <div className="w-[230px] shrink-0 flex flex-col gap-4">
            {rightColumn}
          </div>
        </div>

      </div>
    </div>
  )
}