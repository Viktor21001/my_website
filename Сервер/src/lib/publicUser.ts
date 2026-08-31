import { Prisma } from '@prisma/client'

// Минимальный набор полей для показа "карточки" другого пользователя — в
// списках друзей/заявок/чёрного списка (и дальше — участников группы,
// поиска). Без email — это не публичные данные, в отличие от админ-панели,
// где email виден только администраторам (см. routes/admin.ts)
export const publicUserSelect = {
  id: true,
  username: true,
  displayName: true,
  avatar: true,
} satisfies Prisma.UserSelect

export type PublicUser = Prisma.UserGetPayload<{ select: typeof publicUserSelect }>
