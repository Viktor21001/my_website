/*
  SortablePanel — оборачивает одну панель в dnd-kit сортируемый элемент.
  Простой (не motion.div) враппер снаружи — transform/transition тут
  под управлением dnd-kit; сама панель внутри рендерится как есть, её
  собственный motion.div.dp-panel с variants={staggerItemVariants} не
  трогается, конфликта за transform между двумя библиотеками нет, т.к.
  это два разных DOM-узла.
*/

import type { ReactNode } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { PanelDragContext } from './dragContext'

export function SortablePanel({ id, children }: { id: string; children: ReactNode }) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } =
    useSortable({
      id,
      // Отключаем FLIP-анимацию перекладки — при переносе между колонками
      // (см. PanelBoard.onDragOver) она пересчитывает rects прямо во время
      // драга и провоцирует повторный collision detection в той же
      // синхронной цепочке, что раньше валило React в "Maximum update
      // depth exceeded" на кросс-колоночном переносе. Без неё панели
      // просто занимают новое место без плавного скольжения — не так
      // красиво, зато не роняет вкладку
      animateLayoutChanges: () => false,
    })

  return (
    <div
      ref={setNodeRef}
      data-testid={`panel-${id}`}
      style={{
        transform: CSS.Transform.toString(transform),
        transition: transition ?? undefined,
        opacity: isDragging ? 0.5 : 1,
      }}
    >
      <PanelDragContext.Provider value={{ attributes, listeners, setActivatorNodeRef, isDragging }}>
        {children}
      </PanelDragContext.Provider>
    </div>
  )
}
