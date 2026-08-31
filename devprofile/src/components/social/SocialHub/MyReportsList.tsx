import { useEffect, useState } from 'react'
import { useLazyGetMyReportsQuery } from '../../../store/api/backendApi'
import { extractApiError } from '../../../utils/apiError'
import type { ReportEntry } from '../../../types/reports'

const CATEGORY_LABEL: Record<string, string> = {
  HARASSMENT: 'Оскорбления / преследование',
  SPAM: 'Спам',
  SCAM: 'Мошенничество',
  INAPPROPRIATE_PROFILE: 'Неприемлемый профиль',
  OTHER: 'Другое',
}

const RESOLUTION_LABEL: Record<string, string> = {
  NO_ACTION: 'Без действий',
  WARNING: 'Предупреждение',
  BAN_TEMPORARY: 'Временный бан',
  BAN_PERMANENT: 'Постоянный бан',
  OTHER: 'Другое',
}

function statusBadge(status: ReportEntry['status']): { text: string; color: string } {
  if (status === 'PENDING') return { text: 'На рассмотрении', color: 'var(--dp-text-muted)' }
  if (status === 'RESOLVED') return { text: 'Рассмотрена', color: 'var(--dp-green)' }
  return { text: 'Отклонена', color: 'var(--dp-red)' }
}

export function MyReportsList() {
  const [rows, setRows] = useState<ReportEntry[]>([])
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [fetchReports, { isFetching }] = useLazyGetMyReportsQuery()

  useEffect(() => {
    let cancelled = false
    fetchReports()
      .unwrap()
      .then((result) => {
        if (cancelled) return
        setRows(result.reports)
        setNextCursor(result.nextCursor)
      })
      .catch((err) => {
        if (cancelled) return
        setLoadError(extractApiError(err, 'Не удалось загрузить жалобы'))
      })
    return () => {
      cancelled = true
    }
  }, [fetchReports])

  function loadMore() {
    if (!nextCursor) return
    fetchReports({ cursor: nextCursor })
      .unwrap()
      .then((result) => {
        setRows((prev) => [...prev, ...result.reports])
        setNextCursor(result.nextCursor)
      })
      .catch((err) => setLoadError(extractApiError(err, 'Не удалось загрузить жалобы')))
  }

  return (
    <div className="flex flex-col gap-3">
      {loadError && <div className="dp-error">{loadError}</div>}

      <div className="flex flex-col gap-2">
        {rows.map((r) => {
          const badge = statusBadge(r.status)
          return (
            <div key={r.id} className="p-2 text-xs" style={{ background: 'var(--dp-bg-card)', border: '1px solid var(--dp-border)', borderRadius: 6 }}>
              <div className="flex items-center justify-between gap-2">
                <span style={{ color: 'var(--dp-text-white)' }}>
                  На <b>@{r.reportedUsername}</b> — {CATEGORY_LABEL[r.category] ?? r.category}
                </span>
                <span style={{ color: badge.color, whiteSpace: 'nowrap' }}>{badge.text}</span>
              </div>
              <div className="mt-1" style={{ color: 'var(--dp-text-secondary)' }}>{r.description}</div>

              {r.status !== 'PENDING' && (
                <div className="mt-2 pt-2" style={{ borderTop: '1px solid var(--dp-border)' }}>
                  {r.status === 'RESOLVED' ? (
                    <div style={{ color: 'var(--dp-text-primary)' }}>
                      Действие: <b>{RESOLUTION_LABEL[r.resolutionAction ?? ''] ?? r.resolutionAction}</b>
                      {r.resolutionNote && <div className="mt-0.5" style={{ color: 'var(--dp-text-secondary)' }}>{r.resolutionNote}</div>}
                    </div>
                  ) : (
                    <div style={{ color: 'var(--dp-text-secondary)' }}>
                      Причина отклонения: {r.resolutionNote}
                    </div>
                  )}
                  <div className="mt-1 text-[10px]" style={{ color: 'var(--dp-text-muted)' }}>
                    {r.resolvedByUsername && `@${r.resolvedByUsername} · `}
                    {r.resolvedAt && new Date(r.resolvedAt).toLocaleString('ru-RU')}
                  </div>
                </div>
              )}
            </div>
          )
        })}
        {rows.length === 0 && !isFetching && (
          <div className="text-xs text-center py-4" style={{ color: 'var(--dp-text-muted)' }}>Вы ещё не подавали жалоб</div>
        )}
      </div>

      {nextCursor && (
        <button
          onClick={loadMore}
          disabled={isFetching}
          className="w-full text-xs py-2"
          style={{ background: 'none', border: 'none', borderTop: '1px solid var(--dp-border)', cursor: 'pointer', color: 'var(--dp-text-secondary)' }}
        >
          {isFetching ? 'Загружаем…' : 'Показать ещё'}
        </button>
      )}
    </div>
  )
}
