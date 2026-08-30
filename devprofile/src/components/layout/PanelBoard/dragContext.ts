/*
  PanelDragContext — прокидывает dnd-kit'овские attributes/listeners
  ручке-хваталке внутри PanelHeader, не заставляя каждую панель принимать
  их пропсами (панели сегодня самодостаточные, без пропсов на эти вещи).
  Провайдер — SortablePanel; если панель отрендерена вне PanelBoard,
  контекст null и PanelHeader просто не показывает ручку.
*/

import { createContext } from 'react'
import type { DraggableAttributes, DraggableSyntheticListeners } from '@dnd-kit/core'

export interface PanelDragCtx {
  attributes: DraggableAttributes
  listeners: DraggableSyntheticListeners
  setActivatorNodeRef: (element: HTMLElement | null) => void
  isDragging: boolean
}

export const PanelDragContext = createContext<PanelDragCtx | null>(null)
