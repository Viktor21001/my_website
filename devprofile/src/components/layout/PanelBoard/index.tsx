/*
  PanelBoard — двухколоночная доска панелей одной вкладки с перетаскиванием
  за ручку в шапке (см. PanelHeader), в том числе между колонками.
  Заменяет прежний тройной тернарник в App.tsx, который жёстко перечислял
  панели прямо в JSX.

  DndContext — общий React-предок обеих колонок (PageWrapper сам не
  меняется, ему без разницы, что именно передали в leftColumn/rightColumn —
  DOM-соседство для dnd-kit не нужно, достаточно общего React-дерева).

  Порядок внутри рендера: локальный useState — источник истины ВО ВРЕМЯ
  и сразу ПОСЛЕ драга (оптимистично), инициализируется из usePanelOrder
  только при маунте компонента, а не при каждом изменении user.panelLayout —
  иначе успешное сохранение (которое обновляет Redux тем же значением, что
  уже применено локально) могло бы дёрнуть состояние прямо во время драга.
  Пересев при смене вкладки — не через эффект (react-hooks/set-state-in-effect
  такое не пропускает), а через remount: вызывающий App.tsx обязан передавать
  key={sectionId}, чтобы React полностью пересоздавал компонент на новой
  вкладке вместо переиспользования старого состояния.
*/

import { useState } from 'react'
import type { ReactNode } from 'react'
import {
  DndContext, pointerWithin, useDroppable,
  PointerSensor, KeyboardSensor, useSensor, useSensors,
} from '@dnd-kit/core'
import type { DragEndEvent, DragOverEvent, UniqueIdentifier } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy, sortableKeyboardCoordinates, arrayMove } from '@dnd-kit/sortable'
import { PageWrapper } from '../PageWrapper'
import { SortablePanel } from './SortablePanel'
import { usePanelOrder } from '../../../hooks/usePanelOrder'
import { useUpdateProfile } from '../../../hooks/useProfile'
import { useAppSelector } from '../../../hooks/redux'
import { PANEL_LOOKUP } from '../../../config/panelRegistry'
import type { ActiveSection } from '../../../store/slices/uiSlice'
import type { PanelColumnLayout } from '../../../types/profile'

type ColumnKey = 'left' | 'right'
type Columns = Record<ColumnKey, string[]>

function findContainer(columns: Columns, id: string): ColumnKey | null {
  if (id === 'left' || id === 'right') return id
  if (columns.left.includes(id)) return 'left'
  if (columns.right.includes(id)) return 'right'
  return null
}

export function PanelBoard({ sectionId, header }: { sectionId: ActiveSection; header: ReactNode }) {
  const defaults = usePanelOrder(sectionId)
  const [columns, setColumns] = useState<Columns>(() => ({
    left: defaults.left.map((e) => e.id),
    right: defaults.right.map((e) => e.id),
  }))

  const [updateProfile] = useUpdateProfile()
  const currentLayout = useAppSelector((state) => state.auth.user?.panelLayout)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  function handleDragOver(event: DragOverEvent) {
    const { active, over } = event
    if (!over) return
    const activeId = String(active.id)
    const overId = String(over.id)
    if (activeId === overId) return

    setColumns((prev) => {
      const activeContainer = findContainer(prev, activeId)
      const overContainer = findContainer(prev, overId)
      if (!activeContainer || !overContainer || activeContainer === overContainer) return prev

      const activeItems = prev[activeContainer]
      const overItems = prev[overContainer]
      const overIndex = overItems.indexOf(overId)
      const insertAt = overIndex >= 0 ? overIndex : overItems.length

      return {
        ...prev,
        [activeContainer]: activeItems.filter((id) => id !== activeId),
        [overContainer]: [...overItems.slice(0, insertAt), activeId, ...overItems.slice(insertAt)],
      }
    })
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over) return
    const activeId = String(active.id)
    const overId = String(over.id)

    const activeContainer = findContainer(columns, activeId)
    const overContainer = findContainer(columns, overId)
    if (!activeContainer || !overContainer) return

    let next = columns
    if (activeContainer === overContainer) {
      const items = columns[activeContainer]
      const activeIndex = items.indexOf(activeId)
      const overIndex = items.indexOf(overId)
      if (activeIndex !== -1 && overIndex !== -1 && activeIndex !== overIndex) {
        next = { ...columns, [activeContainer]: arrayMove(items, activeIndex, overIndex) }
      }
    }
    // Кросс-колоночный перенос уже применён вживую через onDragOver — здесь
    // просто фиксируем финальный порядок и сохраняем на сервере
    setColumns(next)

    const layout: PanelColumnLayout = { left: next.left, right: next.right }
    updateProfile({ panelLayout: { ...(currentLayout ?? {}), [sectionId]: layout } }).catch(() => {})
  }

  const lookup = PANEL_LOOKUP[sectionId]

  /*
    pointerWithin, а не closestCenter — с двумя колонками closestCenter
    у границы между ними колеблется между «ближайший сосед в старой
    колонке» и «сама колонка/сосед в новой» на каждый кадр (item и
    контейнер оба droppable и оба остаются «близкими» центрами), из-за
    чего элемент дёргался туда-сюда десятками onDragOver подряд и
    валил React в "Maximum update depth exceeded". pointerWithin матчит
    только то, над чем курсор реально находится — без этой двусмысленности.
  */
  return (
    <DndContext sensors={sensors} collisionDetection={pointerWithin} onDragOver={handleDragOver} onDragEnd={handleDragEnd}>
      <PageWrapper
        header={header}
        leftColumn={<PanelColumn id="left" ids={columns.left} lookup={lookup} />}
        rightColumn={<PanelColumn id="right" ids={columns.right} lookup={lookup} />}
      />
    </DndContext>
  )
}

function PanelColumn({
  id, ids, lookup,
}: {
  id: ColumnKey
  ids: string[]
  lookup: Record<string, { id: string; node: ReactNode }>
}) {
  // useDroppable с id колонки — чтобы можно было навести на пустое место
  // в конце/внутри колонки (over.id тогда сам id колонки, а не панели)
  const { setNodeRef } = useDroppable({ id })
  return (
    <div ref={setNodeRef} className="flex flex-col gap-3 w-full" data-testid={`panel-column-${id}`}>
      <SortableContext items={ids as UniqueIdentifier[]} strategy={verticalListSortingStrategy}>
        {ids.map((panelId) => {
          const entry = lookup[panelId]
          if (!entry) return null
          return (
            <SortablePanel key={panelId} id={panelId}>
              {entry.node}
            </SortablePanel>
          )
        })}
      </SortableContext>
    </div>
  )
}
