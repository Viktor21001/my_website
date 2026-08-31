import { useEffect, useState } from 'react'
import { useLazyGetBlocksQuery, useUnblockUserMutation } from '../../../store/api/backendApi'
import { extractApiError } from '../../../utils/apiError'
import { Avatar } from '../../shared/Avatar'
import type { BlockEntry } from '../../../types/blocks'

export function BlocklistTab() {
  const [rows, setRows] = useState<BlockEntry[]>([])
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [fetchBlocks, { isFetching }] = useLazyGetBlocksQuery()

  useEffect(() => {
    let cancelled = false
    fetchBlocks()
      .unwrap()
      .then((result) => {
        if (cancelled) return
        setRows(result.blocks)
        setNextCursor(result.nextCursor)
        setLoadError(null)
      })
      .catch((err) => {
        if (cancelled) return
        setLoadError(extractApiError(err, 'Не удалось загрузить чёрный список'))
      })
    return () => {
      cancelled = true
    }
  }, [fetchBlocks])

  function loadMore() {
    if (!nextCursor) return
    fetchBlocks({ cursor: nextCursor })
      .unwrap()
      .then((result) => {
        setRows((prev) => [...prev, ...result.blocks])
        setNextCursor(result.nextCursor)
      })
      .catch((err) => setLoadError(extractApiError(err, 'Не удалось загрузить чёрный список')))
  }

  function refresh() {
    fetchBlocks()
      .unwrap()
      .then((result) => {
        setRows(result.blocks)
        setNextCursor(result.nextCursor)
      })
      .catch((err) => setLoadError(extractApiError(err, 'Не удалось обновить чёрный список')))
  }

  return (
    <div className="flex flex-col gap-3">
      {loadError && <div className="dp-error">{loadError}</div>}

      <div className="flex flex-col gap-2">
        {rows.map((entry) => (
          <BlockRow key={entry.id} entry={entry} onChanged={refresh} />
        ))}
        {rows.length === 0 && !isFetching && (
          <div className="text-xs text-center py-4" style={{ color: 'var(--dp-text-muted)' }}>
            Чёрный список пуст
          </div>
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

function BlockRow({ entry, onChanged }: { entry: BlockEntry; onChanged: () => void }) {
  const [actionError, setActionError] = useState<string | null>(null)
  const [unblockUser, { isLoading }] = useUnblockUserMutation()

  function handleUnblock() {
    setActionError(null)
    unblockUser(entry.user.id)
      .unwrap()
      .then(onChanged)
      .catch((err) => setActionError(extractApiError(err, 'Не удалось убрать из чёрного списка')))
  }

  return (
    <div className="p-2" style={{ background: 'var(--dp-bg-card)', border: '1px solid var(--dp-border)', borderRadius: 6 }}>
      <div className="flex items-center gap-3">
        <Avatar src={entry.user.avatar} name={entry.user.displayName} size={36} background="var(--dp-bg-panel)" />
        <div className="flex-1 min-w-0">
          <div className="text-xs font-semibold truncate" style={{ color: 'var(--dp-text-white)' }}>{entry.user.displayName}</div>
          <div className="text-[10px] truncate" style={{ color: 'var(--dp-text-muted)' }}>@{entry.user.username}</div>
        </div>
        <button onClick={handleUnblock} disabled={isLoading} className="dp-btn-ghost text-xs shrink-0">
          Убрать из ЧС
        </button>
      </div>
      {actionError && <div className="dp-error mt-2">{actionError}</div>}
    </div>
  )
}
