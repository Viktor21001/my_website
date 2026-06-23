import { useDispatch, useSelector } from 'react-redux'
import type { RootState, AppDispatch } from '../store'

/*
  Обёртки над useDispatch и useSelector с нашими типами.
  
  Почему не использовать оригинальные хуки напрямую?
  Без обёрток каждый раз пришлось бы писать:
    useSelector((state: RootState) => state.profile.user)
  
  С нашими хуками просто:
    useAppSelector((state) => state.profile.user)
  TypeScript сам знает тип state — никаких ручных аннотаций.
*/
export const useAppDispatch = () => useDispatch<AppDispatch>()

export const useAppSelector = <T>(selector: (state: RootState) => T): T =>
  useSelector(selector)