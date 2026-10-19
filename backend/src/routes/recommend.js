const express = require('express');
const router = express.Router();
const { authenticate, optionalAuth } = require('../middleware/auth');
const recommendController = require('../controllers/recommendController');

// 热门路线（无需登录）
router.get('/hot-routes', optionalAuth, recommendController.getHotRoutes);

// 距离与时长预估（无需登录）
router.get('/estimate', optionalAuth, recommendController.estimate);

// 地点坐标库（无需登录）
router.get('/locations', optionalAuth, recommendController.getLocations);

// 就近匹配（无需登录）
router.get('/nearby', optionalAuth, recommendController.nearby);

// 个人推荐（需要登录）
router.get('/for-me', authenticate, recommendController.forMe);

module.exports = router;
