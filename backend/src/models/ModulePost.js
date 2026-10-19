const { createModel, getPool, buildWhere } = require('./mysql');

// 论坛板块 → 标签映射（category 查询参数 → tags JSON 过滤）
const FORUM_CATEGORY_TAGS = {
  academic: ['课业答疑', '考证升学', '选课测评', '自习互助'],
  life: ['拼车跑腿', '二手交易', '食堂测评', '宿舍生活', '失物招领'],
  competition: ['竞赛交流', '实习兼职', '干部经验'],
  social: ['树洞', '社团活动', '搭子组队', '校园趣事'],
};

function getCategoryTags(category) {
  if (!category || !FORUM_CATEGORY_TAGS[category]) return null;
  return FORUM_CATEGORY_TAGS[category];
}

const tableName = 'module_posts';

const fieldMap = {
  'creator': 'creator_id',
  'creatorSnapshot.nickName': 'creator_nickName',
  'creatorSnapshot.avatarUrl': 'creator_avatarUrl',
  'creatorSnapshot.userCode': 'creator_userCode',
  'creatorSnapshot.creditScore': 'creator_creditScore',
  'creatorSnapshot.gender': 'creator_gender',
  'creatorSnapshot.school': 'creator_school',
};

const schemaHints = {
  primaryKey: 'id',
  jsonFields: ['images', 'tags', 'extra'],
  booleanFields: ['isFeatured', 'isTop'],
};

const ModulePost = createModel(tableName, schemaHints, fieldMap);

// ========== 模块收藏操作 ==========

/**
 * 切换收藏状态
 */
async function toggleFavorite(userId, postId, module) {
  const pool = getPool();
  const [rows] = await pool.query(
    'SELECT id FROM module_favorites WHERE user_id = ? AND post_id = ?',
    [userId, postId]
  );
  if (rows.length > 0) {
    await pool.query('DELETE FROM module_favorites WHERE user_id = ? AND post_id = ?', [userId, postId]);
    await pool.query(
      'UPDATE module_posts SET favoriteCount = GREATEST(favoriteCount - 1, 0) WHERE id = ?', [postId]
    );
    return { favorited: false };
  } else {
    await pool.query(
      'INSERT INTO module_favorites (user_id, post_id, module) VALUES (?, ?, ?)',
      [userId, postId, module]
    );
    await pool.query(
      'UPDATE module_posts SET favoriteCount = favoriteCount + 1 WHERE id = ?', [postId]
    );
    return { favorited: true };
  }
}

/**
 * 获取用户是否已收藏
 */
async function checkFavorited(userId, postIds) {
  if (!userId || !postIds || postIds.length === 0) return {};
  const pool = getPool();
  const [rows] = await pool.query(
    `SELECT post_id FROM module_favorites WHERE user_id = ? AND post_id IN (${postIds.map(() => '?').join(',')})`,
    [userId, ...postIds]
  );
  const map = {};
  for (const r of rows) map[r.post_id] = true;
  return map;
}

/**
 * 获取用户某模块的收藏列表
 */
async function getMyFavorites(userId, module, page = 1, pageSize = 20) {
  const pool = getPool();
  const offset = (page - 1) * pageSize;
  const [[{ total }]] = await pool.query(
    `SELECT COUNT(*) as total FROM module_favorites f
     JOIN module_posts p ON f.post_id = p.id
     WHERE f.user_id = ? AND p.module = ?`,
    [userId, module]
  );
  const [rows] = await pool.query(
    `SELECT p.* FROM module_favorites f
     JOIN module_posts p ON f.post_id = p.id
     WHERE f.user_id = ? AND p.module = ?
     ORDER BY f.createTime DESC LIMIT ? OFFSET ?`,
    [userId, module, pageSize, offset]
  );
  return {
    list: rows.map(r => ModulePost.rowToObject ? ModulePost.rowToObject(r) : r),
    total,
    page: parseInt(page),
    pageSize: parseInt(pageSize),
  };
}

// ========== 帖子点赞（用户级去重，支持取消） ==========

/**
 * 切换点赞状态：已赞 → 取消，未赞 → 点赞。返回最新状态与数量
 */
async function toggleLike(userId, postId) {
  const pool = getPool();
  const [rows] = await pool.query(
    'SELECT id FROM module_likes WHERE user_id = ? AND post_id = ?',
    [userId, postId]
  );
  if (rows.length > 0) {
    await pool.query('DELETE FROM module_likes WHERE user_id = ? AND post_id = ?', [userId, postId]);
    await pool.query(
      'UPDATE module_posts SET likeCount = GREATEST(likeCount - 1, 0) WHERE id = ?', [postId]
    );
  } else {
    await pool.query(
      'INSERT INTO module_likes (user_id, post_id, module) VALUES (?, ?, ?)',
      [userId, postId, '']
    );
    await pool.query(
      'UPDATE module_posts SET likeCount = likeCount + 1 WHERE id = ?', [postId]
    );
  }
  const [[{ likeCount }]] = await pool.query(
    'SELECT likeCount FROM module_posts WHERE id = ?', [postId]
  );
  return { liked: rows.length === 0, count: likeCount || 0 };
}

/**
 * 批量查询用户是否已点赞（postIds → { postId: true }）
 */
async function checkLiked(userId, postIds) {
  if (!userId || !postIds || postIds.length === 0) return {};
  const pool = getPool();
  const [rows] = await pool.query(
    `SELECT post_id FROM module_likes WHERE user_id = ? AND post_id IN (${postIds.map(() => '?').join(',')})`,
    [userId, ...postIds]
  );
  const map = {};
  for (const r of rows) map[r.post_id] = true;
  return map;
}

// ========== 模块回复 ==========

/**
 * 获取帖子的回复列表
 */
async function getReplies(postId, page = 1, pageSize = 20) {
  const pool = getPool();
  const offset = (page - 1) * pageSize;
  const [[{ total }]] = await pool.query(
    'SELECT COUNT(*) as total FROM module_replies WHERE post_id = ? AND isDeleted = 0',
    [postId]
  );
  const [rows] = await pool.query(
    `SELECT r.*, u.nickName as user_nickName_fk, u.avatarUrl as user_avatarUrl_fk
     FROM module_replies r LEFT JOIN users u ON r.user_id = u.id
     WHERE r.post_id = ? AND r.isDeleted = 0
     ORDER BY r.createTime ASC LIMIT ? OFFSET ?`,
    [postId, pageSize, offset]
  );
  return {
    list: rows.map(r => ({
      id: r.id,
      postId: r.post_id,
      parentId: r.parent_id,
      replyToId: r.reply_to_id,
      replyToNickName: r.reply_to_nickName,
      content: r.content,
      images: typeof r.images === 'string' ? JSON.parse(r.images || '[]') : (r.images || []),
      likeCount: r.likeCount || 0,
      isDeleted: !!r.isDeleted,
      user: {
        id: r.user_id,
        nickName: r.user_nickName_fk || r.user_nickName || '',
        avatarUrl: r.user_avatarUrl_fk || r.user_avatarUrl || '',
      },
      createTime: r.createTime,
    })),
    total,
    page: parseInt(page),
    pageSize: parseInt(pageSize),
  };
}

/**
 * 发表回复
 */
async function createReply(data) {
  const pool = getPool();
  const sql = `INSERT INTO module_replies (post_id, module, parent_id, reply_to_id, reply_to_nickName,
    user_id, user_nickName, user_avatarUrl, content, images)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
  const [result] = await pool.query(sql, [
    data.postId, data.module, data.parentId || null, data.replyToId || null, data.replyToNickName || '',
    data.userId, data.userNickName, data.userAvatarUrl, data.content,
    data.images ? JSON.stringify(data.images) : null,
  ]);
  await pool.query(
    'UPDATE module_posts SET replyCount = replyCount + 1 WHERE id = ?', [data.postId]
  );
  const [rows] = await pool.query('SELECT * FROM module_replies WHERE id = ?', [result.insertId]);
  const r = rows[0];
  return {
    id: r.id, postId: r.post_id, parentId: r.parent_id, replyToId: r.reply_to_id,
    replyToNickName: r.reply_to_nickName, content: r.content,
    images: typeof r.images === 'string' ? JSON.parse(r.images || '[]') : (r.images || []),
    likeCount: 0, isDeleted: false,
    user: { id: data.userId, nickName: data.userNickName, avatarUrl: data.userAvatarUrl },
    createTime: r.createTime,
  };
}

/**
 * 删除回复（软删除）
 */
async function deleteReply(replyId, userId) {
  const pool = getPool();
  const [rows] = await pool.query('SELECT * FROM module_replies WHERE id = ?', [replyId]);
  if (rows.length === 0) return null;
  const reply = rows[0];
  if (String(reply.user_id) !== String(userId)) return false;
  await pool.query('UPDATE module_replies SET isDeleted = 1 WHERE id = ?', [replyId]);
  await pool.query(
    'UPDATE module_posts SET replyCount = GREATEST(replyCount - 1, 0) WHERE id = ?', [reply.post_id]
  );
  return true;
}

// ========== 首页统计 ==========

async function getModuleStats(school) {
  const pool = getPool();
  const modules = ['express', 'task', 'lost', 'forum', 'secondhand', 'rental', 'substitute', 'print', 'yellowpage', 'charity'];
  const stats = {};
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (const m of modules) {
    const [[{ total }]] = await pool.query(
      'SELECT COUNT(*) as total FROM module_posts WHERE module = ?', [m]
    );
    const [[{ active }]] = await pool.query(
      "SELECT COUNT(*) as active FROM module_posts WHERE module = ? AND status = 'active'", [m]
    );
    const [[{ todayCount }]] = await pool.query(
      'SELECT COUNT(*) as todayCount FROM module_posts WHERE module = ? AND createTime >= ?', [m, today]
    );
    stats[m] = { total, active, today: todayCount };
  }

  const [[summ]] = await pool.query(
    'SELECT COUNT(*) as totalPosts, SUM(CASE WHEN status = "active" THEN 1 ELSE 0 END) as activePosts FROM module_posts'
  );
  const [[{ todayPosts }]] = await pool.query(
    'SELECT COUNT(*) as todayPosts FROM module_posts WHERE createTime >= ?', [today]
  );
  const [[{ totalUsers }]] = await pool.query('SELECT COUNT(*) as totalUsers FROM users');

  return {
    summary: {
      totalPosts: summ.totalPosts || 0,
      activePosts: summ.activePosts || 0,
      totalUsers: totalUsers || 0,
      todayPosts: todayPosts || 0,
    },
    modules: stats,
  };
}

// ========== 扩展列表查询（带 creator 联查） ==========

async function getList(module, conditions = {}, options = {}) {
  const pool = getPool();
  const { page = 1, pageSize = 20, order = 'time' } = options;

  // 公开列表只展示审核通过且未下架的帖子
  let whereSql = "m.module = ? AND m.status != 'cancelled' AND m.auditStatus = 'approved'";
  const values = [module];

  if (conditions.includePending) {
    // 管理端/作者视角：允许带出待审核/被拒帖子
    whereSql = "m.module = ? AND m.status != 'cancelled'";
  }

  if (conditions.status) {
    whereSql += ' AND m.status = ?';
    values.push(conditions.status);
  } else {
    whereSql += " AND m.status = 'active'";
  }

  if (conditions.type && conditions.type !== 'all') {
    whereSql += ' AND m.type = ?';
    values.push(conditions.type);
  }

  if (conditions.keyword) {
    whereSql += ' AND (m.title LIKE ? OR m.content LIKE ?)';
    const kw = `%${conditions.keyword}%`;
    values.push(kw, kw);
  }

  if (conditions.minPrice !== undefined && conditions.minPrice !== null) {
    whereSql += ' AND m.price >= ?';
    values.push(conditions.minPrice);
  }

  if (conditions.maxPrice !== undefined && conditions.maxPrice !== null) {
    whereSql += ' AND m.price <= ?';
    values.push(conditions.maxPrice);
  }

  // 按板块 category 过滤（匹配 tags JSON 字段中的任意一个标签）
  if (conditions.category && module === 'forum') {
    const catTags = getCategoryTags(conditions.category);
    if (catTags && catTags.length > 0) {
      const jsonOrs = catTags.map(() => "JSON_CONTAINS(m.tags, JSON_QUOTE(?))").join(' OR ');
      whereSql += ` AND (${jsonOrs})`;
      values.push(...catTags);
    }
  }

  let orderBy = 'm.createTime DESC';
  if (order === 'price') orderBy = 'm.price ASC';
  else if (order === 'hot') orderBy = 'm.viewCount DESC, m.favoriteCount DESC';

  const offset = (page - 1) * pageSize;

  const [[{ total }]] = await pool.query(
    `SELECT COUNT(*) as total FROM module_posts m WHERE ${whereSql}`, values
  );

  const [rows] = await pool.query(
    `SELECT m.* FROM module_posts m WHERE ${whereSql}
     ORDER BY ${orderBy} LIMIT ? OFFSET ?`,
    [...values, pageSize, offset]
  );

  return {
    list: rows.map(r => formatPost(r)),
    total,
    page: parseInt(page),
    pageSize: parseInt(pageSize),
  };
}

/**
 * 获取详情（带浏览计数+收藏状态）
 */
async function getDetail(postId, userId) {
  const pool = getPool();
  const [rows] = await pool.query('SELECT * FROM module_posts WHERE id = ?', [postId]);
  if (rows.length === 0) return null;

  // 审核未通过/待审核：仅作者本人或管理员可见（带审核状态返回）
  if (rows[0].auditStatus !== 'approved') {
    const isOwner = userId && String(rows[0].creator_id) === String(userId);
    const isAdmin = userId && String(userId) === 'admin';
    if (!isOwner && !isAdmin) return null;
  }

  // 浏览+1
  await pool.query('UPDATE module_posts SET viewCount = viewCount + 1 WHERE id = ?', [postId]);

  const post = formatPost(rows[0]);
  post.viewCount = (post.viewCount || 0) + 1;

  if (userId) {
    const [favRows] = await pool.query(
      'SELECT id FROM module_favorites WHERE user_id = ? AND post_id = ?', [userId, postId]
    );
    post.isFavorited = favRows.length > 0;
    const [likeRows] = await pool.query(
      'SELECT id FROM module_likes WHERE user_id = ? AND post_id = ?', [userId, postId]
    );
    post.isLiked = likeRows.length > 0;
  } else {
    post.isFavorited = false;
    post.isLiked = false;
  }

  // 附带前10条回复
  const replyResult = await getReplies(postId, 1, 10);
  post.replies = replyResult.list;
  post.replyCount = post.replyCount || 0;

  return post;
}

/**
 * 获取用户某模块的已发布列表
 */
async function getMyPosts(creatorId, module, page = 1, pageSize = 20) {
  const pool = getPool();
  const offset = (page - 1) * pageSize;
  const [[{ total }]] = await pool.query(
    'SELECT COUNT(*) as total FROM module_posts WHERE creator_id = ? AND module = ?', [creatorId, module]
  );
  const [rows] = await pool.query(
    'SELECT * FROM module_posts WHERE creator_id = ? AND module = ? ORDER BY createTime DESC LIMIT ? OFFSET ?',
    [creatorId, module, pageSize, offset]
  );
  return {
    list: rows.map(r => formatPost(r)),
    total,
    page: parseInt(page),
    pageSize: parseInt(pageSize),
  };
}

/**
 * 获取用户接单（taken）的帖子列表
 * extra.taker.userId = userId
 */
async function getMyTaken(userId, module, page = 1, pageSize = 20) {
  const pool = getPool();
  const offset = (page - 1) * pageSize;
  const [[{ total }]] = await pool.query(
    `SELECT COUNT(*) as total FROM module_posts
     WHERE module = ? AND status != 'cancelled'
       AND JSON_EXTRACT(extra, '$.taker.userId') = ?`,
    [module, userId]
  );
  const [rows] = await pool.query(
    `SELECT * FROM module_posts
     WHERE module = ? AND status != 'cancelled'
       AND JSON_EXTRACT(extra, '$.taker.userId') = ?
     ORDER BY createTime DESC LIMIT ? OFFSET ?`,
    [module, userId, pageSize, offset]
  );
  return {
    list: rows.map(r => formatPost(r)),
    total,
    page: parseInt(page),
    pageSize: parseInt(pageSize),
  };
}

// ========== 辅助：格式化帖子输出 ==========

function formatPost(row, options = {}) {
  const obj = { ...row };

  // JSON 字段解析
  for (const f of ['images', 'tags', 'extra']) {
    if (typeof obj[f] === 'string') {
      try { obj[f] = JSON.parse(obj[f]); } catch (e) { obj[f] = f === 'extra' ? {} : []; }
    }
    if (obj[f] === null || obj[f] === undefined) obj[f] = f === 'extra' ? {} : [];
  }

  // 布尔字段
  for (const f of ['isFeatured', 'isTop']) {
    obj[f] = !!obj[f];
  }

  // 价格
  if (obj.price !== undefined) obj.price = parseFloat(obj.price);

  // 兼容前端字段名：评论数 replyCount → commentCount；点赞数（新列，可能为空）
  obj.commentCount = obj.replyCount || 0;
  obj.likeCount = obj.likeCount || 0;

  // Creator 快照
  obj.creator = {
    id: obj.creator_id,
    nickName: obj.creator_nickName || '',
    avatarUrl: obj.creator_avatarUrl || '',
    userCode: obj.creator_userCode || '',
    creditScore: obj.creator_creditScore || 100,
    gender: obj.creator_gender || 'secret',
    school: obj.creator_school || '',
    level: obj.creator_level || 1,
  };

  // 根据信用分计算等级
  const creditScore = obj.creator.creditScore;
  if (creditScore > 100) {
    obj.creator.creditLevelText = '极佳';
    obj.creator.creditLevelClass = 'excellent';
  } else if (creditScore >= 95) {
    obj.creator.creditLevelText = '优秀';
    obj.creator.creditLevelClass = 'good';
  } else if (creditScore >= 90) {
    obj.creator.creditLevelText = '良好';
    obj.creator.creditLevelClass = 'average';
  } else if (creditScore >= 85) {
    obj.creator.creditLevelText = '一般';
    obj.creator.creditLevelClass = 'normal';
  } else if (creditScore >= 80) {
    obj.creator.creditLevelText = '较差';
    obj.creator.creditLevelClass = 'bad';
  } else {
    obj.creator.creditLevelText = '极差';
    obj.creator.creditLevelClass = 'verybad';
  }

  // 清理
  delete obj.creator_id;
  delete obj.creator_nickName;
  delete obj.creator_avatarUrl;
  delete obj.creator_userCode;
  delete obj.creator_creditScore;
  delete obj.creator_gender;
  delete obj.creator_school;
  delete obj.creator_level;

  obj._id = obj.id;

  return obj;
}

// 挂载额外方法
ModulePost.toggleFavorite = toggleFavorite;
ModulePost.checkFavorited = checkFavorited;
ModulePost.toggleLike = toggleLike;
ModulePost.checkLiked = checkLiked;
ModulePost.getMyFavorites = getMyFavorites;
ModulePost.getReplies = getReplies;
ModulePost.createReply = createReply;
ModulePost.deleteReply = deleteReply;
ModulePost.getModuleStats = getModuleStats;
ModulePost.getList = getList;
ModulePost.getDetail = getDetail;
ModulePost.getMyPosts = getMyPosts;
ModulePost.getMyTaken = getMyTaken;
ModulePost.formatPost = formatPost;

module.exports = ModulePost;
