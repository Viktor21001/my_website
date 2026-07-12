/*
  Skeleton использует dp-skeleton класс из index.css —
  красивый shimmer вместо простого pulse.
*/

export function SkeletonCard() {
  return (
    <div className="dp-panel">
      <div className="dp-section-title">
        <div className="dp-skeleton h-2.5 w-28" />
      </div>
      <div className="p-4 flex flex-col gap-3">
        {[92, 75, 84].map((w, i) => (
          <div key={i} className="flex flex-col gap-2">
            <div
              className="dp-skeleton h-3"
              style={{ width: `${w}%`, animationDelay: `${i * 0.15}s` }}
            />
            <div
              className="dp-skeleton h-2"
              style={{ width: `${w * 0.6}%`, animationDelay: `${i * 0.15 + 0.08}s` }}
            />
          </div>
        ))}
      </div>
    </div>
  )
}

export function ErrorCard({ message }: { message?: string }) {
  return (
    <div className="dp-panel">
      <div className="p-5 flex flex-col items-center gap-2 text-center">
        <span style={{ fontSize: 22 }}>⚠️</span>
        <span className="text-xs" style={{ color: 'var(--dp-orange)' }}>
          {message ?? 'Не удалось загрузить данные'}
        </span>
      </div>
    </div>
  )
}

export function EmptyCard({ message }: { message: string }) {
  return (
    <div
      className="px-4 py-8 text-center text-xs"
      style={{ color: 'var(--dp-text-muted)' }}
    >
      {message}
    </div>
  )
}