/*
  usePanelOrder — сверяет сохранённый на сервере порядок панелей
  (user.panelLayout) с текущим PANEL_REGISTRY и возвращает готовые
  к рендеру записи одной вкладки по колонкам.

  Сверка чисто клиентская, на чтение — в БД ничего не переписывается
  просто потому что появилась новая панель или её переставили:
  - id из сохранённого порядка, которых больше нет ни в одном реестре
    (панель удалили/переименовали) — молча выбрасываются;
  - id из СВОЕГО реестра вкладки, которых нет ни в сохранённом порядке
    этой вкладки, ни на КАКОЙ-ЛИБО другой (т.е. их вообще никто не
    трогал) — подставляются в конец штатной колонки;
  - id из своего реестра, которые сохранены на ДРУГОЙ вкладке (панель
    перетащили туда — см. AppBoard) — сюда молча НЕ возвращаются: иначе
    перенесённая панель после каждой перезагрузки дублировалась бы и
    там, и здесь.

  Проверка "жив ли ещё id" и резолв id -> узел — по GLOBAL_PANEL_LOOKUP
  (по всем вкладкам сразу), а не по локальному PANEL_LOOKUP[section]:
  панель, перетащенная на чужую вкладку, для СВОЕГО section-хука была бы
  неотличима от битого/удалённого id, если сверяться только со своим
  локальным реестром.
*/

import { useMemo } from 'react'
import { useAppSelector } from './redux'
import { PANEL_REGISTRY, GLOBAL_PANEL_LOOKUP } from '../config/panelRegistry'
import type { ActiveSection } from '../store/slices/uiSlice'
import type { PanelEntry } from '../config/panelRegistry'
import type { PanelLayoutPrefs } from '../types/profile'

function collectAllSavedIds(panelLayout: PanelLayoutPrefs | null | undefined): Set<string> {
  const ids = new Set<string>()
  if (!panelLayout) return ids
  for (const columns of Object.values(panelLayout)) {
    if (!columns) continue
    if (Array.isArray(columns.left)) columns.left.forEach((id) => typeof id === 'string' && ids.add(id))
    if (Array.isArray(columns.right)) columns.right.forEach((id) => typeof id === 'string' && ids.add(id))
  }
  return ids
}

export function usePanelOrder(section: ActiveSection): { left: PanelEntry[]; right: PanelEntry[] } {
  const panelLayout = useAppSelector((state) => state.auth.user?.panelLayout)

  return useMemo(() => {
    const defaults = PANEL_REGISTRY[section]
    const saved = panelLayout?.[section]

    const savedLeft = (Array.isArray(saved?.left) ? saved.left : [])
      .filter((id): id is string => typeof id === 'string' && id in GLOBAL_PANEL_LOOKUP)
    const savedRight = (Array.isArray(saved?.right) ? saved.right : [])
      .filter((id): id is string => typeof id === 'string' && id in GLOBAL_PANEL_LOOKUP)
    const placedHere = new Set([...savedLeft, ...savedRight])
    const placedAnywhere = collectAllSavedIds(panelLayout)

    // Свои по умолчанию панели, которых нет ни здесь, ни на какой-либо
    // другой вкладке — то есть их вообще никто не трогал
    const missingLeft = defaults.left.filter((e) => !placedHere.has(e.id) && !placedAnywhere.has(e.id)).map((e) => e.id)
    const missingRight = defaults.right.filter((e) => !placedHere.has(e.id) && !placedAnywhere.has(e.id)).map((e) => e.id)

    return {
      left: [...savedLeft, ...missingLeft].map((id) => GLOBAL_PANEL_LOOKUP[id]),
      right: [...savedRight, ...missingRight].map((id) => GLOBAL_PANEL_LOOKUP[id]),
    }
  }, [section, panelLayout])
}
