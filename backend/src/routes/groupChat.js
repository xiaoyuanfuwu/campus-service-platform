const express = require('express');
const router = express.Router();
const { authenticate, requireVerified } = require('../middleware/auth');
const gc = require('../controllers/groupChatController');

router.use(authenticate);

router.get('/groups', gc.getMyGroups);
router.get('/group/:carpoolId/info', gc.getGroupInfo);
router.get('/group/:carpoolId', gc.getGroupMessages);
router.post('/group/:carpoolId', requireVerified, gc.sendGroupMessage);

module.exports = router;
