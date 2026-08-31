import { useState } from 'react'
import {
  useGetGroupPostsQuery, useLazyGetOlderGroupPostsQuery, useCreateGroupPostMutation,
  useDeleteGroupPostMutation, useLikeGroupPostMutation, useUnlikeGroupPostMutation,
  useLazyGetGroupCommentsQuery, useCreateGroupCommentMutation, useDeleteGroupCommentMutation,
} from '../../../store/api/backendApi'
import { extractApiError } from '../../../utils/apiError'
import { useAppSelector } from '../../../hooks/redux'
import { Avatar } from '../../shared/Avatar'
import type { GroupPostEntry, GroupCommentEntry } from '../../../types/groups'

export function GroupWall({ groupId, canModerate }: { groupId: string; canModerate: boolean }) {
  const { data, isFetching: loadingLatest, error } = useGetGroupPostsQuery(groupId)
  const [olderPosts, setOlderPosts] = useState<GroupPostEntry[]>([])
  const [manualNoMoreOlder, setManualNoMoreOlder] = useState(false)
  const [fetchOlder, { isFetching: loadingOlder }] = useLazyGetOlderGroupPostsQuery()
  const [historyError, setHistoryError] = useState<string | null>(null)

  const [draft, setDraft] = useState('')
  const [createPost, { isLoading: posting }] = useCreateGroupPostMutation()
  const [postError, setPostError] = useState<string | null>(null)

  const allPosts = [...olderPosts, ...(data?.posts ?? [])]
  const showLoadOlder = allPosts.length > 0 && !manualNoMoreOlder && !(olderPosts.length === 0 && data?.nextCursor === null)

  function loadOlder() {
    const oldest = allPosts[allPosts.length - 1]
    if (!oldest) return
    setHistoryError(null)
    fetchOlder({ groupId, cursor: oldest.id })
      .unwrap()
      .then((result) => {
        setOlderPosts((prev) => [...prev, ...result.posts])
        if (result.nextCursor === null) setManualNoMoreOlder(true)
      })
      .catch((err) => setHistoryError(extractApiError(err, 'Не удалось загрузить старые записи')))
  }

  async function handlePost() {
    const body = draft.trim()
    if (!body) return
    setPostError(null)
    try {
      await createPost({ groupId, body }).unwrap()
      setDraft('')
    } catch (err) {
      setPostError(extractApiError(err, 'Не удалось опубликовать запись'))
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-2 p-2" style={{ background: 'var(--dp-bg-card)', border: '1px solid var(--dp-border)', borderRadius: 6 }}>
        <textarea
          className="dp-input text-xs" rows={2} maxLength={4000}
          placeholder="Написать на стене группы…"
          value={draft} onChange={(e) => setDraft(e.target.value)}
        />
        <div className="flex items-center justify-between">
          {postError && <span className="dp-error">{postError}</span>}
          <button onClick={handlePost} disabled={posting || !draft.trim()} className="dp-btn-primary text-xs ml-auto">
            {posting ? 'Публикуем…' : 'Опубликовать'}
          </button>
        </div>
      </div>

      {error && <div className="dp-error">{extractApiError(error, 'Не удалось загрузить стену')}</div>}

      <div className="flex flex-col gap-2">
        {allPosts.map((post) => (
          <PostCard key={post.id} groupId={groupId} post={post} canModerate={canModerate} />
        ))}
        {allPosts.length === 0 && !loadingLatest && (
          <div className="text-xs text-center py-4" style={{ color: 'var(--dp-text-muted)' }}>Записей пока нет</div>
        )}
      </div>

      {historyError && <div className="dp-error">{historyError}</div>}
      {showLoadOlder && (
        <button
          onClick={loadOlder}
          disabled={loadingOlder}
          className="w-full text-xs py-2"
          style={{ background: 'none', border: 'none', borderTop: '1px solid var(--dp-border)', cursor: 'pointer', color: 'var(--dp-text-secondary)' }}
        >
          {loadingOlder ? 'Загружаем…' : 'Показать раньше'}
        </button>
      )}
    </div>
  )
}

function PostCard({ groupId, post, canModerate }: { groupId: string; post: GroupPostEntry; canModerate: boolean }) {
  const myId = useAppSelector((state) => state.auth.user?.id)
  const [likePost] = useLikeGroupPostMutation()
  const [unlikePost] = useUnlikeGroupPostMutation()
  const [deletePost, { isLoading: deleting }] = useDeleteGroupPostMutation()
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)

  const [commentsOpen, setCommentsOpen] = useState(false)
  const [comments, setComments] = useState<GroupCommentEntry[]>([])
  const [fetchComments, { isFetching: loadingComments }] = useLazyGetGroupCommentsQuery()
  const [commentDraft, setCommentDraft] = useState('')
  const [createComment, { isLoading: commenting }] = useCreateGroupCommentMutation()
  const [deleteComment] = useDeleteGroupCommentMutation()

  const canDeletePost = canModerate || post.authorId === myId

  async function toggleLike() {
    setActionError(null)
    try {
      if (post.likedByMe) await unlikePost({ groupId, postId: post.id }).unwrap()
      else await likePost({ groupId, postId: post.id }).unwrap()
    } catch (err) {
      setActionError(extractApiError(err, 'Не удалось поставить отметку'))
    }
  }

  function handleDeleteClick() {
    if (!confirmDelete) {
      setConfirmDelete(true)
      setTimeout(() => setConfirmDelete(false), 4000)
      return
    }
    setActionError(null)
    deletePost({ groupId, postId: post.id })
      .unwrap()
      .catch((err) => setActionError(extractApiError(err, 'Не удалось удалить запись')))
    setConfirmDelete(false)
  }

  function toggleComments() {
    const next = !commentsOpen
    setCommentsOpen(next)
    if (next && comments.length === 0) {
      fetchComments({ groupId, postId: post.id })
        .unwrap()
        .then((result) => setComments(result.comments))
        .catch(() => {})
    }
  }

  async function handleAddComment() {
    const body = commentDraft.trim()
    if (!body) return
    try {
      const result = await createComment({ groupId, postId: post.id, body }).unwrap()
      setComments((prev) => [...prev, result.comment])
      setCommentDraft('')
    } catch (err) {
      setActionError(extractApiError(err, 'Не удалось добавить комментарий'))
    }
  }

  async function handleDeleteComment(commentId: string) {
    try {
      await deleteComment({ groupId, postId: post.id, commentId }).unwrap()
      setComments((prev) => prev.filter((c) => c.id !== commentId))
    } catch (err) {
      setActionError(extractApiError(err, 'Не удалось удалить комментарий'))
    }
  }

  return (
    <div className="p-3" style={{ background: 'var(--dp-bg-card)', border: '1px solid var(--dp-border)', borderRadius: 6 }}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold" style={{ color: 'var(--dp-text-white)' }}>@{post.authorUsername}</span>
        <span className="text-[10px]" style={{ color: 'var(--dp-text-muted)' }}>{new Date(post.createdAt).toLocaleString('ru-RU')}</span>
      </div>
      <div className="text-xs mt-1.5" style={{ color: 'var(--dp-text-primary)', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
        {post.body}
      </div>

      <div className="flex items-center gap-3 mt-2">
        <button
          onClick={toggleLike}
          className="text-xs flex items-center gap-1"
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: post.likedByMe ? 'var(--dp-accent-bright)' : 'var(--dp-text-secondary)' }}
        >
          {post.likedByMe ? '♥' : '♡'} {post.likeCount || ''}
        </button>
        <button
          onClick={toggleComments}
          className="text-xs"
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--dp-text-secondary)' }}
        >
          💬 {post.commentCount || 'Комментировать'}
        </button>
        {canDeletePost && (
          <button
            onClick={handleDeleteClick}
            disabled={deleting}
            className="text-xs ml-auto"
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: confirmDelete ? 'var(--dp-red)' : 'var(--dp-text-muted)' }}
          >
            {confirmDelete ? 'Точно удалить?' : 'Удалить'}
          </button>
        )}
      </div>

      {actionError && <div className="dp-error mt-1.5">{actionError}</div>}

      {commentsOpen && (
        <div className="flex flex-col gap-1.5 mt-2 pt-2" style={{ borderTop: '1px solid var(--dp-border)' }}>
          {loadingComments && comments.length === 0 && (
            <span className="text-[10px]" style={{ color: 'var(--dp-text-muted)' }}>Загружаем…</span>
          )}
          {comments.map((c) => (
            <div key={c.id} className="flex items-start gap-2">
              <Avatar src={null} name={c.authorUsername} size={20} />
              <div className="text-xs flex-1">
                <span style={{ color: 'var(--dp-text-white)' }}>@{c.authorUsername}</span>{' '}
                <span style={{ color: 'var(--dp-text-primary)' }}>{c.body}</span>
              </div>
              {(canModerate || c.authorId === myId) && (
                <button
                  onClick={() => handleDeleteComment(c.id)}
                  className="text-[10px] shrink-0"
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--dp-text-muted)' }}
                >
                  ✕
                </button>
              )}
            </div>
          ))}
          <div className="flex gap-1.5 mt-1">
            <input
              type="text" className="dp-input text-xs flex-1" placeholder="Комментарий…"
              value={commentDraft} onChange={(e) => setCommentDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleAddComment()
              }}
            />
            <button onClick={handleAddComment} disabled={commenting || !commentDraft.trim()} className="dp-btn-ghost text-xs shrink-0">
              Отправить
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
