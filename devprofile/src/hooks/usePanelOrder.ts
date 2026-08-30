/*
  usePanelOrder — сверяет сохранённый на сервере порядок панелей
  (user.panelLayout[section]) с текущим PANEL_REGISTRY и возвращает
  готовые к рендеру записи по колонкам.

  Сверка чисто клиентская, на чтение — в БД ничего не переписывается
  просто потому что появилась новая панель:
  - id из сохранённого порядка, которых больше нет в реестре (панель
    удалили/переименовали) — молча выбрасываются;
  - id из реестра, которых нет в сохранённом порядке (панель добавили
    после того как пользователь в последний раз перетаскивал) —
    подставляются в конец СВОЕЙ штатной колонки по реестру, а не туда,
    где на них наткнулся цикл.
*/

import { useMemo } from 'react'
import { useAppSelector } from './redux'
import { PANEL_REGISTRY, PANEL_LOOKUP } from '../config/panelRegistry'
import type { ActiveSection } from '../store/slices/uiSlice'
import type { PanelEntry } from '../config/panelRegistry'

export function usePanelOrder(section: ActiveSection): { left: PanelEntry[]; right: PanelEntry[] } {
  const saved = useAppSelector((state) => state.auth.user?.panelLayout?.[section])

  return useMemo(() => {
    const defaults = PANEL_REGISTRY[section]
    const lookup = PANEL_LOOKUP[section]

    if (!saved || !Array.isArray(saved.left) || !Array.isArray(saved.right)) {
      return defaults
    }

    const savedLeft = saved.left.filter((id): id is string => typeof id === 'string' && id in lookup)
    const savedRight = saved.right.filter((id): id is string => typeof id === 'string' && id in lookup)
    const placed = new Set([...savedLeft, ...savedRight])

    const missingLeft = defaults.left.filter((entry) => !placed.has(entry.id)).map((entry) => entry.id)
    const missingRight = defaults.right.filter((entry) => !placed.has(entry.id)).map((entry) => entry.id)

    return {
      left: [...savedLeft, ...missingLeft].map((id) => lookup[id]),
      right: [...savedRight, ...missingRight].map((id) => lookup[id]),
    }
  }, [section, saved])
}
