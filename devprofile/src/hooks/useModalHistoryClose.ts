/*
  useModalHistoryClose — общая логика для bottom-sheet панелей типа
  SettingsPanel/FavoriteGamesPicker: без нее браузерная кнопка "назад"
  при открытой панели уводит со всего сайта целиком (SPA без роутера —
  URL не менялся, значит "назад" улетает в историю ДО сайта), а не
  просто закрывает панель.

  При открытии пушим отдельную запись в историю — "назад" вернётся
  на неё же (popstate) и просто закроет панель, оставаясь на странице.
  Esc делает то же самое, что и "назад" (через history.back(), чтобы
  не оставлять висящую запись, которую потом придётся "проходить"
  лишним нажатием назад).

  marker должен быть уникальным на панель — если открыты (в будущем)
  сразу две модалки с одинаковым marker, popstate от одной может
  закрыть не ту.
*/

import { useCallback, useEffect } from 'react'

export function useModalHistoryClose(isOpen: boolean, onClose: () => void, marker: string) {
  const close = useCallback(() => {
    if (window.history.state?.modal === marker) {
      window.history.back()
    } else {
      onClose()
    }
  }, [marker, onClose])

  useEffect(() => {
    if (!isOpen) return

    window.history.pushState({ modal: marker }, '')

    function handlePopState() {
      onClose()
    }
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [isOpen, marker, onClose])

  useEffect(() => {
    if (!isOpen) return
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') close()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, close])

  return close
}
