// Persistence for CampusAI conversations and messages (ai_conversations,
// ai_messages).

const pool = require('../config/db');

async function createConversation(userId, title = 'New Chat') {
  const [r] = await pool.query(
    'INSERT INTO ai_conversations (user_id, title) VALUES (?,?)',
    [userId, title.slice(0, 200)]
  );
  return r.insertId;
}

async function renameConversation(userId, conversationId, title) {
  await pool.query(
    'UPDATE ai_conversations SET title = ? WHERE id = ? AND user_id = ?',
    [title.slice(0, 200), conversationId, userId]
  );
}

async function listConversations(userId) {
  const [rows] = await pool.query(
    `SELECT c.id, c.title, c.updated_at,
            (SELECT COUNT(*) FROM ai_messages m WHERE m.conversation_id = c.id) AS messages_count
     FROM ai_conversations c WHERE c.user_id = ?
     ORDER BY c.updated_at DESC LIMIT 50`, [userId]);
  return rows;
}

async function getMessages(userId, conversationId) {
  const [rows] = await pool.query(
    'SELECT id, conversation_id, role, content, intent, tool_calls, data_sources, model, status, created_at FROM ai_messages WHERE conversation_id = ? AND user_id = ? ORDER BY id',
    [conversationId, userId]
  );
  return rows;
}

async function addMessage(userId, conversationId, msg) {
  const [r] = await pool.query(
    `INSERT INTO ai_messages (conversation_id, user_id, role, content, intent, tool_calls, data_sources, model, status)
     VALUES (?,?,?,?,?,?,?,?,?)`,
    [
      conversationId, userId, msg.role, msg.content || '', msg.intent || null,
      msg.toolCalls ? JSON.stringify(msg.toolCalls) : null,
      msg.dataSources ? JSON.stringify(msg.dataSources) : null,
      msg.model || null, msg.status || 'success',
    ]
  );
  await pool.query('UPDATE ai_conversations SET title = IF(title = "New Chat", ?, title) WHERE id = ?',
    [String(msg.content || 'New Chat').slice(0, 40), conversationId]);
  return r.insertId;
}

async function deleteConversation(userId, conversationId) {
  const [r] = await pool.query('DELETE FROM ai_conversations WHERE id = ? AND user_id = ?', [conversationId, userId]);
  return r.affectedRows > 0;
}

module.exports = {
  createConversation, renameConversation, listConversations, getMessages, addMessage, deleteConversation,
};
