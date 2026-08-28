/*
  useSyncAuthUser — при каждой загрузке с валидным токеном подтягивает
  свежего юзера с сервера (/auth/me) и мержит в authSlice.

  Зачем: в localStorage мог остаться user, сохранённый ДО того как
  на сервере/клиенте появились новые поля профиля (например background,
  githubUsername) — без этого хука пришлось бы вручную разлогиниваться,
  чтобы получить актуальную форму объекта.
*/

import { useEffect } from 'react'
import { useAppDispatch, useAppSelector } from './redux'
import { useGetMeQuery } from '../store/api/backendApi'
import { updateUser } from '../store/slices/authSlice'

export function useSyncAuthUser() {
  const token = useAppSelector((state) => state.auth.token)
  const dispatch = useAppDispatch()
  const { data } = useGetMeQuery(undefined, { skip: !token })

  useEffect(() => {
    if (data) dispatch(updateUser(data))
  }, [data, dispatch])
}
