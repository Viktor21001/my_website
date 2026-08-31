import { Router } from 'express'
import type { Prisma } from '@prisma/client'
import { prisma } from '../lib/prisma'
import { authenticate } from '../middleware/authenticate'
import { asyncHandler } from '../lib/asyncHandler'
import { HttpError } from '../middleware/errorHandler'
import { publicUserSelect } from '../lib/publicUser'
import { messageLimiter, friendRequestLimiter } from '../lib/rateLimit'
import { emitToUser, emitToUsers } from '../lib/socket'
import { notify } from '../lib/notifications'

const router = Router()
router.use(authenticate)

function clampLimit(raw: unknown, fallback = 30) {
  return Math.min(Math.max(Number(raw) || fallback, 1), 100)
}

function slugify(name: string): string {
  const base = name
    .toLowerCase()
    .trim()
    .replace(/[^a-zа-яё0-9]+/gi, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)
  return base || 'group'
}

async function generateUniqueSlug(name: string): Promise<string> {
  const base = slugify(name)
  let candidate = base
  let suffix = 0
  // Коллизии на маленьком масштабе — редкость, простой цикл вместо
  // отдельного счётчика/random-суффикса по умолчанию
  while (await prisma.group.findUnique({ where: { slug: candidate }, select: { id: true } })) {
    suffix += 1
    candidate = `${base}-${suffix}`
  }
  return candidate
}

/*
  Иерархия ролей внутри группы — OWNER -> MODERATOR -> MEMBER, то же правило
  "модерировать равного или старшего может только вышестоящий", что уже
  применяется к сайтовым ролям USER/ADMIN/CREATOR в routes/admin.ts:
  MODERATOR не может тронуть другого MODERATOR или OWNER, только OWNER может.
*/
async function getMembership(groupId: string, userId: string) {
  return prisma.groupMember.findUnique({ where: { groupId_userId: { groupId, userId } } })
}

async function assertMember(groupId: string, userId: string) {
  const m = await getMembership(groupId, userId)
  if (!m || m.status !== 'MEMBER') throw new HttpError(403, 'Доступно только участникам группы')
}

async function assertModerator(groupId: string, userId: string) {
  const group = await prisma.group.findUnique({ where: { id: groupId }, select: { ownerId: true } })
  if (!group) throw new HttpError(404, 'Группа не найдена')
  if (group.ownerId === userId) return
  const m = await getMembership(groupId, userId)
  if (!m || m.status !== 'MEMBER' || m.role !== 'MODERATOR') throw new HttpError(403, 'Недостаточно прав')
}

async function getMemberIds(groupId: string): Promise<string[]> {
  const rows = await prisma.groupMember.findMany({ where: { groupId, status: 'MEMBER' }, select: { userId: true } })
  return rows.map((r) => r.userId)
}

async function getModeratorIds(groupId: string): Promise<string[]> {
  const group = await prisma.group.findUnique({ where: { id: groupId }, select: { ownerId: true } })
  const mods = await prisma.groupMember.findMany({
    where: { groupId, status: 'MEMBER', role: 'MODERATOR' },
    select: { userId: true },
  })
  const ids = mods.map((r) => r.userId)
  if (group && !ids.includes(group.ownerId)) ids.push(group.ownerId)
  return ids
}

function serializePost(p: {
  id: string; groupId: string; authorId: string | null; authorUsername: string; body: string; createdAt: Date
  _count: { comments: number; likes: number }; likes: { id: string }[]
}) {
  return {
    id: p.id,
    groupId: p.groupId,
    authorId: p.authorId,
    authorUsername: p.authorUsername,
    body: p.body,
    createdAt: p.createdAt,
    commentCount: p._count.comments,
    likeCount: p._count.likes,
    likedByMe: p.likes.length > 0,
  }
}

function serializeComment(c: { id: string; postId: string; authorId: string | null; authorUsername: string; body: string; createdAt: Date }) {
  return { id: c.id, postId: c.postId, authorId: c.authorId, authorUsername: c.authorUsername, body: c.body, createdAt: c.createdAt }
}

// GET /groups?q=&mine=&cursor= — обзор/поиск публичных групп ИЛИ (mine=true) только своих
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const userId = req.userId!
    const q = typeof req.query.q === 'string' ? req.query.q.trim() : ''
    const mineOnly = req.query.mine === 'true'
    const cursor = typeof req.query.cursor === 'string' ? req.query.cursor : undefined
    const limit = clampLimit(req.query.limit)

    const where: Prisma.GroupWhereInput = {
      ...(q ? { OR: [{ name: { contains: q, mode: 'insensitive' } }, { description: { contains: q, mode: 'insensitive' } }] } : {}),
      ...(mineOnly ? { members: { some: { userId, status: 'MEMBER' } } } : {}),
    }

    const rows = await prisma.group.findMany({
      where,
      include: { members: { where: { userId }, select: { role: true, status: true } } },
      orderBy: { createdAt: 'desc' },
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    })

    const hasMore = rows.length > limit
    const page = hasMore ? rows.slice(0, limit) : rows
    const groups = await Promise.all(
      page.map(async (g) => {
        const memberCount = await prisma.groupMember.count({ where: { groupId: g.id, status: 'MEMBER' } })
        const mine = g.members[0]
        return {
          id: g.id,
          name: g.name,
          slug: g.slug,
          description: g.description,
          avatar: g.avatar,
          privacy: g.privacy,
          memberCount,
          myRole: mine?.role ?? null,
          myStatus: mine?.status ?? null,
        }
      })
    )

    res.json({ groups, nextCursor: hasMore ? page[page.length - 1].id : null })
  })
)

// POST /groups { name, description?, privacy? } — создатель сразу становится OWNER
router.post(
  '/',
  friendRequestLimiter,
  asyncHandler(async (req, res) => {
    const userId = req.userId!
    const { name, description, privacy } = req.body as { name?: string; description?: string; privacy?: string }

    if (!name || typeof name !== 'string' || !name.trim()) throw new HttpError(400, 'Укажите название группы')
    if (name.trim().length > 80) throw new HttpError(400, 'Слишком длинное название')
    if (description !== undefined && typeof description === 'string' && description.length > 500) {
      throw new HttpError(400, 'Слишком длинное описание')
    }
    const groupPrivacy = privacy === 'PRIVATE' ? 'PRIVATE' : 'PUBLIC'

    const slug = await generateUniqueSlug(name.trim())

    const group = await prisma.$transaction(async (tx) => {
      const g = await tx.group.create({
        data: {
          name: name.trim(),
          slug,
          description: typeof description === 'string' ? description.trim() || null : null,
          privacy: groupPrivacy,
          ownerId: userId,
        },
      })
      await tx.groupMember.create({ data: { groupId: g.id, userId, role: 'OWNER', status: 'MEMBER' } })
      const conv = await tx.conversation.create({ data: { type: 'GROUP', groupId: g.id } })
      await tx.conversationParticipant.create({ data: { conversationId: conv.id, userId } })
      return g
    })

    res.status(201).json({
      group: {
        id: group.id, name: group.name, slug: group.slug, description: group.description, avatar: group.avatar,
        privacy: group.privacy, memberCount: 1, myRole: 'OWNER' as const, myStatus: 'MEMBER' as const,
      },
    })
  })
)

// GET /groups/:id — доступно любому авторизованному (в т.ч. не-участнику PRIVATE-группы — она видна в поиске)
router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const userId = req.userId!
    const group = await prisma.group.findUnique({
      where: { id: req.params.id },
      include: { conversation: { select: { id: true } }, owner: { select: { username: true } }, members: { where: { userId }, select: { role: true, status: true } } },
    })
    if (!group) throw new HttpError(404, 'Группа не найдена')

    const memberCount = await prisma.groupMember.count({ where: { groupId: group.id, status: 'MEMBER' } })
    const mine = group.members[0]

    res.json({
      group: {
        id: group.id, name: group.name, slug: group.slug, description: group.description, avatar: group.avatar,
        privacy: group.privacy, memberCount, ownerUsername: group.owner.username,
        conversationId: group.conversation?.id ?? null,
        myRole: mine?.role ?? null, myStatus: mine?.status ?? null,
      },
    })
  })
)

// PATCH /groups/:id — владелец/модератор
router.patch(
  '/:id',
  asyncHandler(async (req, res) => {
    const userId = req.userId!
    await assertModerator(req.params.id, userId)

    const { name, description, privacy, avatar } = req.body as { name?: string; description?: string; privacy?: string; avatar?: string }
    const data: Prisma.GroupUpdateInput = {}
    if (name !== undefined) {
      if (typeof name !== 'string' || !name.trim()) throw new HttpError(400, 'Название не может быть пустым')
      if (name.trim().length > 80) throw new HttpError(400, 'Слишком длинное название')
      data.name = name.trim()
    }
    if (description !== undefined) {
      if (typeof description === 'string' && description.length > 500) throw new HttpError(400, 'Слишком длинное описание')
      data.description = description?.trim() || null
    }
    if (privacy !== undefined) {
      if (privacy !== 'PUBLIC' && privacy !== 'PRIVATE') throw new HttpError(400, 'Некорректная приватность группы')
      data.privacy = privacy
    }
    if (avatar !== undefined) data.avatar = avatar || null

    const group = await prisma.group.update({ where: { id: req.params.id }, data })
    res.json({ group: { id: group.id, name: group.name, slug: group.slug, description: group.description, avatar: group.avatar, privacy: group.privacy } })
  })
)

// DELETE /groups/:id — только владелец
router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const userId = req.userId!
    const group = await prisma.group.findUnique({ where: { id: req.params.id } })
    if (!group) throw new HttpError(404, 'Группа не найдена')
    if (group.ownerId !== userId) throw new HttpError(403, 'Только владелец может удалить группу')

    // Каскад по схеме удаляет GroupMember/Conversation(+Message)/GroupPost(+Comment/Like)
    await prisma.group.delete({ where: { id: group.id } })
    res.json({ ok: true })
  })
)

// GET /groups/:id/members?cursor=
router.get(
  '/:id/members',
  asyncHandler(async (req, res) => {
    const cursor = typeof req.query.cursor === 'string' ? req.query.cursor : undefined
    const limit = clampLimit(req.query.limit)

    const rows = await prisma.groupMember.findMany({
      where: { groupId: req.params.id, status: 'MEMBER' },
      include: { user: { select: publicUserSelect } },
      orderBy: { joinedAt: 'asc' },
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    })

    const hasMore = rows.length > limit
    const page = hasMore ? rows.slice(0, limit) : rows
    const members = page.map((m) => ({ id: m.id, user: m.user, role: m.role, joinedAt: m.joinedAt }))

    res.json({ members, nextCursor: hasMore ? page[page.length - 1].id : null })
  })
)

// POST /groups/:id/join
router.post(
  '/:id/join',
  asyncHandler(async (req, res) => {
    const userId = req.userId!
    const group = await prisma.group.findUnique({ where: { id: req.params.id } })
    if (!group) throw new HttpError(404, 'Группа не найдена')

    const existing = await getMembership(group.id, userId)
    if (existing?.status === 'MEMBER') throw new HttpError(409, 'Вы уже в группе')
    if (existing?.status === 'PENDING') throw new HttpError(409, 'Заявка уже отправлена')

    if (group.privacy === 'PUBLIC') {
      await prisma.$transaction(async (tx) => {
        await tx.groupMember.create({ data: { groupId: group.id, userId, role: 'MEMBER', status: 'MEMBER' } })
        const conv = await tx.conversation.findUnique({ where: { groupId: group.id } })
        if (conv) await tx.conversationParticipant.create({ data: { conversationId: conv.id, userId } })
      })
      res.status(201).json({ status: 'MEMBER' })
      return
    }

    await prisma.groupMember.create({ data: { groupId: group.id, userId, role: 'MEMBER', status: 'PENDING' } })
    const moderatorIds = await getModeratorIds(group.id)
    emitToUsers(moderatorIds, 'groupJoinRequest:new', { groupId: group.id, userId })
    for (const modId of moderatorIds) await notify(modId, 'GROUP_JOIN_REQUEST', { groupId: group.id, userId })
    res.status(201).json({ status: 'PENDING' })
  })
)

// POST /groups/:id/leave
router.post(
  '/:id/leave',
  asyncHandler(async (req, res) => {
    const userId = req.userId!
    const group = await prisma.group.findUnique({ where: { id: req.params.id } })
    if (!group) throw new HttpError(404, 'Группа не найдена')
    if (group.ownerId === userId) throw new HttpError(400, 'Владелец не может покинуть группу — передайте владение или удалите группу')

    const member = await getMembership(group.id, userId)
    if (!member) throw new HttpError(404, 'Вы не в этой группе')

    await prisma.$transaction(async (tx) => {
      await tx.groupMember.delete({ where: { id: member.id } })
      const conv = await tx.conversation.findUnique({ where: { groupId: group.id } })
      if (conv) await tx.conversationParticipant.deleteMany({ where: { conversationId: conv.id, userId } })
    })
    res.json({ ok: true })
  })
)

// GET /groups/:id/requests — владелец/модератор
router.get(
  '/:id/requests',
  asyncHandler(async (req, res) => {
    const userId = req.userId!
    await assertModerator(req.params.id, userId)

    const rows = await prisma.groupMember.findMany({
      where: { groupId: req.params.id, status: 'PENDING' },
      include: { user: { select: publicUserSelect } },
      orderBy: { joinedAt: 'asc' },
    })
    res.json({ requests: rows.map((r) => ({ id: r.id, user: r.user, requestedAt: r.joinedAt })) })
  })
)

// POST /groups/:id/requests/:userId/approve
router.post(
  '/:id/requests/:userId/approve',
  asyncHandler(async (req, res) => {
    const actorId = req.userId!
    await assertModerator(req.params.id, actorId)

    const member = await getMembership(req.params.id, req.params.userId)
    if (!member || member.status !== 'PENDING') throw new HttpError(404, 'Заявка не найдена')

    await prisma.$transaction(async (tx) => {
      await tx.groupMember.update({ where: { id: member.id }, data: { status: 'MEMBER' } })
      const conv = await tx.conversation.findUnique({ where: { groupId: req.params.id } })
      if (conv) await tx.conversationParticipant.create({ data: { conversationId: conv.id, userId: req.params.userId } })
    })
    emitToUser(req.params.userId, 'groupJoinRequest:approved', { groupId: req.params.id })
    await notify(req.params.userId, 'GROUP_JOIN_APPROVED', { groupId: req.params.id })
    res.json({ ok: true })
  })
)

// POST /groups/:id/requests/:userId/reject
router.post(
  '/:id/requests/:userId/reject',
  asyncHandler(async (req, res) => {
    const actorId = req.userId!
    await assertModerator(req.params.id, actorId)

    const member = await getMembership(req.params.id, req.params.userId)
    if (!member || member.status !== 'PENDING') throw new HttpError(404, 'Заявка не найдена')

    await prisma.groupMember.delete({ where: { id: member.id } })
    res.json({ ok: true })
  })
)

// POST /groups/:id/members/:userId/promote — MEMBER -> MODERATOR, только владелец
router.post(
  '/:id/members/:userId/promote',
  asyncHandler(async (req, res) => {
    const actorId = req.userId!
    const group = await prisma.group.findUnique({ where: { id: req.params.id } })
    if (!group) throw new HttpError(404, 'Группа не найдена')
    if (group.ownerId !== actorId) throw new HttpError(403, 'Только владелец может выдавать права модератора')

    const member = await getMembership(req.params.id, req.params.userId)
    if (!member || member.status !== 'MEMBER') throw new HttpError(404, 'Участник не найден')
    if (member.role !== 'MEMBER') throw new HttpError(400, 'Уже не обычный участник')

    await prisma.groupMember.update({ where: { id: member.id }, data: { role: 'MODERATOR' } })
    res.json({ ok: true })
  })
)

// POST /groups/:id/members/:userId/demote — MODERATOR -> MEMBER, только владелец
router.post(
  '/:id/members/:userId/demote',
  asyncHandler(async (req, res) => {
    const actorId = req.userId!
    const group = await prisma.group.findUnique({ where: { id: req.params.id } })
    if (!group) throw new HttpError(404, 'Группа не найдена')
    if (group.ownerId !== actorId) throw new HttpError(403, 'Только владелец может забирать права модератора')

    const member = await getMembership(req.params.id, req.params.userId)
    if (!member || member.status !== 'MEMBER') throw new HttpError(404, 'Участник не найден')
    if (member.role !== 'MODERATOR') throw new HttpError(400, 'Не модератор')

    await prisma.groupMember.update({ where: { id: member.id }, data: { role: 'MEMBER' } })
    res.json({ ok: true })
  })
)

// DELETE /groups/:id/members/:userId — исключить участника
router.delete(
  '/:id/members/:userId',
  asyncHandler(async (req, res) => {
    const actorId = req.userId!
    const group = await prisma.group.findUnique({ where: { id: req.params.id } })
    if (!group) throw new HttpError(404, 'Группа не найдена')
    if (req.params.userId === group.ownerId) throw new HttpError(403, 'Нельзя исключить владельца группы')
    if (req.params.userId === actorId) throw new HttpError(400, 'Для выхода используйте «Покинуть группу»')

    const isOwner = group.ownerId === actorId
    if (!isOwner) {
      const actorMembership = await getMembership(req.params.id, actorId)
      if (!actorMembership || actorMembership.status !== 'MEMBER' || actorMembership.role !== 'MODERATOR') {
        throw new HttpError(403, 'Недостаточно прав')
      }
    }

    const target = await getMembership(req.params.id, req.params.userId)
    if (!target || target.status !== 'MEMBER') throw new HttpError(404, 'Участник не найден')
    if (target.role === 'MODERATOR' && !isOwner) throw new HttpError(403, 'Только владелец может исключить модератора')

    await prisma.$transaction(async (tx) => {
      await tx.groupMember.delete({ where: { id: target.id } })
      const conv = await tx.conversation.findUnique({ where: { groupId: req.params.id } })
      if (conv) await tx.conversationParticipant.deleteMany({ where: { conversationId: conv.id, userId: req.params.userId } })
    })
    res.json({ ok: true })
  })
)

// GET /groups/:id/posts?cursor= — стена, только для участников
router.get(
  '/:id/posts',
  asyncHandler(async (req, res) => {
    const userId = req.userId!
    await assertMember(req.params.id, userId)

    const cursor = typeof req.query.cursor === 'string' ? req.query.cursor : undefined
    const limit = clampLimit(req.query.limit)

    const rows = await prisma.groupPost.findMany({
      where: { groupId: req.params.id },
      include: { _count: { select: { comments: true, likes: true } }, likes: { where: { userId }, select: { id: true } } },
      orderBy: { createdAt: 'desc' },
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    })

    const hasMore = rows.length > limit
    const page = hasMore ? rows.slice(0, limit) : rows
    res.json({ posts: page.map(serializePost), nextCursor: hasMore ? page[page.length - 1].id : null })
  })
)

// POST /groups/:id/posts { body }
router.post(
  '/:id/posts',
  messageLimiter,
  asyncHandler(async (req, res) => {
    const userId = req.userId!
    await assertMember(req.params.id, userId)

    const { body } = req.body as { body?: string }
    if (!body || typeof body !== 'string' || !body.trim()) throw new HttpError(400, 'Пустая запись')
    const trimmed = body.trim()
    if (trimmed.length > 4000) throw new HttpError(400, 'Слишком длинная запись')

    const author = await prisma.user.findUnique({ where: { id: userId }, select: { username: true } })
    const post = await prisma.groupPost.create({
      data: { groupId: req.params.id, authorId: userId, authorUsername: author!.username, body: trimmed },
    })

    const serialized = serializePost({ ...post, _count: { comments: 0, likes: 0 }, likes: [] })
    const memberIds = await getMemberIds(req.params.id)
    emitToUsers(memberIds.filter((id) => id !== userId), 'groupPost:new', { groupId: req.params.id, post: serialized })

    res.status(201).json({ post: serialized })
  })
)

// DELETE /groups/:id/posts/:postId — автор или владелец/модератор
router.delete(
  '/:id/posts/:postId',
  asyncHandler(async (req, res) => {
    const userId = req.userId!
    const post = await prisma.groupPost.findUnique({ where: { id: req.params.postId } })
    if (!post || post.groupId !== req.params.id) throw new HttpError(404, 'Запись не найдена')
    if (post.authorId !== userId) await assertModerator(req.params.id, userId)

    await prisma.groupPost.delete({ where: { id: post.id } })
    const memberIds = await getMemberIds(req.params.id)
    emitToUsers(memberIds, 'groupPost:deleted', { groupId: req.params.id, postId: post.id })
    res.json({ ok: true })
  })
)

// POST /groups/:id/posts/:postId/like — идемпотентно, любой участник
router.post(
  '/:id/posts/:postId/like',
  asyncHandler(async (req, res) => {
    const userId = req.userId!
    await assertMember(req.params.id, userId)

    const post = await prisma.groupPost.findUnique({ where: { id: req.params.postId } })
    if (!post || post.groupId !== req.params.id) throw new HttpError(404, 'Запись не найдена')

    await prisma.groupPostLike.upsert({
      where: { postId_userId: { postId: post.id, userId } },
      create: { postId: post.id, userId },
      update: {},
    })

    // Всем участникам, не только автору поста — иначе счётчик лайков
    // "замирал" бы у остальных, кто смотрит стену прямо сейчас, ровно та же
    // логика, что уже применена к groupPost:new/comment
    const memberIds = await getMemberIds(req.params.id)
    emitToUsers(memberIds, 'groupPost:like', { groupId: req.params.id, postId: post.id })
    if (post.authorId && post.authorId !== userId) {
      await notify(post.authorId, 'GROUP_POST_LIKE', { groupId: req.params.id, postId: post.id })
    }
    res.status(201).json({ ok: true })
  })
)

// DELETE /groups/:id/posts/:postId/like
router.delete(
  '/:id/posts/:postId/like',
  asyncHandler(async (req, res) => {
    const userId = req.userId!
    await prisma.groupPostLike.deleteMany({ where: { postId: req.params.postId, userId } })
    res.json({ ok: true })
  })
)

// GET /groups/:id/posts/:postId/comments?cursor=
router.get(
  '/:id/posts/:postId/comments',
  asyncHandler(async (req, res) => {
    const userId = req.userId!
    await assertMember(req.params.id, userId)

    const cursor = typeof req.query.cursor === 'string' ? req.query.cursor : undefined
    const limit = clampLimit(req.query.limit)

    const rows = await prisma.groupPostComment.findMany({
      where: { postId: req.params.postId },
      orderBy: { createdAt: 'asc' },
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    })

    const hasMore = rows.length > limit
    const page = hasMore ? rows.slice(0, limit) : rows
    res.json({ comments: page.map(serializeComment), nextCursor: hasMore ? page[page.length - 1].id : null })
  })
)

// POST /groups/:id/posts/:postId/comments { body }
router.post(
  '/:id/posts/:postId/comments',
  messageLimiter,
  asyncHandler(async (req, res) => {
    const userId = req.userId!
    await assertMember(req.params.id, userId)

    const { body } = req.body as { body?: string }
    if (!body || typeof body !== 'string' || !body.trim()) throw new HttpError(400, 'Пустой комментарий')
    const trimmed = body.trim()
    if (trimmed.length > 2000) throw new HttpError(400, 'Слишком длинный комментарий')

    const post = await prisma.groupPost.findUnique({ where: { id: req.params.postId } })
    if (!post || post.groupId !== req.params.id) throw new HttpError(404, 'Запись не найдена')

    const author = await prisma.user.findUnique({ where: { id: userId }, select: { username: true } })
    const comment = await prisma.groupPostComment.create({
      data: { postId: post.id, authorId: userId, authorUsername: author!.username, body: trimmed },
    })

    const serialized = serializeComment(comment)
    const memberIds = await getMemberIds(req.params.id)
    emitToUsers(memberIds.filter((id) => id !== userId), 'groupPost:comment', { groupId: req.params.id, postId: post.id, comment: serialized })
    if (post.authorId && post.authorId !== userId) {
      await notify(post.authorId, 'GROUP_POST_COMMENT', { groupId: req.params.id, postId: post.id })
    }

    res.status(201).json({ comment: serialized })
  })
)

// DELETE /groups/:id/posts/:postId/comments/:commentId — автор или владелец/модератор
router.delete(
  '/:id/posts/:postId/comments/:commentId',
  asyncHandler(async (req, res) => {
    const userId = req.userId!
    const comment = await prisma.groupPostComment.findUnique({ where: { id: req.params.commentId } })
    if (!comment || comment.postId !== req.params.postId) throw new HttpError(404, 'Комментарий не найден')
    if (comment.authorId !== userId) await assertModerator(req.params.id, userId)

    await prisma.groupPostComment.delete({ where: { id: comment.id } })
    res.json({ ok: true })
  })
)

export default router
