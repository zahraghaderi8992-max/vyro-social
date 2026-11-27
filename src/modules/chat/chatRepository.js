/**
 * VYRO Chat data adapter.
 * All Supabase access for the core chat flows lives here; UI components receive
 * normalized data and never need to know table-level query details.
 */
const MESSAGE_SELECT = 'id,conversation_id,sender_id,content,file_url,message_type,created_at';
const SAVED_SELECT = 'id,content,file_url,message_type,source_conversation_id,source_message_id,source_title,metadata,created_at';

export function createChatRepository(client) {
  if (!client) {
    const unavailable = () => { throw new Error('اتصال پایگاه داده در دسترس نیست.'); };
    return {
      listConversations: unavailable,
      sendMessage: unavailable,
      saveSelfMessage: unavailable,
      listSavedItems: unavailable
    };
  }

  async function signFileUrls(rows, field = 'file_url') {
    const paths = [...new Set((rows || []).map(row => row[field] || '').filter(path => path && !/^https?:\/\//i.test(path)))];
    if (!paths.length) return new Map();
    const { data } = await client.storage.from('chat-files').createSignedUrls(paths, 3600);
    // A signing failure must not hide the text/history of an otherwise readable conversation.
    if (!data) return new Map();
    return new Map((data || []).map(item => [item.path, item.signedUrl]));
  }

  async function listConversations(userId, currentUsername = '') {
    if (!userId) return [];
    const [{ data: memberRows, error: memberError }, { data: ownedRows, error: ownedError }] = await Promise.all([
      client.from('conversation_members').select('conversation_id').eq('user_id', userId),
      client.from('conversations').select('id,type,title,created_at,created_by').eq('created_by', userId).order('created_at', { ascending: false })
    ]);
    if (memberError) throw new Error('فهرست عضویت چت‌ها بارگذاری نشد: ' + memberError.message);
    if (ownedError) throw new Error('گفت‌وگوهای ساخته‌شده توسط حساب تو بارگذاری نشدند: ' + ownedError.message);

    const memberIds = [...new Set((memberRows || []).map(row => row.conversation_id).filter(Boolean))];
    const owned = ownedRows || [];
    const memberSet = new Set(memberIds);
    const missingOwned = owned.filter(row => !memberSet.has(row.id));
    if (missingOwned.length) {
      const { error } = await client.from('conversation_members').insert(missingOwned.map(row => ({ conversation_id: row.id, user_id: userId })));
      if (error) throw new Error('بازیابی عضویت گفتگوهای ساخته‌شده کامل نشد: ' + error.message);
    }

    const ids = [...new Set([...memberIds, ...owned.map(row => row.id)])];
    if (!ids.length) return [];
    const [{ data: conversations, error: conversationsError }, { data: messages, error: messagesError }, { data: members, error: membersError }] = await Promise.all([
      client.from('conversations').select('id,type,title,created_at,created_by').in('id', ids).order('created_at', { ascending: false }),
      client.from('messages').select(MESSAGE_SELECT).in('conversation_id', ids).order('created_at', { ascending: false }).limit(500),
      client.from('conversation_members').select('conversation_id,user_id,profiles(username,display_name,avatar_url,role)').in('conversation_id', ids)
    ]);
    if (conversationsError) throw new Error('گفت‌وگوهای قبلی دریافت نشدند: ' + conversationsError.message);
    if (messagesError) throw new Error('پیام‌های گفتگو دریافت نشدند: ' + messagesError.message);
    if (membersError) throw new Error('اطلاعات اعضای گفتگو دریافت نشد: ' + membersError.message);

    const rows = messages || [];
    const signedByPath = await signFileUrls(rows);
    const participants = members || [];
    return await Promise.all((conversations || []).map(async conversation => {
      const thread = rows.filter(message => message.conversation_id === conversation.id).reverse().map(message => {
        const rawUrl = message.file_url || '';
        return {
          id: message.id,
          sender_id: message.sender_id,
          from: message.sender_id === userId ? 'me' : 'them',
          text: message.content || '',
          file_url: rawUrl && !/^https?:\/\//i.test(rawUrl) ? (signedByPath.get(rawUrl) || '') : rawUrl,
          file_path: rawUrl,
          message_type: message.message_type || 'text',
          created_at: message.created_at,
          time: new Date(message.created_at).toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' })
        };
      });
      const other = participants.find(member => member.conversation_id === conversation.id && member.user_id !== userId)?.profiles;
      const titleParts = (conversation.title || '').split('|');
      const fallbackName = conversation.type === 'private' && titleParts.length > 1
        ? (titleParts.find(part => part.toLowerCase() !== String(currentUsername).toLowerCase()) || titleParts[0])
        : (conversation.title || 'گفت‌وگو');
      const displayName = conversation.type === 'private'
        ? (other?.username || other?.display_name || fallbackName)
        : (conversation.title || 'گفت‌وگو');
      const last = thread[thread.length - 1];
      return {
        id: conversation.id,
        type: conversation.type === 'private' ? 'direct' : conversation.type,
        createdBy: conversation.created_by,
        name: displayName,
        handle: conversation.type === 'private' ? '@' + displayName : '',
        avatar_url: other?.avatar_url || '',
        avatar: (displayName || 'V').slice(0, 1).toUpperCase(),
        role: other?.role || 'user',
        last: last?.text || 'گفت‌وگوی تازه',
        time: last?.time || '',
        unread: 0,
        messages: thread
      };
    }));
  }

  async function sendMessage({ conversationId, senderId, content = '', fileUrl = null, messageType = 'text' }) {
    if (!conversationId || !senderId) throw new Error('گفت‌وگو یا فرستنده مشخص نیست.');
    const { data, error } = await client.from('messages')
      .insert({ conversation_id: conversationId, sender_id: senderId, content: content || null, file_url: fileUrl, message_type: messageType })
      .select('id,created_at').single();
    if (error) throw error;
    return data;
  }

  async function saveSelfMessage({ userId, content }) {
    if (!userId || !String(content || '').trim()) throw new Error('متن پیام خالی است.');
    const { data, error } = await client.from('saved_message_items')
      .insert({ user_id: userId, content: String(content).trim(), message_type: 'text', metadata: { origin: 'self-chat' } })
      .select(SAVED_SELECT).single();
    if (error) throw error;
    return data;
  }

  async function listSavedItems(userId, limit = 300) {
    if (!userId) return [];
    const { data, error } = await client.from('saved_message_items')
      .select(SAVED_SELECT).eq('user_id', userId).order('created_at', { ascending: false }).limit(limit);
    if (error) throw error;
    const rows = data || [];
    const signedByPath = await signFileUrls(rows);
    return rows.map(item => {
      const rawUrl = item.file_url || '';
      return {
        ...item,
        file_path: rawUrl,
        file_url: rawUrl && !/^https?:\/\//i.test(rawUrl) ? (signedByPath.get(rawUrl) || '') : rawUrl
      };
    });
  }

  return { listConversations, sendMessage, saveSelfMessage, listSavedItems };
}

export default createChatRepository;
