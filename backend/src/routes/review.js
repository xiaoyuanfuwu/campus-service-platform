const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const reviewController = require('../controllers/reviewController');

// 所有评价路由需要登录
router.use(authenticate);

// 创建评价
router.post('/', reviewController.create);

// 查看用户评价
router.get('/user/:userId', reviewController.getUserReviews);

// 我的评价
router.get('/my', reviewController.getMyReviews);

// 删除评价
router.delete('/:id', reviewController.remove);

module.exports = router;
