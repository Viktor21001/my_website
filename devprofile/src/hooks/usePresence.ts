/*
  usePresence — отслеживает активность пользователя на странице.

  Зачем:
  Если пользователь открыл вкладку — статус "В сети".
  Если вкладка скрыта (свернул браузер) — статус "Отошёл".
  Это поведение как в Steam — статус меняется автоматически.

  Используем Page Visibility API:
  https://developer.mozilla.org/en-US/docs/Web/API/Page_Visibility_API

  В будущем когда будет WebSocket — отправляем статус на сервер.
  Пока просто обновляем Redux store.
*/

import { useEffect } from 'react'
import { useAppDispatch, useAppSelector } from './redux'
import { setStatus } from '../store/slices/profileSlice'

export function usePresence() {
  const dispatch      = useAppDispatch()
  const currentStatus = useAppSelector((state) => state.profile.user.status)

  useEffect(() => {
    function handleVisibilityChange() {
      /*
        document.hidden — true если вкладка скрыта.
        Не трогаем статус "В игре" — Steam важнее.
      */
      if (document.hidden) {
        if (currentStatus !== 'in-game') {
          dispatch(setStatus({
            status:     'offline',
            statusText: 'Не активен',
          }))
        }
      } else {
        if (currentStatus === 'offline') {
          dispatch(setStatus({
            status:     'online',
            statusText: 'В сети',
          }))
        }
      }
    }

    // Page Visibility API — срабатывает когда вкладка скрывается или появляется
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }

    /*
      currentStatus в зависимостях — нужно чтобы хук знал
      текущий статус и не перезаписывал "in-game".
    */
  }, [currentStatus, dispatch])
}