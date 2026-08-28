/*
  usePageTitle — обновляет title вкладки браузера.
  Как в Steam: "Yeliseyev — DevProfile"
  Если в игре: "🎮 Playing Subnautica 2 — DevProfile"
*/

import { useEffect } from 'react'
import { useAppSelector } from './redux'

export function usePageTitle() {
  const displayName = useAppSelector((state) => state.auth.user?.displayName ?? 'DevProfile')
  const { status, statusText } = useAppSelector((state) => state.profile)

  useEffect(() => {
    if (status === 'in-game' && statusText) {
      document.title = `🎮 ${statusText} — DevProfile`
    } else {
      document.title = `${displayName} — DevProfile`
    }
  }, [displayName, status, statusText])
}