/*
  Переиспользуемые состояния загрузки и ошибки.
  Используем везде где есть запросы к API —
  чтобы не дублировать один и тот же скелетон в каждом компоненте.
*/

// Скелетон загрузки — мигающие плашки как в Steam
export function SkeletonCard() {
  return (
    <div className="dp-panel overflow-hidden">
      <div
        className="dp-section-title"
        style={{ background: 'var(--dp-bg-panel)' }}
      >
        {/* Пустой заголовок — серая плашка */}
        <div
          className="h-3 w-32 rounded animate-pulse"
          style={{ background: 'var(--dp-border)' }}
        />
      </div>

      <div className="p-3 flex flex-col gap-3">
        {/* Три строки-скелетона */}
        {[100, 80, 90].map((w, i) => (
          <div key={i} className="flex flex-col gap-2">
            <div
              className="h-3 rounded animate-pulse"
              style={{
                width: `${w}%`,
                background: 'var(--dp-border)',
                animationDelay: `${i * 0.1}s`,
              }}
            />
            <div
              className="h-2 rounded animate-pulse w-1/2"
              style={{
                background: 'var(--dp-border)',
                animationDelay: `${i * 0.1 + 0.05}s`,
              }}
            />
          </div>
        ))}
      </div>
    </div>
  )
}

// Состояние ошибки
export function ErrorCard({ message }: { message?: string }) {
  return (
    <div className="dp-panel overflow-hidden">
      <div className="p-4 text-center">
        <div className="text-2xl mb-2">⚠️</div>
        <div
          className="text-xs"
          style={{ color: 'var(--dp-accent-orange)' }}
        >
          {message ?? 'Не удалось загрузить данные'}
        </div>
      </div>
    </div>
  )
}

// Пустое состояние
export function EmptyCard({ message }: { message: string }) {
  return (
    <div
      className="p-6 text-center text-xs"
      style={{ color: 'var(--dp-text-muted)' }}
    >
      {message}
    </div>
  )
}