/*
  BanDialog — маленькая форма поверх строки пользователя в AdminPanel:
  временный (с числом дней) или постоянный бан, причина обязательна —
  остаётся в audit-логе и показывается самому забаненному при попытке
  входа (см. Сервер/src/lib/ban.ts).
*/

import { useState } from 'react'
import { useBanUserMutation } from '../../../store/api/backendApi'
import { extractApiError } from '../../../utils/apiError'

interface BanDialogProps {
  userId: string
  onClose: () => void
  onBanned: () => void
}

export function BanDialog({ userId, onClose, onBanned }: BanDialogProps) {
  const [kind, setKind] = useState<'temporary' | 'permanent'>('temporary')
  const [days, setDays] = useState('7')
  const [reason, setReason] = useState('')
  const [banUser, { isLoading, error }] = useBanUserMutation()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!reason.trim()) return
    try {
      await banUser({
        id: userId,
        reason: reason.trim(),
        days: kind === 'temporary' ? Number(days) : undefined,
      }).unwrap()
      onBanned()
    } catch {
      // ошибка уже отражена через error ниже
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-2 p-3 mt-2"
      style={{ background: 'var(--dp-bg-card)', border: '1px solid var(--dp-border)', borderRadius: 6 }}
    >
      <div className="flex items-center gap-4 text-xs">
        <label className="flex items-center gap-1" style={{ cursor: 'pointer' }}>
          <input type="radio" checked={kind === 'temporary'} onChange={() => setKind('temporary')} />
          Временный
        </label>
        <label className="flex items-center gap-1" style={{ cursor: 'pointer' }}>
          <input type="radio" checked={kind === 'permanent'} onChange={() => setKind('permanent')} />
          Навсегда
        </label>
      </div>

      {kind === 'temporary' && (
        <input
          type="number" min={1} max={3650} step={1} required
          className="dp-input text-xs" value={days}
          onChange={(e) => setDays(e.target.value)}
          placeholder="Количество дней"
        />
      )}

      <textarea
        className="dp-input text-xs" rows={2} required
        value={reason} onChange={(e) => setReason(e.target.value)}
        placeholder="Причина бана (обязательно)"
      />

      {error && <div className="dp-error">{extractApiError(error, 'Не удалось забанить пользователя')}</div>}

      <div className="flex gap-2 justify-end">
        <button type="button" onClick={onClose} className="dp-btn-ghost text-xs">Отмена</button>
        <button type="submit" className="dp-btn-primary text-xs" disabled={isLoading}>
          {isLoading ? 'Баним…' : 'Забанить'}
        </button>
      </div>
    </form>
  )
}
