import { useAppDispatch, useAppSelector } from '../../../hooks/redux'
import { setActiveConversationId } from '../../../store/slices/uiSlice'
import { ConversationList } from './ConversationList'
import { ChatThread } from './ChatThread'

export function ChatsTab() {
  const dispatch = useAppDispatch()
  const activeConversationId = useAppSelector((state) => state.ui.activeConversationId)

  if (activeConversationId) {
    return (
      <ChatThread
        conversationId={activeConversationId}
        onBack={() => dispatch(setActiveConversationId(null))}
      />
    )
  }

  return <ConversationList onOpen={(id) => dispatch(setActiveConversationId(id))} />
}
