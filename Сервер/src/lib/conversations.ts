import { prisma } from './prisma'

function directKeyFor(userIdA: string, userIdB: string): string {
  return [userIdA, userIdB].sort().join(':')
}

/*
  Находит существующую личную (DIRECT) переписку между двумя людьми или
  создаёт новую — directKey гарантирует единственность без сканирования
  участников на каждый вызов. Переиспользуется routes/friends.ts (accept —
  переносит requestMessage первым сообщением) и routes/conversations.ts
  (обычная отправка, следующая фаза).
*/
export async function getOrCreateDirectConversation(userIdA: string, userIdB: string) {
  const directKey = directKeyFor(userIdA, userIdB)

  const existing = await prisma.conversation.findUnique({ where: { directKey } })
  if (existing) return existing

  return prisma.conversation.create({
    data: {
      type: 'DIRECT',
      directKey,
      participants: { create: [{ userId: userIdA }, { userId: userIdB }] },
    },
  })
}
