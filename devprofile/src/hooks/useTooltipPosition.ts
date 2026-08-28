/*
  useTooltipPosition — считает координаты для тултипа, который рендерится
  порталом в document.body (position: fixed), а не абсолютно внутри
  своего родителя.

  Зачем: тултипы бейджей раньше позиционировались `absolute` внутри
  `.dp-panel` (который сам имеет `overflow: hidden`) и центрировались
  строго над иконкой — в узкой колонке (правый сайдбар, 230px) тултип
  почти всегда шире доступного места и обрезается панелью или вылезает
  за край экрана. Портал полностью выносит тултип из-под любых
  overflow:hidden предков, а координаты клэмпятся в границы viewport.
*/

import { useCallback, useRef, useState } from 'react'

interface TooltipPosition {
  bottom: number
  left: number
}

const VIEWPORT_MARGIN = 8
const GAP_ABOVE_TRIGGER = 10

export function useTooltipPosition<T extends HTMLElement>(tooltipWidth: number) {
  const triggerRef = useRef<T>(null)
  const [position, setPosition] = useState<TooltipPosition | null>(null)

  const show = useCallback(() => {
    const el = triggerRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()

    const idealLeft = rect.left + rect.width / 2 - tooltipWidth / 2
    const left = Math.min(
      Math.max(idealLeft, VIEWPORT_MARGIN),
      window.innerWidth - tooltipWidth - VIEWPORT_MARGIN
    )
    const bottom = window.innerHeight - rect.top + GAP_ABOVE_TRIGGER

    setPosition({ bottom, left })
  }, [tooltipWidth])

  /*
    Координаты нарочно не сбрасываем на mouseleave — рендер тултипа и так
    гейтится булевым hovered в компоненте. Если очищать position здесь,
    он станет null ДО того как компонент успеет спрятать тултип, и при
    следующем наведении будет на кадр невалидным.
  */
  return { triggerRef, position, show }
}
