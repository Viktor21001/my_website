/*
  Все "магические" значения в одном файле.
  Если поменяется URL или цвет — меняем здесь,
  не ищем по всему проекту.
*/

export const GITHUB_API_BASE   = 'https://api.github.com'
export const STEAM_API_BASE    = '/steam-api'       // через Vite proxy
export const WAKATIME_API_BASE = 'https://wakatime.com/api/v1'

/*
  Цвета языков как на GitHub.
  Полный список: https://github.com/ozh/github-colors
  Используем в компоненте LanguageBar.
*/
export const LANGUAGE_COLORS: Record<string, string> = {
  TypeScript:  '#3178c6',
  JavaScript:  '#f1e05a',
  Python:      '#3572A5',
  Rust:        '#dea584',
  Go:          '#00ADD8',
  CSS:         '#563d7c',
  HTML:        '#e34c26',
  SCSS:        '#c6538c',
  Vue:         '#41b883',
  Shell:       '#89e051',
  Java:        '#b07219',
  'C++':       '#f34b7d',
  Kotlin:      '#A97BFF',
  Dart:        '#00B4AB',
}

// Пресеты фонов — картинки кладём в public/presets/
export const BACKGROUND_PRESETS = [
  { id: 'default',  label: 'По умолчанию', url: '' },
  { id: 'space',    label: 'Космос',       url: '/presets/space.jpg' },
  { id: 'city',     label: 'Город',        url: '/presets/city.jpg' },
  { id: 'abstract', label: 'Абстракция',   url: '/presets/abstract.jpg' },
]

// XP система как в Steam
export const XP_PER_LEVEL = 100
export const levelFromXp = (xp: number) => Math.floor(xp / XP_PER_LEVEL)
export const xpProgressPercent = (xp: number) =>
  ((xp % XP_PER_LEVEL) / XP_PER_LEVEL) * 100