/*
  PageWrapper — скелет всей страницы.
  Повторяет layout Steam профиля:
  
  ┌─────────────────────────────────────────┐
  │            ШАПКА ПРОФИЛЯ                │
  ├───────────────────────┬─────────────────┤
  │                       │                 │
  │    ЛЕВЫЙ СТОЛБЕЦ      │  ПРАВЫЙ СТОЛБЕЦ │
  │    (основной контент) │  (статистика)   │
  │                       │                 │
  └───────────────────────┴─────────────────┘
  
  Принимает children через ReactNode — не знает что внутри.
  Это правильно: PageWrapper отвечает только за layout.
*/

import type { ReactNode } from 'react'

interface PageWrapperProps {
  header: ReactNode      // шапка на всю ширину
  leftColumn: ReactNode  // основной контент
  rightColumn: ReactNode // боковая панель
}

export function PageWrapper({ header, leftColumn, rightColumn }: PageWrapperProps) {
  return (
    /*
      Минимальная высота экрана, фон из наших CSS переменных.
      max-w-6xl + mx-auto — центрируем страницу как в Steam.
    */
    <div className="min-h-screen" style={{ backgroundColor: 'var(--dp-bg-page)' }}>
      <div className="max-w-[990px] mx-auto px-4 pb-8">

        {/* Шапка профиля — на всю ширину */}
        <div className="mb-4">
          {header}
        </div>

        {/* Два столбца */}
        <div className="flex gap-4 items-start">

          {/* Левый — широкий, основной контент */}
          <div className="flex-1 min-w-0 flex flex-col gap-4">
            {leftColumn}
          </div>

          {/* Правый — фиксированная ширина 230px как в Steam */}
          <div className="w-[230px] shrink-0 flex flex-col gap-4">
            {rightColumn}
          </div>

        </div>
      </div>
    </div>
  )
}