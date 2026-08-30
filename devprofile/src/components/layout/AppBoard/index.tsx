/*
  AppBoard — единственная доска панелей на всё приложение (заменяет
  прежний PanelBoard, который пересоздавался на каждой вкладке через
  key={activeSection}). Один постоянный DndContext на все 4 вкладки —
  это то, что вообще делает перетаскивание панели МЕЖДУ вкладками
  возможным: если бы DndContext пересоздавался при смене вкладки,
  перетаскиваемый элемент терялся бы в момент переключения.

  Контейнеров для dnd-kit теперь 8 (`${section}-left`/`${section}-right`
  на каждую из 4 вкладок), а не 2 — findContainer ищет по всем сразу.
  Плюс новый вид цели — кнопки вкладок (id: 'tab-<section>', см.
  SectionTabs) — наведение на них во время драга переключает activeSection,
  а не перекладывает панель.

  Активная вкладка смонтирована всегда. Остальные три — только пока
  isDragging === true (иначе им неоткуда взяться как валидным зонам
  сброса), скрыты через hidden (не unmount), пока не активны — так
  большую часть времени нагрузка (данные с GitHub/Steam/сервера) ровно
  как раньше — тянет только активная вкладка.
*/

import { useRef, useState } from 'react'
import type { ReactNode } from 'react'
import {
  DndContext, pointerWithin, useDroppable, MeasuringStrategy,
  PointerSensor, KeyboardSensor, useSensor, useSensors,
} from '@dnd-kit/core'
import type { CollisionDetection, DragEndEvent, DragOverEvent, UniqueIdentifier } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy, sortableKeyboardCoordinates, arrayMove } from '@dnd-kit/sortable'
import { PageWrapper } from '../PageWrapper'
import { SortablePanel } from './SortablePanel'
import { usePanelOrder } from '../../../hooks/usePanelOrder'
import { useUpdateProfile } from '../../../hooks/useProfile'
import { useAppSelector, useAppDispatch } from '../../../hooks/redux'
import { setActiveSection } from '../../../store/slices/uiSlice'
import { GLOBAL_PANEL_LOOKUP } from '../../../config/panelRegistry'
import type { PanelEntry } from '../../../config/panelRegistry'
import type { ActiveSection } from '../../../store/slices/uiSlice'
import type { PanelLayoutPrefs } from '../../../types/profile'

const ALL_SECTIONS: ActiveSection[] = ['general', 'profile', 'fitness', 'games']

type ColumnKey = 'left' | 'right'
type SectionColumns = Record<ColumnKey, string[]>
type Columns = Record<ActiveSection, SectionColumns>

function containerId(section: ActiveSection, column: ColumnKey): string {
  return `${section}-${column}`
}

function parseContainerId(id: string): { section: ActiveSection; column: ColumnKey } | null {
  for (const section of ALL_SECTIONS) {
    if (id === containerId(section, 'left')) return { section, column: 'left' }
    if (id === containerId(section, 'right')) return { section, column: 'right' }
  }
  return null
}

function findContainer(columns: Columns, id: string): { section: ActiveSection; column: ColumnKey } | null {
  const direct = parseContainerId(id)
  if (direct) return direct
  for (const section of ALL_SECTIONS) {
    if (columns[section].left.includes(id)) return { section, column: 'left' }
    if (columns[section].right.includes(id)) return { section, column: 'right' }
  }
  return null
}

export function AppBoard({ header }: { header: ReactNode }) {
  const activeSection = useAppSelector((state) => state.ui.activeSection)
  const dispatch = useAppDispatch()
  const [updateProfile] = useUpdateProfile()

  const generalDefaults = usePanelOrder('general')
  const profileDefaults = usePanelOrder('profile')
  const fitnessDefaults = usePanelOrder('fitness')
  const gamesDefaults = usePanelOrder('games')

  const [columns, setColumns] = useState<Columns>(() => ({
    general: { left: generalDefaults.left.map((e) => e.id), right: generalDefaults.right.map((e) => e.id) },
    profile: { left: profileDefaults.left.map((e) => e.id), right: profileDefaults.right.map((e) => e.id) },
    fitness: { left: fitnessDefaults.left.map((e) => e.id), right: fitnessDefaults.right.map((e) => e.id) },
    games: { left: gamesDefaults.left.map((e) => e.id), right: gamesDefaults.right.map((e) => e.id) },
  }))
  const [isDragging, setIsDragging] = useState(false)
  // Снимок columns на момент старта драга — чтобы onDragCancel мог
  // откатить уже применённые вживую (через onDragOver) перестановки,
  // а не оставлять локальное состояние разъехавшимся с сервером
  const dragStartSnapshot = useRef<Columns | null>(null)
  // Наведение на кнопку вкладки коммитится не сразу, а только если тот же
  // over.id продержался немного (см. handleDragOver) — переключение
  // activeSection тут же скрывает/показывает целые колонки панелей, и
  // если это происходит на каждый "дрожащий" over ровно у границы кнопки,
  // получается каскад переключений внутри одного и того же зависания
  // курсора; с задержкой единичные колебания просто отменяют друг друга
  const pendingTabSwitch = useRef<{ target: ActiveSection; timer: ReturnType<typeof setTimeout> } | null>(null)

  function clearPendingTabSwitch() {
    if (pendingTabSwitch.current) {
      clearTimeout(pendingTabSwitch.current.timer)
      pendingTabSwitch.current = null
    }
  }

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  // Неактивные вкладки во время драга остаются СМОНТИРОВАНЫ (валидные
  // зоны сброса), но визуально скрыты (display:none) — их rects
  // проверены через getComputedStyle: коллапсируют в 0x0 сразу же после
  // переключения. Тем не менее pointerWithin у dnd-kit продолжает
  // попадать на их id ещё несколько кадров после — его внутренний кэш
  // rects (даже с MeasuringStrategy.Always) отстаёт от фактического
  // DOM на переходе. Поэтому кандидаты на collision detection жёстко
  // фильтруются по текущей activeSection ДО вызова pointerWithin —
  // скрытая колонка/панель физически не может совпасть, даже если её
  // закэшированный rect у dnd-kit ещё не обновился
  const collisionDetection: CollisionDetection = (args) => {
    const filtered = args.droppableContainers.filter((c) => {
      const id = String(c.id)
      if (id.startsWith('tab-')) return true
      return findContainer(columns, id)?.section === activeSection
    })
    return pointerWithin({ ...args, droppableContainers: filtered })
  }

  function handleDragStart() {
    dragStartSnapshot.current = columns
    setIsDragging(true)
  }

  function handleDragOver(event: DragOverEvent) {
    const { active, over } = event
    if (!over) return
    const activeId = String(active.id)
    const overId = String(over.id)
    if (activeId === overId) return

    // Наведение на кнопку вкладки — переключаем activeSection (с небольшой
    // задержкой на дребезг, см. pendingTabSwitch), это не перекладка
    // панели; сама панель остаётся там же до реального drop'а на колонку
    // уже открывшейся вкладки
    if (overId.startsWith('tab-')) {
      const target = overId.slice('tab-'.length) as ActiveSection
      if (!ALL_SECTIONS.includes(target) || target === activeSection) {
        clearPendingTabSwitch()
        return
      }
      if (pendingTabSwitch.current?.target !== target) {
        clearPendingTabSwitch()
        const timer = setTimeout(() => {
          dispatch(setActiveSection(target))
          pendingTabSwitch.current = null
        }, 150)
        pendingTabSwitch.current = { target, timer }
      }
      return
    }
    // Курсор ушёл с кнопки вкладки на что-то другое — не начатое
    // переключение отменяем, а не оставляем тикать в фоне
    clearPendingTabSwitch()

    setColumns((prev) => {
      const activeLoc = findContainer(prev, activeId)
      const overLoc = findContainer(prev, overId)
      if (!activeLoc || !overLoc) return prev
      if (activeLoc.section === overLoc.section && activeLoc.column === overLoc.column) return prev

      const activeItems = prev[activeLoc.section][activeLoc.column]
      const overItems = prev[overLoc.section][overLoc.column]
      const overIndex = overItems.indexOf(overId)
      const insertAt = overIndex >= 0 ? overIndex : overItems.length
      const newActiveItems = activeItems.filter((id) => id !== activeId)
      const newOverItems = [...overItems.slice(0, insertAt), activeId, ...overItems.slice(insertAt)]

      // Один и тот же раздел (просто left<->right) — оба поля пишем в один
      // объект секции разом, иначе второй spread затёр бы первый
      if (activeLoc.section === overLoc.section) {
        return {
          ...prev,
          [activeLoc.section]: { [activeLoc.column]: newActiveItems, [overLoc.column]: newOverItems },
        }
      }

      return {
        ...prev,
        [activeLoc.section]: { ...prev[activeLoc.section], [activeLoc.column]: newActiveItems },
        [overLoc.section]: { ...prev[overLoc.section], [overLoc.column]: newOverItems },
      }
    })
  }

  function persist(next: Columns) {
    updateProfile({ panelLayout: next as PanelLayoutPrefs }).catch(() => {})
  }

  function handleDragEnd(event: DragEndEvent) {
    setIsDragging(false)
    clearPendingTabSwitch()
    const { active, over } = event
    const activeId = String(active.id)

    // columns уже отражает любые кросс-контейнерные (колонка/вкладка)
    // переносы, применённые вживую через onDragOver — сохраняем текущее
    // состояние ВСЕГДА, даже если отпустили прямо на кнопке вкладки или
    // мимо любой цели, а не только при точном попадании на другую панель
    // (иначе уже применённая вживую перестановка молча терялась бы,
    // не сохранившись — по локальному состоянию видно одно, на сервере
    // другое, и следующая перезагрузка страницы «откатывала» бы её)
    let next = columns
    if (over) {
      const overId = String(over.id)
      if (!overId.startsWith('tab-') && activeId !== overId) {
        const activeLoc = findContainer(columns, activeId)
        const overLoc = findContainer(columns, overId)
        if (activeLoc && overLoc && activeLoc.section === overLoc.section && activeLoc.column === overLoc.column) {
          const items = columns[activeLoc.section][activeLoc.column]
          const activeIndex = items.indexOf(activeId)
          const overIndex = items.indexOf(overId)
          if (activeIndex !== -1 && overIndex !== -1 && activeIndex !== overIndex) {
            next = {
              ...columns,
              [activeLoc.section]: { ...columns[activeLoc.section], [activeLoc.column]: arrayMove(items, activeIndex, overIndex) },
            }
          }
        }
      }
    }

    setColumns(next)
    persist(next)
    dragStartSnapshot.current = null
  }

  function handleDragCancel() {
    setIsDragging(false)
    clearPendingTabSwitch()
    // Настоящая отмена (Escape и т.п.) — откатываем то, что onDragOver
    // уже успел применить локально, а не оставляем расхождение с сервером
    if (dragStartSnapshot.current) {
      setColumns(dragStartSnapshot.current)
      dragStartSnapshot.current = null
    }
  }

  const mountedSections = isDragging ? ALL_SECTIONS : [activeSection]

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={collisionDetection}
      // dnd-kit по умолчанию (MeasuringStrategy.WhileDragging) измеряет
      // rects droppable-зон один раз в начале драга и дальше их кэширует —
      // нормально для статичной раскладки, но не здесь: наведение на
      // кнопку вкладки переключает activeSection прямо во время драга,
      // это тут же скрывает/показывает целые колонки панелей (см.
      // PanelColumn), а закэшированные rects остаются от ДО переключения.
      // Strategy.Always сам по себе НЕ перемеряет на каждый кадр — он лишь
      // не отключает измерение вне активного драга; реальное обновление
      // rects внутри драга идёт либо через ResizeObserver на каждом
      // droppable (не сработал синхронно/одинаково для обеих колонок,
      // подтверждено логами — pointerWithin стабильно промахивался мимо
      // general-right, хотя getComputedStyle подтверждал верный размер),
      // либо через периодический опрос по frequency (мс) — включаем его,
      // чтобы rects скрытых секций досчитывались сами, без зависимости от
      // таймингов ResizeObserver
      measuring={{ droppable: { strategy: MeasuringStrategy.Always, frequency: 100 } }}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <PageWrapper
        header={header}
        leftColumn={
          <>
            {mountedSections.map((section) => (
              <PanelColumn
                key={section}
                id={containerId(section, 'left')}
                ids={columns[section].left}
                lookup={GLOBAL_PANEL_LOOKUP}
                hidden={section !== activeSection}
              />
            ))}
          </>
        }
        rightColumn={
          <>
            {mountedSections.map((section) => (
              <PanelColumn
                key={section}
                id={containerId(section, 'right')}
                ids={columns[section].right}
                lookup={GLOBAL_PANEL_LOOKUP}
                hidden={section !== activeSection}
              />
            ))}
          </>
        }
      />
    </DndContext>
  )
}

function PanelColumn({
  id, ids, lookup, hidden,
}: {
  id: string
  ids: string[]
  lookup: Record<string, PanelEntry>
  hidden: boolean
}) {
  // useDroppable с id колонки — чтобы можно было навести на пустое место
  // в конце/внутри колонки (over.id тогда сам id колонки, а не панели)
  const { setNodeRef } = useDroppable({ id })
  return (
    <div
      ref={setNodeRef}
      hidden={hidden}
      // [hidden] и .flex — оба специфичностью (0,1,0), а .flex как более
      // поздний авторский класс перебивает display:none из [hidden] —
      // скрытые вкладки оставались видимыми и штабелировались друг на
      // друга во время драга. inline style побеждает любой класс
      // безусловно — display управляется им, а не атрибутом
      style={{ display: hidden ? 'none' : 'flex' }}
      className="flex-col gap-3 w-full"
      data-testid={`panel-column-${id}`}
    >
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
