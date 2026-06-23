/*
  LanguageBar — горизонтальная полоска языков программирования.
  Аналог полоски языков на GitHub репозитории.
  
  Пример:
  TS ████████░░ 72%   CSS ███░░ 20%   HTML ░ 8%
  
  Принимает languages через props — компонент переиспользуется
  как в карточке репозитория так и в общей статистике профиля.
*/

import type { TopLanguage } from '../../../types/github'

interface LanguageBarProps {
  languages: TopLanguage[]
  showLabels?: boolean  // показывать ли подписи под полоской
}

export function LanguageBar({ languages, showLabels = true }: LanguageBarProps) {
  if (languages.length === 0) return null

  return (
    <div className="w-full">
      {/* Цветная полоска — сегменты пропорциональны процентам */}
      <div className="flex h-1.5 rounded-full overflow-hidden gap-px">
        {languages.map((lang) => (
          <div
            key={lang.name}
            title={`${lang.name}: ${lang.percent}%`}
            className="transition-all duration-300"
            style={{
              width: `${lang.percent}%`,
              background: lang.color,
              minWidth: lang.percent > 0 ? '2px' : '0',
            }}
          />
        ))}
      </div>

      {/* Подписи языков */}
      {showLabels && (
        <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1.5">
          {languages.map((lang) => (
            <div key={lang.name} className="flex items-center gap-1">
              {/* Цветная точка */}
              <div
                className="w-2 h-2 rounded-full shrink-0"
                style={{ background: lang.color }}
              />
              <span
                className="text-xs"
                style={{ color: 'var(--dp-text-secondary)' }}
              >
                {lang.name}
              </span>
              <span
                className="text-xs"
                style={{ color: 'var(--dp-text-muted)' }}
              >
                {lang.percent}%
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}