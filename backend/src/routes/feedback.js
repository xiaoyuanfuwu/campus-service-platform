const express = require('express');
const router = express.Router();
const { authenticate, optionalAuth } = require('../middleware/auth');
const feedbackController = require('../controllers/feedbackController');

// ========== 用户端接口 ==========
router.use(authenticate);

// 提交反馈
router.post('/', feedbackController.create);

// 我的反馈列表
router.get('/my', feedbackController.getMyList);

// 反馈详情
router.get('/:id', feedbackController.getDetail);

// 对处理结果评分
router.put('/:id/rate', feedbackController.rateResult);

// 关闭反馈
router.put('/:id/close', feedbackController.close);

// ========== 管理员接口 ==========
// GET /api/feedback/admin/list
router.get('/admin/list', feedbackController.getAdminList);

// PUT /api/feedback/admin/:id/handle
router.put('/admin/:id/handle', feedbackController.handleFeedback);

module.exports = router;
