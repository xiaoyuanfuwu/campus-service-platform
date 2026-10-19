const { createModel, getPool } = require('./mysql');

const tableName = 'treehole_posts';

const fieldMap = {
  'user': 'user_id',
};

const schemaHints = {
  primaryKey: 'id',
  jsonFields: ['images', 'image_emojis'],
  booleanFields: [],
};

const baseModel = createModel(tableName, schemaHints, fieldMap);

// ========== 自定义方法 ==========

/**
 * 树洞列表查询
 * @param {Object} options - {
 *   page, pageSize,
 *   sort: 'latest'|'hot',
 *   category,
 *   userId,            // 指定则只查该用户的帖子
 *   onlyPublished      // true=只查已发布（status>=1）；false=查所有状态
 * }
 */
async function getList({ page = 1, pageSize = 20, sort = 'latest', category, userId, onlyPublished = true } = {}) {
  const pool = getPool();
  const offset = (page - 1) * pageSize;

  const orderBy = sort === 'hot'
    ? 'likes DESC, comments DESC, shares DESC, createTime DESC'
    : 'createTime DESC';

  // 拼接 WHERE
  const where = [];
  const whereParams = [];
  // 公开列表只看已发布（status >= 1）；「我的」列表看待审+已发布，但排除已删除
  if (onlyPublished) {
    where.push('status >= 1');
  } else {
    where.push('status >= 0');
  }
  if (category && ['find', 'complain', 'help', 'share'].includes(category)) {
    where.push('category = ?');
    whereParams.push(category);
  }
  if (userId !== undefined && userId !== null && userId !== '') {
    where.push('user_id = ?');
    whereParams.push(Number(userId));
  }
  const whereSql = where.length > 0 ? 'WHERE ' + where.join(' AND ') : '';

  const [[{ total }]] = await pool.query(
    `SELECT COUNT(*) as total FROM treehole_posts ${whereSql}`,
    whereParams
  );

  const [rows] = await pool.query(
    `SELECT * FROM treehole_posts ${whereSql}
     ORDER BY ${orderBy} LIMIT ? OFFSET ?`,
    [...whereParams, parseInt(pageSize), offset]
  );

  return {
    list: rows.map(formatPost),
    total,
    page: parseInt(page),
    pageSize: parseInt(pageSize),
  };
}

/**
 * 发新帖
 */
async function createPost(data) {
  const pool = getPool();
  const [result] = await pool.query(
    `INSERT INTO treehole_posts
      (user_id, user_id_code, nick_name, avatar, content, images, category, location, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0)`,
    [
      data.userId,
      data.userIdCode || null,           // 6 位数唯一标识
      data.nickName || '匿名朋友',
      data.avatar || '🐣',
      data.content,
      data.images ? JSON.stringify(data.images) : null,
      data.category || 'share',
      data.location || '',
    ]
  );
  const [rows] = await pool.query('SELECT * FROM treehole_posts WHERE id = ?', [result.insertId]);
  return formatPost(rows[0]);
}

/**
 * 单帖详情 + 浏览数 +1
 */
async function getDetail(id, userId) {
  const pool = getPool();
  const [rows] = await pool.query(
    'SELECT * FROM treehole_posts WHERE id = ? AND status >= 0',
    [id]
  );
  if (rows.length === 0) return null;

  // 浏览 +1
  await pool.query('UPDATE treehole_posts SET views = views + 1 WHERE id = ?', [id]);

  const post = formatPost(rows[0]);

  // 如果登录，查点赞状态
  if (userId) {
    const [liked] = await pool.query(
      'SELECT id FROM treehole_likes WHERE user_id = ? AND post_id = ?',
      [userId, id]
    );
    post.liked = liked.length > 0;
  } else {
    post.liked = false;
  }

  return post;
}

/**
 * 软删除帖子（仅作者本人可删）：把 status 设为 -1
 * 官方帖（user_id=0 / status=2）不允许通过此接口删除
 */
async function softDelete(userId, postId) {
  const pool = getPool();
  const [rows] = await pool.query(
    'SELECT id, user_id, status FROM treehole_posts WHERE id = ? AND status >= 0',
    [postId]
  );
  if (rows.length === 0) return { ok: false, reason: '帖子不存在或已删除' };
  if (Number(rows[0].user_id) === 0 || Number(rows[0].status) === 2) {
    return { ok: false, reason: '官方帖不可通过此接口删除' };
  }
  if (Number(rows[0].user_id) !== Number(userId)) {
    return { ok: false, reason: '无权删除他人帖子' };
  }
  await pool.query(
    'UPDATE treehole_posts SET status = -1 WHERE id = ?',
    [postId]
  );
  return { ok: true };
}

/**
 * 切换点赞状态
 * @returns { liked: boolean, likes: number }
 */
async function toggleLike(userId, postId) {
  const pool = getPool();
  const [exist] = await pool.query(
    'SELECT id FROM treehole_likes WHERE user_id = ? AND post_id = ?',
    [userId, postId]
  );

  let liked;
  if (exist.length > 0) {
    await pool.query('DELETE FROM treehole_likes WHERE user_id = ? AND post_id = ?', [userId, postId]);
    await pool.query('UPDATE treehole_posts SET likes = GREATEST(likes - 1, 0) WHERE id = ?', [postId]);
    liked = false;
  } else {
    await pool.query('INSERT INTO treehole_likes (user_id, post_id) VALUES (?, ?)', [userId, postId]);
    await pool.query('UPDATE treehole_posts SET likes = likes + 1 WHERE id = ?', [postId]);
    liked = true;
  }

  const [[{ likes }]] = await pool.query('SELECT likes FROM treehole_posts WHERE id = ?', [postId]);
  return { liked, likes: likes || 0 };
}

/**
 * 转发 +1（无登录态也可，记录会少 userId）
 */
async function incrementShare(userId, postId) {
  const pool = getPool();
  const [result] = await pool.query('UPDATE treehole_posts SET shares = shares + 1 WHERE id = ? AND status >= 0', [postId]);
  if (result.affectedRows === 0) return null;
  const [[{ shares }]] = await pool.query('SELECT shares FROM treehole_posts WHERE id = ?', [postId]);
  return { shares: shares || 0 };
}

/**
 * 创建评论
 */
async function createComment(data) {
  const pool = getPool();
  const [result] = await pool.query(
    `INSERT INTO treehole_comments
      (post_id, user_id, user_id_code, nick_name, avatar, content, status)
     VALUES (?, ?, ?, ?, ?, ?, 0)`,
    [
      data.postId,
      data.userId,
      data.userIdCode || null,
      data.nickName || '匿名',
      data.avatar || '🐣',
      data.content,
    ]
  );
  // 计数器在管理后台审核通过时才 +1
  return { id: result.insertId };
}

/**
 * 获取某帖的评论列表（按时间倒序：最新的在上面）
 */
async function getComments(postId, { page = 1, pageSize = 30 } = {}) {
  const pool = getPool();
  const offset = (page - 1) * pageSize;

  const [[{ total }]] = await pool.query(
    'SELECT COUNT(*) as total FROM treehole_comments WHERE post_id = ? AND status = 1',
    [postId]
  );

  const [rows] = await pool.query(
    `SELECT id, post_id, user_id, user_id_code, nick_name, avatar, content, createTime
     FROM treehole_comments
     WHERE post_id = ? AND status = 1
     ORDER BY createTime DESC, id DESC
     LIMIT ? OFFSET ?`,
    [postId, parseInt(pageSize), offset]
  );

  const list = rows.map(r => ({
    id: r.id,
    postId: r.post_id,
    userId: r.user_id,
    userIdCode: r.user_id_code || '',
    nickName: r.nick_name,
    avatar: r.avatar,
    content: r.content,
    createTime: r.createTime,
  }));

  return { list, total };
}

/**
 * 软删除评论（仅作者本人可删）
 * 同时减少帖子的评论计数
 */
async function deleteComment(commentId, userId) {
  const pool = getPool();

  // 查出评论归属
  const [[c]] = await pool.query(
    'SELECT id, post_id, user_id, status FROM treehole_comments WHERE id = ?',
    [commentId]
  );
  if (!c) throw Object.assign(new Error('评论不存在'), { status: 404 });
  if (Number(c.user_id) !== Number(userId)) {
    throw Object.assign(new Error('无权删除他人的评论'), { status: 403 });
  }
  if (c.status === -1) throw Object.assign(new Error('评论已被删除'), { status: 404 });

  await pool.query('UPDATE treehole_comments SET status = -1 WHERE id = ?', [commentId]);

  // 评论是已通过状态才减少计数（待审核时评论数本来就未计入）
  if (c.status >= 1) {
    await pool.query(
      'UPDATE treehole_posts SET comments = GREATEST(comments - 1, 0) WHERE id = ?',
      [c.post_id]
    );
  }

  return { id: commentId, postId: c.post_id };
}

/**
 * 检查用户对一组帖子的点赞状态
 * @returns {Object} { [postId]: true }
 */
async function checkLiked(userId, postIds) {
  if (!userId || !postIds || postIds.length === 0) return {};
  const pool = getPool();
  const [rows] = await pool.query(
    `SELECT post_id FROM treehole_likes
     WHERE user_id = ? AND post_id IN (${postIds.map(() => '?').join(',')})`,
    [userId, ...postIds]
  );
  const map = {};
  for (const r of rows) map[r.post_id] = true;
  return map;
}

// ========== 格式化 ==========
function formatPost(row) {
  if (!row) return row;
  const obj = { ...row };

  for (const f of ['images', 'image_emojis']) {
    if (typeof obj[f] === 'string') {
      try { obj[f] = JSON.parse(obj[f] || '[]'); }
      catch (e) { obj[f] = []; }
    }
    if (!Array.isArray(obj[f])) obj[f] = [];
  }

  obj._id = obj.id;
  obj.userId = obj.user_id;
  obj.userIdCode = obj.user_id_code;     // 6 位数标识，前端可见
  obj.nickName = obj.nick_name;
  obj.likeCount = obj.likes;
  obj.commentCount = obj.comments;
  obj.shareCount = obj.shares || 0;
  obj.viewCount = obj.views || 0;
  obj.imageEmojis = obj.image_emojis;

  return obj;
}

baseModel.getList = getList;
baseModel.createPost = createPost;
baseModel.getDetail = getDetail;
baseModel.softDelete = softDelete;
baseModel.toggleLike = toggleLike;
baseModel.incrementShare = incrementShare;
baseModel.createComment = createComment;
baseModel.getComments = getComments;
baseModel.deleteComment = deleteComment;
baseModel.checkLiked = checkLiked;
baseModel.formatPost = formatPost;

module.exports = baseModel;
