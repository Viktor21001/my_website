/*
  Background — фиксированный слой позади всего контента.
  Рендерит фоновое изображение с blur и opacity.

  Слои снизу вверх:
  1. Само изображение
  2. Тёмный overlay — чтобы текст читался
  3. Градиент снизу — плавный переход к цвету страницы
*/

import { useAppSelector } from '../../../hooks/redux'
import { DEFAULT_BACKGROUND } from '../../../types/profile'

export function Background() {
  const background = useAppSelector(
    (state) => state.auth.user?.background ?? DEFAULT_BACKGROUND
  )

  if (!background.url) return null

  return (
    <div
      className="fixed inset-0 z-0 pointer-events-none"
      aria-hidden="true"
    >
      {/* Само изображение */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage:    `url(${background.url})`,
          backgroundSize:     'cover',
          backgroundPosition: 'center',
          backgroundRepeat:   'no-repeat',
          /*
            scale(1.05) убирает белые края которые появляются при blur —
            размытые края картинки выходят за пределы экрана
          */
          filter:    background.blur > 0 ? `blur(${background.blur}px)` : 'none',
          transform: background.blur > 0 ? 'scale(1.05)' : 'none',
        }}
      />

      {/* Тёмный overlay — затемнение контролируется ползунком */}
      <div
        className="absolute inset-0"
        style={{
          backgroundColor: `rgba(27, 40, 56, ${background.opacity})`,
        }}
      />

      {/* Градиент снизу — плавный переход к фону страницы */}
      <div
        className="absolute inset-x-0 bottom-0"
        style={{
          height:     '40%',
          background: 'linear-gradient(to bottom, transparent, #1b2838)',
        }}
      />
    </div>
  )
}