import { prisma } from './prisma'
import { areBlocked } from './blocklist'

// Друзья -> всегда можно писать; иначе -> по приватности получателя.
// FRIENDS_ONLY/NOBODY для не-друга закрывают обычную отправку сообщения —
// единственный путь достучаться в этом случае — заявка в друзья с
// requestMessage (см. routes/friends.ts)
export async function canMessage(senderId: string, recipientId: string): Promise<boolean> {
  if (senderId === recipientId) return false
  if (await areBlocked(senderId, recipientId)) return false

  const friendship = await prisma.friendship.findFirst({
    where: {
      status: 'ACCEPTED',
      OR: [
        { requesterId: senderId, addresseeId: recipientId },
        { requesterId: recipientId, addresseeId: senderId },
      ],
    },
    select: { id: true },
  })
  if (friendship) return true

  const recipient = await prisma.user.findUnique({
    where: { id: recipientId },
    select: { messagingPrivacy: true },
  })
  return recipient?.messagingPrivacy === 'EVERYONE'
}
