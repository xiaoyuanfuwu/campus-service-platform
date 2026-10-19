const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const messageController = require('../controllers/messageController');

// 所有消息路由需要登录
router.use(authenticate);

// 获取未读消息总数
router.get('/unread-count', messageController.getUnreadCount);

// 获取会话列表
router.get('/conversations', messageController.getConversations);

// 获取聊天记录
router.get('/:conversationId', messageController.getMessages);

// 发送消息
router.post('/', messageController.send);

// 标记已读
router.put('/:id/read', messageController.markRead);

// 撤回消息
router.put('/:id/recall', messageController.recall);

module.exports = router;
