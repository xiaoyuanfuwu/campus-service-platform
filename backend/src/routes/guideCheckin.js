/**
 * 校园打卡图鉴路由
 */
const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/guideCheckinController');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);

// 打卡签到
router.post('/checkin', ctrl.checkin);

// 获取用户收集进度
router.get('/progress', ctrl.getUserProgress);

// 获取已收集的图鉴列表
router.get('/collected', ctrl.getCollectedItems);

// 获取打卡日历
router.get('/calendar', ctrl.getCheckinCalendar);

// 获取排行榜
router.get('/leaderboard', ctrl.getLeaderboard);

// 获取今日打卡状态
router.get('/today', ctrl.getTodayStatus);

// 删除打卡记录
router.post('/delete', ctrl.deleteCheckin);

module.exports = router;
