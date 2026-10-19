/**
 * 校园图鉴路由
 * 路由: /api/guide/categories, /api/guide/feed, /api/guide/all, /api/guide/:categoryKey
 */
const express = require('express');
const router = express.Router();
const guideController = require('../controllers/guideController');
const guideFeedController = require('../controllers/guideFeedController');

// 获取所有分类
router.get('/categories', guideController.getCategories);

// — 图鉴广场信息流 —
// 公开广场信息流（分页/筛选/搜索）— 必须放在 :categoryKey 之前
router.get('/feed', guideFeedController.getFeedList);

// 公开全量列表
router.get('/all', guideFeedController.getAllFeed);

// 获取指定分类下的条目（动态路由放最后）
router.get('/:categoryKey', guideController.getCategoryItems);

module.exports = router;
