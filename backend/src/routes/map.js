const express = require('express');
const router = express.Router();
const mapController = require('../controllers/mapController');
const { adminAuth } = require('../middleware/adminAuth');

// 公开接口 — 小程序获取地标列表（无需登录）
router.get('/pois', mapController.getPois);
router.get('/pois/:id', mapController.getPoi);

// 管理接口 — 需要管理员登录
router.use(adminAuth);

router.get('/admin/all', mapController.getAllPois);
router.post('/pois', mapController.createPoi);
router.put('/pois/replace', mapController.replaceAllPois);
router.put('/pois/batch', mapController.batchUpdatePois);
router.put('/pois/:id', mapController.updatePoi);
router.delete('/pois/:id', mapController.deletePoi);

module.exports = router;
