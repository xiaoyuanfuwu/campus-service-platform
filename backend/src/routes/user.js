const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const userController = require('../controllers/userController');
const verificationController = require('../controllers/verificationController');

// 所有用户路由需要登录
router.use(authenticate);

// 实名认证：提交申请
router.post('/verify', verificationController.submitVerification);

// 实名认证：查询我的认证状态
router.get('/verify/status', verificationController.getMyVerificationStatus);

// 实名认证：重新提交（覆盖 rejected）
router.post('/verify/resubmit', verificationController.resubmitVerification);

// 搜索用户
router.get('/search', userController.searchUsers);

// 获取个人统计
router.get('/statistics', userController.getStatistics);

// 获取个人信息
router.get('/profile', userController.getProfile);

// 随机生成一个昵称
router.get('/random-nickname', userController.getRandomNickname);

// 获取指定用户公开资料
router.get('/profile/:userId', userController.getPublicProfile);

// 更新个人信息
router.put('/profile', userController.updateProfile);

// 绑定手机号
router.put('/bind-phone', userController.bindPhone);

// 绑定微信
router.put('/bind-wechat', userController.bindWechat);

// 更新信用分
router.put('/credit', userController.updateCredit);

// 获取信用变动记录
router.get('/credit-records', userController.getCreditRecords);

module.exports = router;
