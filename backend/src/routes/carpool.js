const express = require('express');
const router = express.Router();
const { authenticate, optionalAuth } = require('../middleware/auth');
const carpoolController = require('../controllers/unifiedCarpoolController');

// 对外保留既有 /api/carpools 路径，底层统一读写 module_posts。
router.get('/', optionalAuth, carpoolController.getList);
// 固定路径必须在 /:id 之前注册。
router.get('/my/published', authenticate, carpoolController.getMyPublished);
router.get('/my/joined', authenticate, carpoolController.getMyJoined);
router.get('/my/favorites', authenticate, carpoolController.getMyFavorites);
router.get('/:id', optionalAuth, carpoolController.getDetail);
router.post('/', authenticate, carpoolController.create);
router.put('/:id', authenticate, carpoolController.update);
router.delete('/:id', authenticate, carpoolController.remove);
router.post('/:id/join', authenticate, carpoolController.join);
router.post('/:id/cancel', authenticate, carpoolController.cancelJoin);
router.post('/:id/end', authenticate, carpoolController.endCarpool);
router.post('/:id/favorite', authenticate, carpoolController.favorite);
router.delete('/:id/favorite', authenticate, carpoolController.unfavorite);
module.exports = router;
