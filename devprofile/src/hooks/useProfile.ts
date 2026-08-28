/*
  useUpdateProfile — обёртка над useUpdateProfileMutation, которая
  дополнительно мержит ответ сервера в authSlice.user (и localStorage)
  через updateUser. Без этого шапка/фон не обновились бы сразу после
  сохранения настроек — пришлось бы ждать следующего /auth/me.
*/

import { useAppDispatch } from './redux'
import { useUpdateProfileMutation } from '../store/api/backendApi'
import { updateUser } from '../store/slices/authSlice'
import type { UpdateProfilePayload } from '../types/auth'

export function useUpdateProfile() {
  const dispatch = useAppDispatch()
  const [mutate, state] = useUpdateProfileMutation()

  async function updateProfile(payload: UpdateProfilePayload) {
    const result = await mutate(payload).unwrap()
    dispatch(updateUser(result))
    return result
  }

  return [updateProfile, state] as const
}
