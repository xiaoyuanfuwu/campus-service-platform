/**
 * 食堂路由 — 公用 API
 * 路由: /api/canteen/...
 */
const express = require('express');
const router = express.Router();
const { authenticate, optionalAuth } = require('../middleware/auth');
const foodController = require('../controllers/foodController');

// 食堂列表
router.get('/canteens', foodController.getCanteens);
// 档口列表
router.get('/stalls', optionalAuth, foodController.getStalls);
// 档口详情
router.get('/stalls/:id', optionalAuth, foodController.getStallDetail);
// 提交评价（需登录）
router.post('/stalls/:id/review', authenticate, foodController.submitReview);
// 我的评价
router.get('/stalls/:id/my-review', authenticate, foodController.getMyReview);

module.exports = router;
