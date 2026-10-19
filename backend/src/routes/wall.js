const express = require('express');
const router = express.Router();
const { optionalAuth } = require('../middleware/auth');
const wallController = require('../controllers/wallController');

// 校园互助墙统一聚合：游客可看（可选登录注入点赞状态）
router.get('/', optionalAuth, wallController.getWall);

module.exports = router;
