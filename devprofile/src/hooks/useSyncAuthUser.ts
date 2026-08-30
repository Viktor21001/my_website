/*
  useSyncAuthUser — при каждой загрузке с валидным токеном подтягивает
  свежего юзера с сервера (/auth/me) и мержит в authSlice.

  Зачем: в localStorage мог остаться user, сохранённый ДО того как
  на сервере/клиенте появились новые поля профиля (например background,
  githubUsername) — без этого хука пришлось бы вручную разлогиниваться,
  чтобы получить актуальную форму объекта.

  401/403 от /auth/me — токен истёк/невалиден, либо (см.
  middleware/authenticate.ts на сервере) аккаунт забанили уже ПОСЛЕ входа:
  JWT живёт 30 дней и сам по себе не отзывается, поэтому разлогинивание
  такой сессии происходит здесь, при первом же обращении к серверу —
  иначе забаненный пользователь продолжал бы видеть сайт как ни в чём
  не бывало вплоть до истечения токена.
*/

import { useEffect } from 'react'
import { useAppDispatch, useAppSelector } from './redux'
import { useGetMeQuery } from '../store/api/backendApi'
import { updateUser, logout } from '../store/slices/authSlice'

export function useSyncAuthUser() {
  const token = useAppSelector((state) => state.auth.token)
  const dispatch = useAppDispatch()
  const { data, error } = useGetMeQuery(undefined, { skip: !token })

  useEffect(() => {
    if (data) dispatch(updateUser(data))
  }, [data, dispatch])

  useEffect(() => {
    if (!error) return
    const status = (error as { status?: number | string }).status
    if (status === 401 || status === 403) dispatch(logout())
  }, [error, dispatch])
}
