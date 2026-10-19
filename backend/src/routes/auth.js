const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const authController = require('../controllers/authController');

// 微信登录（小程序）
router.post('/wechat-login', authController.wechatLogin);

// 微信 H5 网页授权登录
router.post('/wechat-h5-login', authController.wechatH5Login);

// 手机号登录（密码）
router.post('/phone-login', authController.phoneLogin);

// 注册（密码）
router.post('/register', authController.register);

// 发送短信验证码
router.post('/send-code', authController.sendCode);

// 验证码登录（未注册自动注册）
router.post('/code-login', authController.codeLogin);

// 刷新 Token
router.post('/refresh-token', authController.refreshToken);

// 退出登录
router.post('/logout', authenticate, authController.logout);

module.exports = router;
