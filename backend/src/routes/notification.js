const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const notificationController = require('../controllers/notificationController');

// 所有通知路由需要登录
router.use(authenticate);

// 获取通知列表
router.get('/', notificationController.getList);

// 获取未读数量
router.get('/unread-count', notificationController.getUnreadCount);

// 全部标记已读
router.put('/read-all', notificationController.markAllRead);

// 标记已读
router.put('/:id/read', notificationController.markRead);

// 删除通知
router.delete('/:id', notificationController.remove);

module.exports = router;
