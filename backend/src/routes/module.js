/**
 * 模块路由 — 统一处理 10 个模块
 * 路由: /api/module/:module/...
 * :module ∈ { express | task | lost | forum | secondhand | rental | substitute | print | yellowpage | charity | bulletin }
 *
 * ⚠️ 路由顺序关键：
 *   /stats        → 必须在 /:module 之前（否则 stats 被当成 module）
 *   /:module/my   → 必须在 /:module/:id 之前（否则 my 被当成 id）
 *   /:module/favorites → 同上
 */
const express = require('express');
const router = express.Router();
const { authenticate, optionalAuth, requireVerified } = require('../middleware/auth');
const moduleController = require('../controllers/moduleController');

// ====== 无参数接口 ======

// 首页模块统计
router.get('/stats', moduleController.getStats);

// ====== 可选登录（游客也能看） ======

// 列表
router.get('/:module', optionalAuth, moduleController.getList);

// ====== 带子路径（必须在 :id 之前） ======

// 我发布的
router.get('/:module/my', authenticate, moduleController.getMyPublished);

// 我接的单
router.get('/:module/taken', authenticate, moduleController.getMyTaken);

// 我收藏的
router.get('/:module/favorites', authenticate, moduleController.getMyFavorites);

// ====== :id 子路由 ======

// 详情
router.get('/:module/:id', optionalAuth, moduleController.getDetail);

// 回复列表
router.get('/:module/:id/replies', optionalAuth, moduleController.getReplies);

// 发布（需实名认证）
router.post('/:module', authenticate, requireVerified, moduleController.create);

// 编辑
router.put('/:module/:id', authenticate, moduleController.update);

// 删除
router.delete('/:module/:id', authenticate, moduleController.remove);

// 关闭/结束
router.post('/:module/:id/close', authenticate, moduleController.closePost);

// 接单（任何人可接，需实名认证）
router.post('/:module/:id/take', authenticate, requireVerified, moduleController.takePost);

// 确认完成（接单人标记完成）
router.post('/:module/:id/complete', authenticate, moduleController.completePost);

// 收藏/取消收藏
router.post('/:module/:id/favorite', authenticate, moduleController.toggleFavorite);

// 点赞/取消点赞
router.post('/:module/:id/like', authenticate, moduleController.toggleLike);

// 发表回复（需实名认证）
router.post('/:module/:id/reply', authenticate, requireVerified, moduleController.createReply);

// 删除回复
router.delete('/:module/:id/reply/:replyId', authenticate, moduleController.deleteReply);

// 回复点赞
router.post('/:module/:id/reply/:replyId/like', authenticate, moduleController.likeReply);

// 推荐/点赞
router.post('/:module/:id/recommend', authenticate, moduleController.recommend);

module.exports = router;
