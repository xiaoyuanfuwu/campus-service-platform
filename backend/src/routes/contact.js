const express = require('express');
const router = express.Router();
const { authenticate, optionalAuth } = require('../middleware/auth');
const { adminAuth } = require('../middleware/adminAuth');
const contactController = require('../controllers/contactController');

// ========== 用户端接口 ==========

// 提交留言（可选登录，未登录也可留言）
router.post('/', optionalAuth, contactController.create);

// 获取我的留言（需登录）
router.get('/my', authenticate, contactController.getMyList);

// ========== 管理员接口 ==========

// 留言管理列表
router.get('/admin/list', adminAuth, contactController.getAdminList);

// 回复留言
router.put('/admin/:id/reply', adminAuth, contactController.reply);

// 标记已读
router.put('/admin/:id/read', adminAuth, contactController.markRead);

module.exports = router;
