const { Message, User, Notification, Carpool } = require('../models');
const { AppError } = require('../middleware/auth');

// 在线用户集合（内存存储，生产环境应使用Redis）
const onlineUsers = new Map();

/**
 * 用户上线
 */
const setUserOnline = async (userId, socketId) => {
  onlineUsers.set(userId.toString(), {
    socketId,
    lastActive: new Date(),
  });
  await User.findByIdAndUpdate(userId, { $set: { isOnline: true } });
};

/**
 * 用户下线
 */
const setUserOffline = async (userId) => {
  onlineUsers.delete(userId.toString());
  await User.findByIdAndUpdate(userId, { $set: { isOnline: false } });
};

/**
 * 获取用户在线状态
 */
const isUserOnline = (userId) => {
  return onlineUsers.has(userId.toString());
};

// 陌生人会话限制配置
const STRANGER_LIMITS = {
  MAX_MESSAGES: 5,
  RESET_HOURS: 24,
};

/**
 * 检查两个用户是否有过拼车关系
 */
const hasCarpoolRelation = async (userId1, userId2) => {
  const pool = require('../config/db')();
  const [rows] = await pool.query(
    `SELECT COUNT(*) as cnt FROM module_posts c
     INNER JOIN content_participants cp ON c.id = cp.content_id
     WHERE c.module = 'carpool' AND ((c.creator_id = ? AND cp.user_id = ? AND cp.status = 'joined')
        OR (c.creator_id = ? AND cp.user_id = ? AND cp.status = 'joined'))`,
    [userId1, userId2, userId2, userId1]
  );
  return rows[0].cnt > 0;
};

// ==================== API 接口 ====================

/**
 * 获取会话列表（增强版，含在线状态）
 */
exports.getConversations = async (req, res, next) => {
  try {
    const pool = require('../config/db')();
    const User = require('../models').User;

    const [conversations] = await pool.query(
      `SELECT m.*, 
        (SELECT COUNT(*) FROM messages m2 
         WHERE m2.conversation_id = m.conversation_id AND m2.receiver_id = ? AND m2.isRead = 0 AND m2.isRecalled = 0
        ) as unreadCount,
        (SELECT COUNT(*) FROM messages m4 WHERE m4.conversation_id = m.conversation_id) as totalMessages
       FROM messages m
       WHERE (m.sender_id = ? OR m.receiver_id = ?) AND m.isRecalled = 0
         AND m.receiver_id IS NOT NULL
         AND m.id = (SELECT MAX(m3.id) FROM messages m3 WHERE m3.conversation_id = m.conversation_id)
       ORDER BY m.createTime DESC`,
      [req.userId, req.userId, req.userId]
    );

    const result = [];

    for (const conv of conversations) {
      const otherUserId = conv.sender_id === req.userId ? conv.receiver_id : conv.sender_id;
      const otherUser = otherUserId ? await User.findById(otherUserId) : null;

      let isStranger = true;
      if (otherUserId) {
        isStranger = !(await hasCarpoolRelation(req.userId, otherUserId));
      }

      result.push({
        conversationId: conv.conversation_id,
        otherUser: otherUser ? {
          _id: otherUser._id || otherUser.id,
          nickName: otherUser.nickName,
          avatarUrl: otherUser.avatarUrl,
          creditScore: otherUser.creditScore,
          school: otherUser.school,
          isOnline: isUserOnline(otherUser._id || otherUser.id),
        } : null,
        lastMessage: {
          content: conv.content,
          type: conv.type,
          createTime: conv.createTime,
          isRead: !!conv.isRead,
        },
        unreadCount: conv.unreadCount,
        totalMessages: conv.totalMessages,
        isStranger,
      });
    }

    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

/**
 * 发送消息（增强版，含陌生人限制和在线推送）
 */
exports.sendMessage = async (req, res, next) => {
  try {
    const { receiverId, content, type = 'text', imageUrl, relatedCarpool } = req.body;

    if (!receiverId || !content) {
      throw new AppError('接收者和消息内容不能为空', 400);
    }

    if (receiverId === req.userId.toString()) {
      throw new AppError('不能给自己发消息', 400);
    }

    const receiver = await User.findById(receiverId);
    if (!receiver || receiver.status !== 'active') {
      throw new AppError('接收者不存在或已禁用', 404);
    }

    // 检查是否是陌生人
    const isStranger = !(await hasCarpoolRelation(req.userId, receiverId));

    if (isStranger) {
      const pool = require('../config/db')();
      const oneDayAgo = new Date(Date.now() - STRANGER_LIMITS.RESET_HOURS * 3600 * 1000);
      const [[cnt]] = await pool.query(
        'SELECT COUNT(*) as cnt FROM messages WHERE sender_id = ? AND receiver_id = ? AND createTime >= ?',
        [req.userId, receiverId, oneDayAgo]
      );

      if (cnt.cnt >= STRANGER_LIMITS.MAX_MESSAGES) {
        throw new AppError(
          `陌生人会话限制：24小时内最多发送${STRANGER_LIMITS.MAX_MESSAGES}条消息，请先加入对方的拼车`,
          403
        );
      }
    }

    // 敏感词过滤
    const sensitiveFilter = require('../services/sensitiveFilter');
    const filterResult = await sensitiveFilter.filter(content);

    if (!filterResult.passed) {
      throw new AppError('消息包含敏感内容，无法发送', 400);
    }

    const conversationId = [req.userId.toString(), receiverId.toString()].sort().join('_');

    const message = await Message.create({
      conversationId,
      sender: req.userId,
      receiver: receiverId,
      type,
      content: filterResult.filteredText,
      imageUrl: imageUrl || '',
      relatedCarpool: relatedCarpool || null,
    });

    // 创建消息通知
    const existingNotif = await Notification.findOne({
      recipient: receiverId,
      type: 'new_message',
      relatedUser: req.userId,
      isRead: false,
    });

    if (!existingNotif) {
      await Notification.create({
        recipient: receiverId,
        sender: req.userId,
        senderSnapshot: {
          nickName: req.user.nickName,
          avatarUrl: req.user.avatarUrl,
        },
        type: 'new_message',
        title: req.user.nickName,
        content: `${type === 'text' ? content.slice(0, 50) : '[图片]'}${content.length > 50 ? '...' : ''}`,
        relatedUser: req.userId,
        priority: 'normal',
      });
    }

    // Count remaining
    let strangerRemaining = null;
    if (isStranger) {
      const pool = require('../config/db')();
      const oneDayAgo = new Date(Date.now() - 24 * 3600 * 1000);
      const [[cnt]] = await pool.query(
        'SELECT COUNT(*) as cnt FROM messages WHERE sender_id = ? AND receiver_id = ? AND createTime >= ?',
        [req.userId, receiverId, oneDayAgo]
      );
      strangerRemaining = Math.max(0, STRANGER_LIMITS.MAX_MESSAGES - cnt.cnt);
    }

    res.status(201).json({
      success: true,
      data: {
        ...message,
        isStranger,
        strangerRemaining,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 标记已读并推送
 */
exports.markRead = async (req, res, next) => {
  try {
    const { conversationId } = req.body;

    const result = await Message.updateMany(
      { conversationId, receiver: req.userId, isRead: false },
      { $set: { isRead: true, readAt: new Date() } }
    );

    // 标记对应通知为已读
    const senderId = conversationId.split('_').find((id) => id !== req.userId.toString());
    if (senderId) {
      await Notification.updateMany(
        { recipient: req.userId, relatedUser: senderId, type: 'new_message', isRead: false },
        { $set: { isRead: true, readAt: new Date() } }
      );
    }

    res.json({
      success: true,
      message: `已标记 ${result.modifiedCount} 条消息为已读`,
      data: { count: result.modifiedCount },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 获取在线用户列表（与我相关的）
 */
exports.getOnlineUsers = async (req, res, next) => {
  try {
    const pool = require('../config/db')();
    // 获取与我有关联的用户ID
    const [relatedUserIds] = await pool.query(
      `SELECT DISTINCT user_id FROM (
        SELECT m.creator_id as user_id FROM module_posts m
          WHERE m.module = 'carpool' AND m.id IN
          (SELECT cp.content_id FROM content_participants cp WHERE cp.user_id = ?)
        UNION
        SELECT cp.user_id FROM content_participants cp
          WHERE cp.content_id IN
          (SELECT m.id FROM module_posts m WHERE m.module = 'carpool' AND m.creator_id = ?)
        UNION
        SELECT cp2.user_id FROM content_participants cp2
          WHERE cp2.content_id IN
          (SELECT cp1.content_id FROM content_participants cp1 WHERE cp1.user_id = ?)
      ) t WHERE user_id != ?`,
      [req.userId, req.userId, req.userId, req.userId]
    );

    const userIds = relatedUserIds.map(r => r.user_id).filter(id => id != req.userId);
    const onlineList = userIds.filter(id => isUserOnline(id));

    const users = [];
    for (const id of onlineList) {
      const u = await User.findById(id);
      if (u) users.push({ _id: u._id || u.id, nickName: u.nickName, avatarUrl: u.avatarUrl, creditScore: u.creditScore, school: u.school, isOnline: true });
    }

    res.json({ success: true, data: users });
  } catch (error) {
    next(error);
  }
};

/**
 * 检查与某用户的陌生人状态
 */
exports.getStrangerStatus = async (req, res, next) => {
  try {
    const isStranger = !(await hasCarpoolRelation(req.userId, req.params.userId));

    let remainingMessages = STRANGER_LIMITS.MAX_MESSAGES;
    if (isStranger) {
      const pool = require('../config/db')();
      const oneDayAgo = new Date(Date.now() - 24 * 3600 * 1000);
      const [[cnt]] = await pool.query(
        'SELECT COUNT(*) as cnt FROM messages WHERE sender_id = ? AND receiver_id = ? AND createTime >= ?',
        [req.userId, req.params.userId, oneDayAgo]
      );
      remainingMessages = Math.max(0, STRANGER_LIMITS.MAX_MESSAGES - cnt.cnt);
    }

    res.json({
      success: true,
      data: {
        isStranger,
        remainingMessages: isStranger ? remainingMessages : -1,
        maxMessages: STRANGER_LIMITS.MAX_MESSAGES,
        resetHours: STRANGER_LIMITS.RESET_HOURS,
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getConversations: exports.getConversations,
  sendMessage: exports.sendMessage,
  markRead: exports.markRead,
  getOnlineUsers: exports.getOnlineUsers,
  getStrangerStatus: exports.getStrangerStatus,
  setUserOnline,
  setUserOffline,
  isUserOnline,
};
