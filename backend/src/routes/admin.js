const express = require('express');
const router = express.Router();
const { adminAuth, requirePermission, logOperation } = require('../middleware/adminAuth');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { AppError } = require('../middleware/auth');

// — 图鉴广场图片上传配置 —
const UPLOAD_DIR = path.join(__dirname, '..', '..', process.env.UPLOAD_DIR || 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });
const uploadStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || '.jpg';
    cb(null, Date.now() + '-' + Math.round(Math.random() * 1e9) + ext);
  },
});
const uploadFeed = multer({
  storage: uploadStorage,
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    allowed.includes(file.mimetype) ? cb(null, true) : cb(new AppError('仅支持 JPG、PNG、GIF、WebP 格式', 400), false);
  },
  limits: { fileSize: 20 * 1024 * 1024 },
});

const adminController = require('../controllers/adminController');
const achievementController = require('../controllers/achievementController');
const forumAdminController = require('../controllers/forumAdminController');
const verificationController = require('../controllers/verificationController');

// ========== 公开接口 ==========

// 管理员登录（无需认证）
router.post('/login', adminController.login);

// ========== 以下需要管理员认证 ==========
router.use(adminAuth);

// 管理员个人信息
router.get('/profile', adminController.getProfile);
router.put('/change-password', adminController.changePassword);

// ========== 管理员管理（仅超管） ==========
router.post('/admins',
  requirePermission('admin.manage'),
  logOperation('admin', 'admin.create', '创建管理员'),
  adminController.createAdmin
);
router.get('/admins',
  requirePermission('admin.manage'),
  adminController.getAdminList
);
router.put('/admins/:id',
  requirePermission('admin.manage'),
  logOperation('admin', 'admin.update', '更新管理员'),
  adminController.updateAdmin
);
router.delete('/admins/:id',
  requirePermission('admin.manage'),
  logOperation('admin', 'admin.delete', '删除管理员'),
  adminController.deleteAdmin
);

// ========== 用户管理 ==========
router.get('/users',
  requirePermission('user.manage'),
  adminController.getUserList
);
router.get('/users/:id',
  requirePermission('user.manage'),
  adminController.getUserDetail
);
router.put('/users/:id/ban',
  requirePermission('user.ban'),
  logOperation('user', 'user.ban', '封禁/解封用户', { targetType: 'User' }),
  adminController.toggleBan
);
router.put('/users/:id/credit',
  requirePermission('user.credit'),
  logOperation('user', 'user.credit', '重置信用分', { targetType: 'User' }),
  adminController.resetCredit
);
router.put('/users/:id',
  requirePermission('user.manage'),
  logOperation('user', 'user.update', '修改用户信息', { targetType: 'User' }),
  adminController.updateUser
);
router.put('/users/:id/reset',
  requirePermission('user.manage'),
  logOperation('user', 'user.reset', '重置用户数据', { targetType: 'User' }),
  adminController.resetUser
);
router.delete('/users/:id',
  requirePermission('user.manage'),
  logOperation('user', 'user.delete', '删除用户', { targetType: 'User' }),
  adminController.deleteUser
);

// ========== 拼车管理（已并入 module_posts，统一走模块帖接口） ==========
// 以下路由保留仅为兼容旧调用，实际逻辑与 /modules 完全一致
router.get('/carpools',
  requirePermission('carpool.audit'),
  (req, res, next) => { req.query.module = 'carpool'; adminController.getModuleList(req, res, next); }
);
router.get('/carpools/:id',
  requirePermission('carpool.audit'),
  adminController.getModuleDetail
);
router.put('/carpools/:id/audit',
  requirePermission('carpool.audit'),
  logOperation('carpool', 'carpool.audit', '审核拼车', { targetType: 'Carpool' }),
  adminController.auditModule
);
router.put('/carpools/:id/takedown',
  requirePermission('carpool.delete'),
  logOperation('carpool', 'carpool.delete', '下架拼车', { targetType: 'Carpool' }),
  adminController.takedownModule
);

// ====== 用户实名认证审核 ======
// 认证列表（支持 status: pending/approved/rejected 过滤 + 关键词搜索）
router.get('/verifications',
  requirePermission('user.manage'),
  verificationController.getVerificationList
);

// 认证统计
router.get('/verifications/stats',
  requirePermission('user.manage'),
  verificationController.getVerifyStats
);

// 审核通过
router.post('/verifications/:id/approve',
  requirePermission('user.manage'),
  logOperation('user', 'user.manage', '通过实名认证', { targetType: 'UserVerification' }),
  verificationController.approveVerification
);

// 审核拒绝（body: { reason }）
router.post('/verifications/:id/reject',
  requirePermission('user.manage'),
  logOperation('user', 'user.manage', '拒绝实名认证', { targetType: 'UserVerification' }),
  verificationController.rejectVerification
);

// 撤销认证
router.post('/verifications/:id/revoke',
  requirePermission('user.manage'),
  logOperation('user', 'user.manage', '撤销实名认证', { targetType: 'UserVerification' }),
  verificationController.revokeVerification
);

// ========== 投诉管理 ==========
router.get('/complaints',
  requirePermission('complaint.handle'),
  adminController.getComplaintList
);
router.put('/complaints/:id/handle',
  requirePermission('complaint.handle'),
  logOperation('complaint', 'complaint.handle', '处理投诉', { targetType: 'Complaint' }),
  adminController.handleComplaint
);

// ========== 反馈管理 ==========
router.get('/feedback',
  requirePermission('feedback.handle'),
  adminController.getFeedbackList
);
router.put('/feedback/:id/handle',
  requirePermission('feedback.handle'),
  logOperation('feedback', 'feedback.handle', '处理反馈', { targetType: 'Feedback' }),
  adminController.handleFeedback
);

// ========== 数据统计 ==========
router.get('/dashboard',
  requirePermission('stats.view'),
  adminController.dashboard
);
router.get('/stats/trend',
  requirePermission('stats.view'),
  adminController.getTrend
);
router.get('/stats/hot-routes',
  requirePermission('stats.view'),
  adminController.getHotRoutes
);
router.get('/stats/user-growth',
  requirePermission('stats.view'),
  adminController.getUserGrowth
);
router.get('/stats/type-distribution',
  requirePermission('stats.view'),
  adminController.getTypeDistribution
);
router.post('/stats/snapshot',
  requirePermission('stats.view'),
  adminController.createSnapshot
);

// ========== 操作日志 ==========
router.get('/logs',
  requirePermission('log.view'),
  adminController.getLogs
);

// ========== IP 风控管理 ==========
router.get('/ip-records',
  requirePermission('system.config'),
  adminController.getIpRecords
);
router.put('/ip-records/:ip/toggle',
  requirePermission('system.config'),
  logOperation('system', 'ip.toggle', '封锁/解封IP'),
  adminController.toggleIpBlock
);

// ========== 敏感词管理 ==========
router.get('/sensitive-words',
  requirePermission('system.config'),
  adminController.getSensitiveWords
);
router.post('/sensitive-words',
  requirePermission('system.config'),
  logOperation('system', 'sensitive.add', '添加敏感词'),
  adminController.addSensitiveWord
);
router.delete('/sensitive-words/:id',
  requirePermission('system.config'),
  logOperation('system', 'sensitive.remove', '删除敏感词'),
  adminController.removeSensitiveWord
);

// ========== 聊天/消息管理 ==========
router.get('/messages/conversations',
  requirePermission('user.manage'),
  adminController.getConversations
);
router.get('/messages/conversation/:conversationId',
  requirePermission('user.manage'),
  adminController.getConversationMessages
);
router.get('/messages/group-chats',
  requirePermission('user.manage'),
  adminController.getGroupChats
);
router.get('/messages/group-chat/:carpoolId',
  requirePermission('user.manage'),
  adminController.getGroupChatMessages
);
router.get('/messages/search',
  requirePermission('user.manage'),
  adminController.searchMessages
);
router.delete('/messages/:id',
  requirePermission('user.manage'),
  logOperation('message', 'message.delete', '删除消息', { targetType: 'Message' }),
  adminController.deleteMessage
);

// ========== 图鉴广场管理 ==========
router.get('/guide/feed',
  requirePermission('guide.manage'),
  logOperation('guide', 'guide.feed.list', '查看图鉴广场列表'),
  require('../controllers/guideFeedController').adminGetFeedList
);
router.post('/guide/feed',
  requirePermission('guide.manage'),
  uploadFeed.array('files', 9),
  logOperation('guide', 'guide.feed.create', '创建图鉴广场条目'),
  require('../controllers/guideFeedController').createFeed
);
router.put('/guide/feed/:id',
  requirePermission('guide.manage'),
  uploadFeed.array('files', 9),
  logOperation('guide', 'guide.feed.update', '更新图鉴广场条目'),
  require('../controllers/guideFeedController').updateFeed
);
router.delete('/guide/feed/:id',
  requirePermission('guide.manage'),
  logOperation('guide', 'guide.feed.delete', '删除图鉴广场条目'),
  require('../controllers/guideFeedController').deleteFeed
);
router.put('/guide/feed/:id/toggle',
  requirePermission('guide.manage'),
  logOperation('guide', 'guide.feed.toggle', '上下架图鉴广场条目'),
  require('../controllers/guideFeedController').toggleFeedStatus
);

// ========== 图鉴条目审核（guide_items 表） ==========
router.get('/guide/items',
  requirePermission('guide.manage'),
  adminController.getGuideItemList
);
router.put('/guide/items/:id/approve',
  requirePermission('guide.manage'),
  logOperation('guide', 'guide.items.approve', '通过图鉴条目审核'),
  adminController.approveGuideItem
);
router.put('/guide/items/:id/reject',
  requirePermission('guide.manage'),
  logOperation('guide', 'guide.items.reject', '拒绝图鉴条目审核'),
  adminController.rejectGuideItem
);

// ========== 图鉴大全管理（guide_categories / guide_items 完整 CRUD） ==========
const guideAdminController = require('../controllers/guideAdminController');
// 分类
router.get('/guide/categories',
  requirePermission('guide.manage'),
  guideAdminController.getCategories
);
router.post('/guide/categories',
  requirePermission('guide.manage'),
  logOperation('guide', 'guide.category.create', '创建图鉴分类'),
  guideAdminController.createCategory
);
router.put('/guide/categories/:id',
  requirePermission('guide.manage'),
  logOperation('guide', 'guide.category.update', '更新图鉴分类'),
  guideAdminController.updateCategory
);
router.delete('/guide/categories/:id',
  requirePermission('guide.manage'),
  logOperation('guide', 'guide.category.delete', '删除图鉴分类'),
  guideAdminController.deleteCategory
);
// 元素
router.post('/guide/items',
  requirePermission('guide.manage'),
  logOperation('guide', 'guide.item.create', '创建图鉴元素'),
  guideAdminController.createItem
);
router.put('/guide/items/:id',
  requirePermission('guide.manage'),
  logOperation('guide', 'guide.item.update', '更新图鉴元素'),
  guideAdminController.updateItem
);
router.delete('/guide/items/:id',
  requirePermission('guide.manage'),
  logOperation('guide', 'guide.item.delete', '删除图鉴元素'),
  guideAdminController.deleteItem
);
router.put('/guide/items/:id/toggle',
  requirePermission('guide.manage'),
  logOperation('guide', 'guide.item.toggle', '上下架图鉴元素'),
  guideAdminController.toggleItemActive
);

// ========== 模块帖子管理 ==========
router.get('/modules',
  requirePermission('carpool.audit'),
  adminController.getModuleList
);
router.get('/modules/:id',
  requirePermission('carpool.audit'),
  adminController.getModuleDetail
);
router.put('/modules/:id/takedown',
  requirePermission('carpool.delete'),
  logOperation('module', 'module.takedown', '下架模块帖子', { targetType: 'ModulePost' }),
  adminController.takedownModule
);

// 模块帖子审核（通过/拒绝）
router.put('/modules/:id/audit',
  requirePermission('carpool.audit'),
  logOperation('module', 'module.audit', '审核模块帖子', { targetType: 'ModulePost' }),
  adminController.auditModule
);

// ========== 校园墙管理（独立审核） ==========
router.get('/forums',
  requirePermission('carpool.audit'),
  forumAdminController.getList
);
router.get('/forums/:id',
  requirePermission('carpool.audit'),
  forumAdminController.getDetail
);
router.put('/forums/:id/audit',
  requirePermission('carpool.audit'),
  logOperation('forum', 'forum.audit', '审核校园墙帖子', { targetType: 'ForumPost' }),
  forumAdminController.audit
);
router.put('/forums/:id/takedown',
  requirePermission('carpool.delete'),
  logOperation('forum', 'forum.takedown', '下架校园墙帖子', { targetType: 'ForumPost' }),
  forumAdminController.takedown
);

// ========== 评价管理 ==========
router.get('/reviews',
  requirePermission('complaint.handle'),
  adminController.getReviewList
);
router.delete('/reviews/:id',
  requirePermission('complaint.handle'),
  logOperation('review', 'review.delete', '删除评价', { targetType: 'Review' }),
  adminController.deleteReview
);


// ========== 成就审核管理 ==========
router.get('/achievement/pending',
  requirePermission('achievement.audit'),
  logOperation('achievement', 'audit.list', '查看成就审核列表'),
  achievementController.adminGetPendingList
);
router.put('/achievement/:id/approve',
  requirePermission('achievement.audit'),
  logOperation('achievement', 'audit.approve', '通过成就审核'),
  achievementController.adminApproveSubmission
);
router.put('/achievement/:id/reject',
  requirePermission('achievement.audit'),
  logOperation('achievement', 'audit.reject', '拒绝成就审核'),
  achievementController.adminRejectSubmission
);

// ========== 兼职管理（parttime-jobs） ==========
const parttimeAdminController = require('../controllers/parttimeAdminController');
router.get('/parttime-jobs',
  requirePermission('carpool.audit'),
  parttimeAdminController.list
);
router.post('/parttime-jobs',
  requirePermission('carpool.audit'),
  logOperation('parttime', 'parttime.create', '新增兼职'),
  parttimeAdminController.create
);
router.put('/parttime-jobs/:id',
  requirePermission('carpool.audit'),
  logOperation('parttime', 'parttime.update', '编辑兼职'),
  parttimeAdminController.update
);
router.delete('/parttime-jobs/:id',
  requirePermission('carpool.audit'),
  logOperation('parttime', 'parttime.delete', '删除兼职'),
  parttimeAdminController.remove
);

module.exports = router;

// 手动触发每日统计回填
router.post('/stats/backfill',
  requirePermission('system.config'),
  async (req, res, next) => {
    try {
      const { backfillDailyStats } = require('../services/dailyStatsJob');
      await backfillDailyStats();
      res.json({ success: true, message: '历史数据回填完成' });
    } catch (error) {
      next(error);
    }
  }
);
