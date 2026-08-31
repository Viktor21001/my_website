import { useEffect, useState } from 'react'

// Первый debounce в кодовой базе — поиск в админ-панели намеренно бьёт по
// серверу на каждое нажатие (это приемлемо для редкого админского экрана,
// но не для публичного поиска по сайту)
export function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value)

  useEffect(() => {
    const timeoutId = setTimeout(() => setDebounced(value), delayMs)
    return () => clearTimeout(timeoutId)
  }, [value, delayMs])

  return debounced
}
