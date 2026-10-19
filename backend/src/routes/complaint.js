const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const complaintController = require('../controllers/complaintController');

// 所有投诉接口需要登录
router.use(authenticate);

// ========== 用户端接口 ==========

// 提交投诉
router.post('/', complaintController.create);

// 我的投诉列表
router.get('/my', complaintController.getMyList);

// 投诉详情
router.get('/:id', complaintController.getDetail);

// 提交申诉
router.post('/:id/appeal', complaintController.submitAppeal);

// ========== 管理员接口 ==========

// 获取所有投诉列表
router.get('/admin/list', complaintController.getAdminList);

// 处理投诉
router.put('/admin/:id/handle', complaintController.handleComplaint);

// 处理申诉
router.put('/admin/:id/appeal-review', complaintController.reviewAppeal);

module.exports = router;
