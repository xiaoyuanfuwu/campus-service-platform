const express = require('express');
const router = express.Router();
const { authenticate, optionalAuth } = require('../middleware/auth');
const treeholeController = require('../controllers/treeholeController');

// 列表：可选登录（登录后能拿到 liked 状态）
router.get('/', optionalAuth, treeholeController.getList);

// 单帖详情
router.get('/:id', optionalAuth, treeholeController.getDetail);

// 写操作：必须登录
router.post('/', authenticate, treeholeController.create);
router.post('/:id/like', authenticate, treeholeController.toggleLike);
router.delete('/:id/like', authenticate, treeholeController.toggleLike);

// 转发：不强制登录（让匿名用户也能转）
router.post('/:id/share', optionalAuth, treeholeController.incrementShare);

// 删除：必须登录，且只能删自己的
router.delete('/:id', authenticate, treeholeController.deletePost);

// 评论：必须登录才能发；评论列表可匿名读
router.get('/:id/comments', treeholeController.getComments);
router.post('/:id/comment', authenticate, treeholeController.createComment);
router.delete('/:id/comment/:commentId', authenticate, treeholeController.deleteComment);

module.exports = router;
