/*
  useAnimatedMount — варианты анимаций для Framer Motion.

  Почему хук а не просто объекты?
  Хук позволяет добавить логику (например respects prefers-reduced-motion).
  Объекты variants переиспользуем во всех компонентах.

  Документация Framer Motion:
  https://www.framer.com/motion/variants/
*/

/*
  prefers-reduced-motion — системная настройка "уменьшить движение".
  Люди с вестибулярными расстройствами включают её чтобы
  анимации не вызывали дискомфорт.
  Документация: https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion
*/
function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

// Появление снизу вверх — для карточек и блоков
export const fadeUpVariants = {
  hidden: {
    opacity: 0,
    y: prefersReducedMotion() ? 0 : 16,
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.3,
      ease: [0.25, 0.1, 0.25, 1], // cubic-bezier — плавный ease
    },
  },
}

// Появление с fade — для текстовых блоков
export const fadeVariants = {
  hidden:  { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { duration: 0.25 },
  },
}

/*
  staggerChildren — дочерние элементы появляются по очереди.
  Используем для списков: каждая карточка чуть позже предыдущей.
  Это создаёт эффект "каскада" как в Steam.
*/
export const staggerContainerVariants = {
  hidden:  { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.07, // задержка между элементами в секундах
      delayChildren:   0.1,  // задержка перед первым элементом
    },
  },
}

// Элемент внутри stagger-контейнера
export const staggerItemVariants = {
  hidden: {
    opacity: 0,
    y: prefersReducedMotion() ? 0 : 12,
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.25,
      ease: 'easeOut',
    },
  },
}