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
  {
    id: 'default',
    label: 'По умолчанию',
    url: '',
  },
  {
    id: 'space',
    label: 'Космос',
    url: 'https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?w=1920&q=80',
  },
  {
    id: 'city',
    label: 'Город',
    url: 'https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?w=1920&q=80',
  },
  {
    id: 'forest',
    label: 'Лес',
    url: 'https://images.unsplash.com/photo-1448375240586-882707db888b?w=1920&q=80',
  },
  {
    id: 'abstract',
    label: 'Абстракция',
    url: 'https://images.unsplash.com/photo-1634017839464-5c339ebe3cb4?w=1920&q=80',
  },
]

/*
  Локация в Настройках — список городов, а не свободный текст: если
  нужного города нет, в конце списка есть «Другое», выбор которого
  открывает текстовое поле (см. SettingsPanel/index.tsx).
*/
export const LOCATION_OPTIONS = [
  'Москва', 'Санкт-Петербург', 'Новосибирск', 'Екатеринбург', 'Казань',
  'Нижний Новгород', 'Челябинск', 'Красноярск', 'Самара', 'Уфа',
  'Ростов-на-Дону', 'Омск', 'Краснодар', 'Воронеж', 'Пермь',
  'Минск', 'Киев', 'Алматы', 'Ташкент',
  'Берлин', 'Лондон', 'Нью-Йорк', 'Дубай',
] as const

export const LOCATION_OTHER = '__other__'

/*
  Часовой пояс — влияет на часы в шапке (StatusBar/HeaderClock).
  Значения — настоящие IANA-идентификаторы (их же принимает
  Intl.DateTimeFormat timeZone и валидирует сервер через
  Intl.supportedValuesOf('timeZone')), подписи — человекочитаемые.
*/
export const TIMEZONE_OPTIONS: { value: string; label: string }[] = [
  { value: 'Europe/Kaliningrad',  label: 'Калининград (UTC+2)' },
  { value: 'Europe/Moscow',       label: 'Москва (UTC+3)' },
  { value: 'Europe/Samara',       label: 'Самара (UTC+4)' },
  { value: 'Asia/Yekaterinburg',  label: 'Екатеринбург (UTC+5)' },
  { value: 'Asia/Omsk',           label: 'Омск (UTC+6)' },
  { value: 'Asia/Krasnoyarsk',    label: 'Красноярск (UTC+7)' },
  { value: 'Asia/Irkutsk',        label: 'Иркутск (UTC+8)' },
  { value: 'Asia/Yakutsk',        label: 'Якутск (UTC+9)' },
  { value: 'Asia/Vladivostok',    label: 'Владивосток (UTC+10)' },
  { value: 'Asia/Magadan',        label: 'Магадан (UTC+11)' },
  { value: 'Asia/Kamchatka',      label: 'Камчатка (UTC+12)' },
  { value: 'Europe/London',       label: 'Лондон (UTC+0/+1)' },
  { value: 'Europe/Berlin',       label: 'Берлин (UTC+1/+2)' },
  { value: 'America/New_York',    label: 'Нью-Йорк (UTC-5/-4)' },
  { value: 'Asia/Dubai',          label: 'Дубай (UTC+4)' },
  { value: 'Asia/Almaty',         label: 'Алматы (UTC+6)' },
]

// XP система как в Steam
export const XP_PER_LEVEL = 100
export const levelFromXp = (xp: number) => Math.floor(xp / XP_PER_LEVEL)
export const xpProgressPercent = (xp: number) =>
  ((xp % XP_PER_LEVEL) / XP_PER_LEVEL) * 100