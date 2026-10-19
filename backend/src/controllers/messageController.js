const { Message, User, Notification } = require('../models');
const { AppError } = require('../middleware/auth');
const getPool = require('../config/db');

/**
 * 生成会话ID（按字母序排列两个用户ID）
 */
const getConversationId = (userId1, userId2) => {
  return [userId1.toString(), userId2.toString()].sort().join('_');
};

/**
 * 获取会话列表
 * GET /api/messages/conversations
 */
exports.getConversations = async (req, res, next) => {
  try {
    const pool = getPool();

    const [conversations] = await pool.query(
      `SELECT m.*, 
        (SELECT COUNT(*) FROM messages m2 
         WHERE m2.conversation_id = m.conversation_id AND m2.receiver_id = ? AND m2.isRead = 0 AND m2.isRecalled = 0
        ) as unreadCount
       FROM messages m
       WHERE (m.sender_id = ? OR m.receiver_id = ?) AND m.isRecalled = 0
         AND m.receiver_id IS NOT NULL
         AND m.id = (SELECT MAX(m3.id) FROM messages m3 WHERE m3.conversation_id = m.conversation_id)
       ORDER BY m.createTime DESC`,
      [req.userId, req.userId, req.userId]
    );

    const populatedConversations = [];

    for (const conv of conversations) {
      const otherUserId = conv.sender_id == req.userId ? conv.receiver_id : conv.sender_id;
      const otherUser = await User.findById(otherUserId);

      populatedConversations.push({
        conversationId: conv.conversation_id,
        otherUser,
        lastMessage: {
          content: conv.content,
          type: conv.type,
          createTime: conv.createTime,
          isRead: !!conv.isRead,
        },
        unreadCount: conv.unreadCount,
      });
    }

    res.json({
      success: true,
      data: populatedConversations,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 获取消息列表
 * GET /api/messages/:conversationId
 */
exports.getMessages = async (req, res, next) => {
  try {
    const { page = 1, pageSize = 50 } = req.query;
    const pool = getPool();
    const limit = parseInt(pageSize);
    const offset = (parseInt(page) - 1) * limit;

    // 查询消息 + join 用户信息
    const [messages] = await pool.query(
      `SELECT m.*, 
        su.nickName as sender_nickName, su.avatarUrl as sender_avatarUrl,
        ru.nickName as receiver_nickName, ru.avatarUrl as receiver_avatarUrl
       FROM messages m
       INNER JOIN users su ON m.sender_id = su.id
       INNER JOIN users ru ON m.receiver_id = ru.id
       WHERE m.conversation_id = ?
         AND (m.sender_id = ? OR m.receiver_id = ?)
       ORDER BY m.createTime DESC
       LIMIT ? OFFSET ?`,
      [req.params.conversationId, req.userId, req.userId, limit, offset]
    );

    const [[{ total }]] = await pool.query(
      `SELECT COUNT(*) as total FROM messages 
       WHERE conversation_id = ? AND (sender_id = ? OR receiver_id = ?)`,
      [req.params.conversationId, req.userId, req.userId]
    );

    // 标记对方发来的消息为已读
    await pool.query(
      `UPDATE messages SET isRead = 1, readAt = NOW() 
       WHERE conversation_id = ? AND receiver_id = ? AND isRead = 0`,
      [req.params.conversationId, req.userId]
    );

    const list = messages.reverse().map(m => ({
      id: m.id,
      conversationId: m.conversation_id,
      sender: {
        _id: m.sender_id,
        id: m.sender_id,
        nickName: m.sender_nickName,
        avatarUrl: m.sender_avatarUrl || '',
        toString: function() { return String(this._id); }
      },
      receiver: {
        _id: m.receiver_id,
        id: m.receiver_id,
        nickName: m.receiver_nickName,
        avatarUrl: m.receiver_avatarUrl || '',
        toString: function() { return String(this._id); }
      },
      type: m.type,
      content: m.content,
      imageUrl: m.imageUrl,
      voiceUrl: m.voiceUrl,
      voiceDuration: m.voiceDuration,
      isRead: !!m.isRead,
      isRecalled: !!m.isRecalled,
      createTime: m.createTime,
    }));

    res.json({
      success: true,
      data: {
        list,
        total,
        page: parseInt(page),
        pageSize: limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 发送消息
 * POST /api/messages
 */
exports.send = async (req, res, next) => {
  try {
    const {
      receiverId,
      content,
      type = 'text',
      imageUrl,
      voiceUrl,
      voiceDuration,
      relatedCarpool,
    } = req.body;

    if (!receiverId) throw new AppError('接收者不能为空', 400);
    if (!content && type === 'text') throw new AppError('消息内容不能为空', 400);
    if (receiverId == req.userId.toString()) throw new AppError('不能给自己发消息', 400);

    const receiver = await User.findById(receiverId);
    if (!receiver || receiver.status !== 'active') {
      throw new AppError('接收者不存在或已禁用', 404);
    }

    const conversationId = getConversationId(req.userId, receiverId);
    const pool = getPool();

    const [result] = await pool.query(
      `INSERT INTO messages (conversation_id, sender_id, receiver_id, type, content, imageUrl, voiceUrl, voiceDuration, relatedCarpool_id) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [conversationId, req.userId, receiverId, type, content || '', imageUrl || '', voiceUrl || '', voiceDuration || 0, relatedCarpool || null]
    );

    const [rows] = await pool.query('SELECT * FROM messages WHERE id = ?', [result.insertId]);
    const message = rows[0];

    // 检查是否已有新消息通知
    const [existingNotif] = await pool.query(
      `SELECT id FROM notifications WHERE recipient_id = ? AND type = 'new_message' AND relatedUser_id = ? AND isRead = 0 LIMIT 1`,
      [receiverId, req.userId]
    );

    if (existingNotif.length === 0) {
      const sender = await User.findById(req.userId);
      await pool.query(
        `INSERT INTO notifications (recipient_id, sender_id, sender_nickName, sender_avatarUrl, type, title, content, relatedUser_id, priority) 
         VALUES (?, ?, ?, ?, 'new_message', '新消息', ?, ?, 'normal')`,
        [receiverId, req.userId, sender?.nickName || '', sender?.avatarUrl || '',
         `${sender?.nickName || '用户'}: ${(content || '').slice(0, 50)}${content && content.length > 50 ? '...' : ''}`,
         req.userId]
      );
    }

    // 填充 sender/receiver 信息
    const sender = await User.findById(req.userId);
    message.sender = {
      _id: req.userId,
      id: req.userId,
      nickName: sender?.nickName || '',
      avatarUrl: sender?.avatarUrl || '',
      toString: function() { return String(this._id); }
    };
    message.receiver = {
      _id: Number(receiverId),
      id: Number(receiverId),
      nickName: receiver.nickName,
      avatarUrl: receiver.avatarUrl || '',
      toString: function() { return String(this._id); }
    };

    res.status(201).json({
      success: true,
      data: message,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 标记消息已读
 * PUT /api/messages/:id/read
 */
exports.markRead = async (req, res, next) => {
  try {
    const pool = getPool();
    const [result] = await pool.query(
      `UPDATE messages SET isRead = 1, readAt = NOW() WHERE id = ? AND receiver_id = ?`,
      [req.params.id, req.userId]
    );

    if (result.affectedRows === 0) {
      throw new AppError('消息不存在', 404);
    }

    const [rows] = await pool.query('SELECT * FROM messages WHERE id = ?', [req.params.id]);

    res.json({
      success: true,
      data: rows[0],
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 撤回消息
 * PUT /api/messages/:id/recall
 */
exports.recall = async (req, res, next) => {
  try {
    const pool = getPool();
    const [rows] = await pool.query('SELECT * FROM messages WHERE id = ?', [req.params.id]);

    if (rows.length === 0) throw new AppError('消息不存在', 404);
    const message = rows[0];

    if (String(message.sender_id) !== String(req.userId)) {
      throw new AppError('只能撤回自己发送的消息', 403);
    }

    const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000);
    if (new Date(message.createTime) < twoMinutesAgo) {
      throw new AppError('超过2分钟，无法撤回', 400);
    }

    await pool.query(
      `UPDATE messages SET isRecalled = 1, content = '此消息已撤回' WHERE id = ?`,
      [req.params.id]
    );

    message.isRecalled = true;
    message.content = '此消息已撤回';

    res.json({
      success: true,
      message: '消息已撤回',
      data: message,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 获取未读消息总数
 * GET /api/messages/unread-count
 */
exports.getUnreadCount = async (req, res, next) => {
  try {
    const pool = getPool();
    const [[{ count }]] = await pool.query(
      `SELECT COUNT(*) as count FROM messages WHERE receiver_id = ? AND isRead = 0 AND isRecalled = 0`,
      [req.userId]
    );

    res.json({
      success: true,
      data: { count },
    });
  } catch (error) {
    next(error);
  }
};
