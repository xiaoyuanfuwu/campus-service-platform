/**
 * 校园成就路由
 * 路由: /api/achievement/...
 */
const express = require('express');
const router = express.Router();
const { authenticate, optionalAuth } = require('../middleware/auth');
const achievementController = require('../controllers/achievementController');

// 获取用户成就总进度
router.get('/progress', optionalAuth, achievementController.getProgress);

// 获取当前用户的成就提交记录列表（需登录）
// 必须放在 '/:trackKey' 之前，否则会被当成 trackKey=submissions
router.get('/submissions', authenticate, achievementController.getMySubmissions);

// 获取赛道详情
router.get('/:trackKey', optionalAuth, achievementController.getTrackDetail);

// 提交成就验证
router.post('/:trackKey/:itemKey/submit', authenticate, achievementController.submitAchievement);

module.exports = router;
