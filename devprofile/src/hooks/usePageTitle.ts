/*
  usePageTitle — обновляет title вкладки браузера.
  Как в Steam: "Yeliseyev — DevProfile"
  Если в игре: "🎮 Playing Subnautica 2 — DevProfile"
*/

import { useEffect } from 'react'
import { useAppSelector } from './redux'

export function usePageTitle() {
  const { displayName, status, statusText } =
    useAppSelector((state) => state.profile.user)

  useEffect(() => {
    if (status === 'in-game' && statusText) {
      document.title = `🎮 ${statusText} — DevProfile`
    } else {
      document.title = `${displayName} — DevProfile`
    }
  }, [displayName, status, statusText])
}