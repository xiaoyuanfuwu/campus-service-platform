const express = require('express');
const router = express.Router();
const { authenticate, optionalAuth, requireVerified } = require('../middleware/auth');
const forumController = require('../controllers/forumController');

// 校园墙独立接口（forum_posts 独立表 + 独立严格审核）
router.get('/', optionalAuth, forumController.getList);
router.get('/my', authenticate, forumController.getMyPosts);
router.get('/my/favorites', authenticate, forumController.getMyFavorites);
router.get('/:id', optionalAuth, forumController.getDetail);
router.get('/:id/replies', optionalAuth, forumController.getReplies);
router.post('/', authenticate, requireVerified, forumController.create);
router.put('/:id', authenticate, forumController.update);
router.delete('/:id', authenticate, forumController.remove);
router.post('/:id/like', authenticate, forumController.toggleLike);
router.post('/:id/favorite', authenticate, forumController.toggleFavorite);
router.post('/:id/reply', authenticate, requireVerified, forumController.createReply);
router.delete('/:id/reply/:replyId', authenticate, forumController.deleteReply);
router.post('/:id/reply/:replyId/like', authenticate, forumController.likeReply);
module.exports = router;
