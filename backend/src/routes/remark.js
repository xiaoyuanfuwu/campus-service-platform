const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const remarkController = require('../controllers/remarkController');

router.use(authenticate);

router.get('/', remarkController.getRemark);
router.post('/batch', remarkController.batchGetRemarks);
router.put('/', remarkController.setRemark);

module.exports = router;
