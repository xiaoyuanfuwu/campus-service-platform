const express = require('express');
const router = express.Router();
const { authenticate, optionalAuth } = require('../middleware/auth');
const { adminAuth } = require('../middleware/adminAuth');
const announcementController = require('../controllers/announcementController');

// ========== 用户端接口（可选登录，游客也能看公告） ==========

// 获取公告列表
router.get('/', optionalAuth, announcementController.getList);

// 获取公告详情
router.get('/:id', optionalAuth, announcementController.getDetail);

// 点赞公告（需要登录）
router.post('/:id/like', authenticate, announcementController.like);

// 获取公告评论
router.get('/:id/comments', optionalAuth, announcementController.getComments);

// 添加评论
router.post('/:id/comments', authenticate, announcementController.addComment);

// 删除评论
router.delete('/:id/comments/:commentId', authenticate, announcementController.deleteComment);

// ========== 管理员接口 ==========

// 创建公告
router.post('/admin', adminAuth, announcementController.create);

// 获取管理端公告列表
router.get('/admin/list', adminAuth, announcementController.getAdminList);

// 更新公告
router.put('/admin/:id', adminAuth, announcementController.update);

// 删除公告
router.delete('/admin/:id', adminAuth, announcementController.remove);

module.exports = router;
