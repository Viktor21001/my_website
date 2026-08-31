import { useState } from 'react'
import type { CSSProperties } from 'react'

interface AvatarProps {
  src?: string | null
  name: string
  size: number
  radius?: number
  borderWidth?: number
  borderColor?: string
  background?: string
  fontSize?: number
  className?: string
  style?: CSSProperties
}

/*
  Аватар + фолбэк-инициал — раньше был продублирован вручную в AdminPanel,
  SettingsPanel, ProfileHeader и AgeGroupLeaderboard (у каждого — свой
  размер/радиус/фон). Здесь же — единственное место, где обрыв ссылки на
  картинку (не только её отсутствие) откатывает на инициал: раньше это умел
  только AgeGroupLeaderboard (через onError), остальные три показывали бы
  пустой квадрат при битой ссылке.
*/
export function Avatar({
  src,
  name,
  size,
  radius = 6,
  borderWidth = 1,
  borderColor = 'var(--dp-border)',
  background = 'var(--dp-bg-card)',
  fontSize,
  className,
  style,
}: AvatarProps) {
  const [broken, setBroken] = useState(false)
  // Сброс "битой" отметки при смене src прямо во время рендера — не через
  // useEffect, это тот самый случай, для которого React рекомендует именно
  // такой приём вместо синхронного setState в эффекте
  const [lastSrc, setLastSrc] = useState(src)
  if (src !== lastSrc) {
    setLastSrc(src)
    setBroken(false)
  }

  const showImage = Boolean(src) && !broken

  return (
    <div
      className={`shrink-0 overflow-hidden flex items-center justify-center${className ? ` ${className}` : ''}`}
      style={{
        width: size,
        height: size,
        borderRadius: radius,
        border: `${borderWidth}px solid ${borderColor}`,
        background,
        ...style,
      }}
    >
      {showImage ? (
        <img
          src={src as string}
          alt={name}
          className="w-full h-full object-cover"
          onError={() => setBroken(true)}
        />
      ) : (
        <span
          className="font-bold"
          style={{ color: 'var(--dp-text-secondary)', fontSize: fontSize ?? Math.round(size * 0.36) }}
        >
          {name.slice(0, 1).toUpperCase()}
        </span>
      )}
    </div>
  )
}
