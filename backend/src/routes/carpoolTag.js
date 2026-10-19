const express = require('express');
const router = express.Router();
const { authenticate, optionalAuth } = require('../middleware/auth');
const carpoolTagController = require('../controllers/carpoolTagController');

// 公开接口 — 获取可用标签列表
router.get('/', optionalAuth, carpoolTagController.getList);

// 以下接口需要登录（管理员）
router.use(authenticate);

// 批量创建 / 更新标签
router.post('/batch', carpoolTagController.upsertBatch);

// 删除标签
router.delete('/:id', carpoolTagController.remove);

module.exports = router;
