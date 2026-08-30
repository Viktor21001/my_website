/*
  PanelHeader — общая шапка панели: заголовок слева, любой правый контент
  (под-вкладки, одиночная кнопка-иконка и т.п.) и ручка-хваталка для
  перетаскивания (если панель внутри PanelBoard) — всегда самая последняя,
  в правом углу.

  Раньше у каждой панели такая строка была прописана вручную (одни —
  просто <div className="dp-section-title">, другие — рукописный
  flex-justify-between с дублирующимся кодом между RecentActivity и
  WorkoutLog) — теперь один компонент на все панели.
*/

import { useContext } from 'react'
import type { ReactNode } from 'react'
import { PanelDragContext } from '../../layout/PanelBoard/dragContext'
import type { PanelDragCtx } from '../../layout/PanelBoard/dragContext'

interface PanelHeaderProps {
  title: ReactNode
  right?: ReactNode
}

export function PanelHeader({ title, right }: PanelHeaderProps) {
  const dragCtx = useContext(PanelDragContext)

  // Без правого контента и вне контекста драга — прежняя простая полоса
  if (!right && !dragCtx) {
    return <div className="dp-section-title">{title}</div>
  }

  return (
    <div
      className="flex items-center justify-between"
      style={{ background: 'rgba(0,0,0,0.2)', borderBottom: '1px solid var(--dp-border)' }}
    >
      <span className="dp-section-title" style={{ border: 'none', background: 'none' }}>
        {title}
      </span>
      <div className="flex items-center">
        {right}
        {dragCtx && <DragHandleButton ctx={dragCtx} />}
      </div>
    </div>
  )
}

function DragHandleButton({ ctx }: { ctx: PanelDragCtx }) {
  const { attributes, listeners, setActivatorNodeRef, isDragging } = ctx
  return (
    <button
      ref={setActivatorNodeRef}
      {...attributes}
      {...listeners}
      className="dp-drag-handle"
      aria-label="Перетащить панель"
      style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
    >
      ☰
    </button>
  )
}
