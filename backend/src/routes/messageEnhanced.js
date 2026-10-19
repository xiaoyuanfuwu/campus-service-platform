const express = require('express');
const router = express.Router();
const { authenticate, requireVerified } = require('../middleware/auth');
const messageEnhancedController = require('../controllers/messageEnhancedController');
const { userRateLimit } = require('../middleware/privacy');

// 所有接口需要登录
router.use(authenticate);

// 获取会话列表（含在线状态）
router.get('/conversations', messageEnhancedController.getConversations);

// 发送消息（含陌生人限制）
router.post('/send',
  userRateLimit(30, 60000),
  requireVerified,
  messageEnhancedController.sendMessage
);

// 标记已读
router.put('/read', messageEnhancedController.markRead);

// 获取在线用户列表
router.get('/online', messageEnhancedController.getOnlineUsers);

// 检查陌生人状态
router.get('/stranger-status/:userId', messageEnhancedController.getStrangerStatus);

module.exports = router;
