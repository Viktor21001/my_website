/*
  PersonActions — «✉ Написать» + «＋ В друзья» для карточки другого
  пользователя. Вынесено из AgeGroupLeaderboard (первое место, где
  появилась эта пара кнопок) — поиск по людям (SearchBar) стал вторым
  местом с той же ровно логикой, дальше дублировать было бы неправильно.
*/

import { useState } from 'react'
import { useSendFriendRequestMutation, useStartDirectConversationMutation } from '../../../store/api/backendApi'
import { useAppDispatch } from '../../../hooks/redux'
import { openConversation } from '../../../store/slices/uiSlice'
import { extractApiError } from '../../../utils/apiError'
import { ReportDialog } from '../ReportDialog'

interface PersonActionsProps {
  userId: string
}

export function PersonActions({ userId }: PersonActionsProps) {
  const [reporting, setReporting] = useState(false)
  const [reported, setReported] = useState(false)

  return (
    <div className="shrink-0 flex flex-col items-end gap-1.5">
      <div className="flex items-start gap-1.5">
        <WriteButton userId={userId} />
        <AddFriendButton userId={userId} />
        {!reported && (
          <button
            onClick={() => setReporting((v) => !v)}
            title="Пожаловаться"
            className="dp-btn-ghost text-xs"
            style={{ padding: '0 8px' }}
          >
            🚩
          </button>
        )}
      </div>
      {reporting && (
        <div style={{ width: 260 }}>
          <ReportDialog
            reportedUserId={userId}
            onClose={() => setReporting(false)}
            onSent={() => {
              setReporting(false)
              setReported(true)
            }}
          />
        </div>
      )}
      {reported && <span className="text-xs" style={{ color: 'var(--dp-green)' }}>Жалоба отправлена</span>}
    </div>
  )
}

// Состояние 3-е (уже друзья / уже заявка) сервер знает лучше клиента — не
// подгружаем отдельно списки друзей/заявок ради подсветки кнопки, просто
// показываем понятную ошибку, если действие уже не имеет смысла
function AddFriendButton({ userId }: { userId: string }) {
  const [sendRequest, { isLoading }] = useSendFriendRequestMutation()
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleClick() {
    setError(null)
    try {
      await sendRequest({ addresseeId: userId }).unwrap()
      setSent(true)
    } catch (err) {
      setError(extractApiError(err, 'Не удалось отправить заявку'))
    }
  }

  if (sent) {
    return <span className="shrink-0 text-xs" style={{ color: 'var(--dp-green)' }}>Заявка отправлена</span>
  }

  return (
    <div className="shrink-0 flex flex-col items-end gap-1">
      <button onClick={handleClick} disabled={isLoading} className="dp-btn-ghost text-xs">
        ＋ В друзья
      </button>
      {error && <span className="text-[10px]" style={{ color: 'var(--dp-red)' }}>{error}</span>}
    </div>
  )
}

/*
  «Написать» — сервер сам решает, можно ли сразу открыть чат (друзья или
  приватность EVERYONE у получателя) или нет: 403 в ответ на попытку
  переключает кнопку в форму заявки в друзья с сообщением — ровно то самое
  "одно сообщение", которое приватность FRIENDS_ONLY разрешает не-другу.
  Клиент не пытается заранее угадать приватность получателя.
*/
function WriteButton({ userId }: { userId: string }) {
  const dispatch = useAppDispatch()
  const [startConversation, { isLoading: opening }] = useStartDirectConversationMutation()
  const [sendRequest, { isLoading: sendingRequest }] = useSendFriendRequestMutation()
  const [needsRequestFlow, setNeedsRequestFlow] = useState(false)
  const [message, setMessage] = useState('')
  const [requestSent, setRequestSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleWrite() {
    setError(null)
    try {
      const result = await startConversation(userId).unwrap()
      dispatch(openConversation(result.conversation.id))
    } catch (err) {
      if ((err as { status?: number })?.status === 403) {
        setNeedsRequestFlow(true)
      } else {
        setError(extractApiError(err, 'Не удалось открыть чат'))
      }
    }
  }

  async function handleSendRequestWithMessage() {
    setError(null)
    try {
      await sendRequest({ addresseeId: userId, message: message.trim() || undefined }).unwrap()
      setRequestSent(true)
    } catch (err) {
      setError(extractApiError(err, 'Не удалось отправить заявку'))
    }
  }

  if (requestSent) {
    return <span className="shrink-0 text-xs" style={{ color: 'var(--dp-green)' }}>Заявка отправлена</span>
  }

  if (needsRequestFlow) {
    return (
      <div className="shrink-0 flex flex-col items-end gap-1" style={{ width: 200 }}>
        <span className="text-[10px] text-right" style={{ color: 'var(--dp-text-muted)' }}>
          Можно написать только вместе с заявкой в друзья
        </span>
        <input
          type="text" className="dp-input text-xs" placeholder="Сообщение (необязательно)"
          value={message} onChange={(e) => setMessage(e.target.value)}
        />
        <button onClick={handleSendRequestWithMessage} disabled={sendingRequest} className="dp-btn-ghost text-xs">
          Отправить заявку
        </button>
        {error && <span className="text-[10px]" style={{ color: 'var(--dp-red)' }}>{error}</span>}
      </div>
    )
  }

  return (
    <div className="shrink-0 flex flex-col items-end gap-1">
      <button onClick={handleWrite} disabled={opening} className="dp-btn-ghost text-xs">
        ✉ Написать
      </button>
      {error && <span className="text-[10px]" style={{ color: 'var(--dp-red)' }}>{error}</span>}
    </div>
  )
}
