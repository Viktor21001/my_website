import rateLimit from 'express-rate-limit'

/*
  Первый rate limiting в проекте — раньше не было вообще ни на одном роуте,
  включая /auth/login. Начинаем именно с соцслоя, т.к. это первые роуты,
  спам на которых напрямую бьёт по ДРУГИМ пользователям, а не только по себе.

  Разные лимитеры на разные по природе действия — заявка в друзья редкое
  разовое действие (20/10мин с запасом), а сообщения в живом чате легко
  дают пачками больше — один общий лимитер держал бы переписку и заявки на
  одном бюджете, и активный чат мог бы неожиданно заблокировать отправку
  заявки в друзья (и наоборот).
*/
export const friendRequestLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Слишком много запросов, попробуйте позже' },
})

export const messageLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  limit: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Слишком много сообщений, попробуйте позже' },
})
