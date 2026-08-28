/*
  extractApiError — human-readable сообщение из ошибки RTK Query mutation.
  Раньше формы показывали одну и ту же фразу на любую ошибку — из-за этого
  сетевая проблема (сервер не запущен, CORS) выглядела так же, как
  "неверный пароль", и разобраться, что сломалось, было невозможно
  без открытия консоли браузера.
*/

interface RtkQueryError {
  status?: number | string
  data?: { error?: string }
}

export function extractApiError(error: unknown, fallback: string): string {
  const err = error as RtkQueryError

  if (err?.status === 'FETCH_ERROR' || err?.status === 'TIMEOUT_ERROR') {
    return 'Не удалось подключиться к серверу — проверь, что он запущен'
  }
  if (typeof err?.data?.error === 'string') {
    return err.data.error
  }
  return fallback
}
