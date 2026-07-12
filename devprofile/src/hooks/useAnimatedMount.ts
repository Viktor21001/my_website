/*
  Варианты анимаций для Framer Motion.
  Уважаем prefers-reduced-motion — проверяем один раз при инициализации.
*/

const reduced =
  typeof window !== 'undefined' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches

const Y = reduced ? 0 : 18

// Карточки и панели — появление снизу
export const fadeUpVariants = {
  hidden:  { opacity: 0, y: Y },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] },
  },
}

// Простой fade — для оверлеев и текста
export const fadeVariants = {
  hidden:  { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.25 } },
}

// Контейнер для stagger-списков
export const staggerContainerVariants = {
  hidden:  { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.06,
      delayChildren:   0.08,
    },
  },
}

// Элемент внутри stagger-контейнера
export const staggerItemVariants = {
  hidden:  { opacity: 0, y: reduced ? 0 : 14 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.28, ease: [0.22, 1, 0.36, 1] },
  },
}

// Выезжание снизу — для BackgroundEditor
export const slideUpVariants = {
  hidden:  { y: '100%', opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: { type: 'spring', damping: 28, stiffness: 280 },
  },
  exit: {
    y: '100%',
    opacity: 0,
    transition: { duration: 0.22, ease: 'easeIn' },
  },
}

// Тултип
export const tooltipVariants = {
  hidden:  { opacity: 0, y: 6, scale: 0.96 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.15, ease: 'easeOut' },
  },
}