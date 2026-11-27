# Chat module contract

The module is framework-independent and receives an already-authenticated Supabase client. It must never create a second client or embed credentials.

Exports:
- `createChatRepository(client)`
- `listConversations(userId, currentUsername)`
- `sendMessage({ conversationId, senderId, content, fileUrl, messageType })`
- `saveSelfMessage({ userId, content })`
- `listSavedItems(userId, limit)`

The caller owns UI state and notifications. The repository throws errors with the original database error message appended. File paths are converted to short-lived signed URLs only for display; stored database values remain storage paths.

Tables used: `conversation_members`, `conversations`, `messages`, `saved_message_items`; storage bucket: `chat-files`.
