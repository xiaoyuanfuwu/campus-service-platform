/**
 * 参考数据路由 — 挂在 /api/module 下
 * 必须在 moduleRoutes 之前注册，以优先处理 yellowpage/questionbank
 */
const express = require('express');
const router = express.Router();
const referenceController = require('../controllers/referenceController');

// 校园黄页列表
router.get('/yellowpage', referenceController.getYellowpageList);

// 校园题库列表
router.get('/questionbank', referenceController.getQuestionbankList);

module.exports = router;
