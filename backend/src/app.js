require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const rateLimit = require('express-rate-limit');

const getPool = require('./config/db');
const errorHandler = require('./middleware/errorHandler');

// 路由导入
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/user');
const carpoolRoutes = require('./routes/carpool');
const notificationRoutes = require('./routes/notification');
const messageRoutes = require('./routes/message');
const reviewRoutes = require('./routes/review');
const uploadRoutes = require('./routes/upload');
const feedbackRoutes = require('./routes/feedback');
const announcementRoutes = require('./routes/announcement');
const complaintRoutes = require('./routes/complaint');
const adminRoutes = require('./routes/admin');
const recommendRoutes = require('./routes/recommend');
const groupChatRoutes = require('./routes/groupChat');
const messageEnhancedRoutes = require('./routes/messageEnhanced');
const contactRoutes = require('./routes/contact');
const moduleRoutes = require('./routes/module');
const remarkRoutes = require('./routes/remark');
const stickerRoutes = require('./routes/sticker');
const treeholeRoutes = require('./routes/treehole');
const treeholeAdminRoutes = require('./routes/treeholeAdmin');
const carpoolTagRoutes = require('./routes/carpoolTag');
const wallRoutes = require('./routes/wall');
const forumRoutes = require('./routes/forum');

// 新模块路由
const referenceRoutes = require('./routes/reference');
const guideRoutes = require('./routes/guide');
const parttimeAdminController = require('./controllers/parttimeAdminController');
const guideCheckinRoutes = require('./routes/guideCheckin');
const achievementRoutes = require('./routes/achievement');
const mapRoutes = require('./routes/map');
const canteenRoutes = require('./routes/canteen');

const app = express();

// 信任 Nginx 代理（解决 rate-limit X-Forwarded-For 警告）
app.set('trust proxy', 1);

// 初始化数据库连接池
getPool();

// 自动迁移 — 添加 wechat_id / qq 字段
(async () => {
  const pool = getPool();
  const migrations = [
    "ALTER TABLE users ADD COLUMN wechat_id VARCHAR(64) DEFAULT NULL",
    "ALTER TABLE users ADD COLUMN qq VARCHAR(32) DEFAULT NULL",
    "ALTER TABLE users ADD COLUMN email VARCHAR(128) DEFAULT NULL",
    "ALTER TABLE parttime_jobs ADD COLUMN image_url VARCHAR(500) DEFAULT NULL",
    "ALTER TABLE parttime_jobs ADD COLUMN time VARCHAR(100) DEFAULT NULL",
    "CREATE TABLE IF NOT EXISTS guide_checkins (" +
      "id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY," +
      "user_id BIGINT UNSIGNED NOT NULL," +
      "item_id BIGINT UNSIGNED NOT NULL," +
      "images JSON DEFAULT NULL," +
      "note VARCHAR(500) DEFAULT NULL," +
      "latitude DECIMAL(10,7) DEFAULT NULL," +
      "longitude DECIMAL(10,7) DEFAULT NULL," +
      "checkin_count INT DEFAULT 1," +
      "is_active TINYINT(1) DEFAULT 1," +
      "created_at DATETIME DEFAULT CURRENT_TIMESTAMP," +
      "updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP," +
      "INDEX idx_user (user_id)," +
      "INDEX idx_item (item_id)," +
      "INDEX idx_user_item (user_id, item_id)," +
      "INDEX idx_date (created_at)," +
      "FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE," +
      "FOREIGN KEY (item_id) REFERENCES guide_items(id) ON DELETE CASCADE" +
    ") ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",
    "CREATE TABLE IF NOT EXISTS carpool_tag_options (" +
      "id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY," +
      "label VARCHAR(32) NOT NULL COMMENT '标签文本'," +
      "sort_order INT DEFAULT 0 COMMENT '排序权重，大的靠前'," +
      "is_active TINYINT(1) DEFAULT 1 COMMENT '1=启用 0=禁用'," +
      "created_at DATETIME DEFAULT CURRENT_TIMESTAMP," +
      "UNIQUE KEY uk_label (label)" +
    ") ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",
    "CREATE TABLE IF NOT EXISTS guide_feed (" +
      "id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY," +
      "title VARCHAR(200) DEFAULT NULL," +
      "description VARCHAR(1000) DEFAULT NULL," +
      "images JSON DEFAULT NULL," +
      "category_key VARCHAR(64) DEFAULT ''," +
      "sort_order INT DEFAULT 0," +
      "is_active TINYINT(1) DEFAULT 1," +
      "created_at DATETIME DEFAULT CURRENT_TIMESTAMP," +
      "updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP," +
      "INDEX idx_category (category_key)," +
      "INDEX idx_active (is_active)," +
      "INDEX idx_sort (sort_order)" +
    ") ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",
    // 模块帖子点赞：likeCount 列 + 点赞记录表（用户级去重，支持取消点赞）
    "ALTER TABLE module_posts ADD COLUMN likeCount INT NOT NULL DEFAULT 0",
    // 发帖时刻的等级快照（LV 徽标用，避免详情页实时计算）
    "ALTER TABLE module_posts ADD COLUMN creator_level TINYINT DEFAULT NULL",
    "CREATE TABLE IF NOT EXISTS module_likes (" +
      "id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY," +
      "user_id BIGINT UNSIGNED NOT NULL," +
      "post_id BIGINT UNSIGNED NOT NULL," +
      "module VARCHAR(20) DEFAULT ''," +
      "createTime DATETIME DEFAULT CURRENT_TIMESTAMP," +
      "UNIQUE KEY uk_user_post (user_id, post_id)," +
      "INDEX idx_post (post_id)" +
    ") ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",
  ];
  for (const sql of migrations) {
    try { await pool.execute(sql); console.log('✅ 迁移:', sql.substring(0, 50).replace(/\\n/g, ' ')); }
    catch (e) { if (e.code !== 'ER_DUP_FIELDNAME' && e.code !== 'ER_TABLE_EXISTS_ERROR') console.warn('⚠️ 迁移失败:', e.message); }
  }
})().catch(err => {
  console.error('[FATAL] 启动迁移失败:', err.message);
});

// 安全中间件
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginResourcePolicy: false,
}));
app.use(cors());

// 请求日志
if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'));
}

// 全局限流
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分钟
  max: 2000,                 // 最多2000次请求（SPA+轮询场景需宽松）
  message: { success: false, message: '请求过于频繁，请稍后再试' },
});
app.use('/api', limiter);

// 解析请求体
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// 静态文件 - 上传目录
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// 根路径返回服务状态（H5 前端已移除，仅保留小程序 + 后端 API）
app.get('/', (req, res) => {
  res.json({ success: true, message: 'Campus Service API is running', version: '2.0.0' });
});

// Admin 管理后台
app.use('/admin', express.static(path.join(__dirname, '..', 'admin')));
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'admin', 'index.html'));
});

// API 路由
app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);
app.use('/api/carpools', carpoolRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/messages', groupChatRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/feedback', feedbackRoutes);
app.use('/api/announcements', announcementRoutes);
app.use('/api/complaints', complaintRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/recommend', recommendRoutes);
app.use('/api/messages/enhanced', messageEnhancedRoutes);
app.use('/api/contact', contactRoutes);
app.use('/api/module', referenceRoutes);
app.use('/api/module', moduleRoutes);
app.use('/api/guide', guideRoutes);
app.get('/api/parttime-jobs', parttimeAdminController.publicList);
app.use('/api/guide-checkin', guideCheckinRoutes);
app.use('/api/achievement', achievementRoutes);
app.use('/api/remarks', remarkRoutes);
app.use('/api/stickers', stickerRoutes);
app.use('/api/treehole', treeholeRoutes);
app.use('/api/canteen', canteenRoutes);
app.use('/api/treehole-admin', treeholeAdminRoutes);
app.use('/api/map', mapRoutes);
app.use('/api/carpool-tags', carpoolTagRoutes);
app.use('/api/forum', forumRoutes);
app.use('/api/wall', wallRoutes);

// 首页功能宫格配置（可选配置）
// 当前小程序会在未配置时使用本地默认宫格，因此接口必须稳定返回空数组，不能落到 404。
app.get('/api/serve-configs', (req, res) => {
  res.json({ success: true, data: [] });
});

// 健康检查
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: '校园信息服务平台 API 服务运行正常',
    version: '2.0.0',
    timestamp: new Date().toISOString(),
  });
});

// 404 处理
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `接口 ${req.method} ${req.originalUrl} 不存在`,
  });
});

// 全局错误处理
app.use(errorHandler);

// ========== 进程级异常保护（防止因未捕获异常导致 PM2 反复重启） ==========
process.on('uncaughtException', (err) => {
  console.error('[FATAL] uncaughtException:', err.message, err.stack);
  // 记录后优雅退出，PM2 会重启
  process.exit(1);
});
process.on('unhandledRejection', (reason, promise) => {
  console.error('[FATAL] unhandledRejection:', reason);
  // 不主动退出，但记录以便排查
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`🚀 校园信息服务平台后端服务已启动: http://localhost:${PORT}`);
  console.log(`📖 API 文档: http://localhost:${PORT}/api/health`);

  // 启动时立即执行一次每日统计，之后每小时执行一次
  const { updateDailyStats } = require('./services/dailyStatsJob');
  updateDailyStats().catch(err => console.error('[job] 每日统计失败:', err.message));
  setInterval(() => {
    updateDailyStats().catch(err => console.error('[job] 每日统计失败:', err.message));
  }, 60 * 60 * 1000);

  // 拼车超时自动结束：超过出发时间的进行中拼车 → expired（"已结束"），只改状态、保留全部记录
  const { Carpool } = require('./models');
  const markExpiredCarpools = () => Carpool.markExpired()
    .then(n => { if (n > 0) console.log(`[job] 拼车超时标记已结束: ${n} 条`); })
    .catch(err => console.error('[job] 拼车超时检查失败:', err.message));
  markExpiredCarpools();
  setInterval(markExpiredCarpools, 5 * 60 * 1000);
});

module.exports = app;
