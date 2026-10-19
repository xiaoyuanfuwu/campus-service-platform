/**
 * 校园墙独立控制器（forum_posts 独立表 + 独立严格审核）
 * 新帖默认 auditStatus=pending，审核通过后才在列表展示
 */
const getPool = require('../config/db');
const { User, Notification } = require('../models');
const { AppError } = require('../middleware/auth');

// 前端板块 key → 标签集合（与小程序 forum.js HOME_CATEGORIES 对应）
const CATEGORY_TAGS = {
  daily: ['日常分享', '随手记录', '生活碎片'],
  topic: ['热门话题', '校园讨论'],
  confess: ['表白', '寻人', '心动瞬间'],
  secondhand: ['闲置转让', '求购'],
  qa: ['课业问题', '生活疑问'],
  rant: ['匿名吐槽', '树洞'],
  lost: ['失物寻物', '寻物启事'],
};

const json = (value, fallback = {}) => {
  if (!value) return fallback;
  if (typeof value === 'object') return value;
  try { return JSON.parse(value); } catch (_) { return fallback; }
};
const asInt = (value, fallback = 0) => Number.isFinite(Number(value)) ? Number(value) : fallback;

function formatPost(row, options = {}) {
  const obj = { ...row };
  for (const f of ['tags', 'images', 'extra']) {
    if (typeof obj[f] === 'string') { try { obj[f] = JSON.parse(obj[f]); } catch (_) { obj[f] = f === 'extra' ? {} : []; } }
    if (obj[f] == null) obj[f] = f === 'extra' ? {} : [];
  }
  for (const f of ['isFeatured', 'isTop', 'isAnonymous']) obj[f] = !!obj[f];
  if (obj.price !== undefined) obj.price = parseFloat(obj.price);
  obj.commentCount = obj.replyCount || 0;
  obj.likeCount = obj.likeCount || 0;
  obj.isAnonymous = !!obj.isAnonymous;
  // 匿名帖：发布者信息脱敏
  const creatorNick = obj.isAnonymous ? '匿名' : (obj.creator_nickName || '微信用户');
  const creatorAvatar = obj.isAnonymous ? '' : (obj.creator_avatarUrl || '');
  obj.creator = {
    id: obj.creator_id, nickName: creatorNick, avatarUrl: creatorAvatar,
    userCode: obj.creator_userCode || '', creditScore: obj.creator_creditScore || 100,
    gender: obj.creator_gender || 'secret', school: obj.creator_school || '',
  };
  obj.creator.creditLevelText = '良好'; obj.creator.creditLevelClass = 'average';
  const cs = obj.creator.creditScore;
  if (cs > 100) { obj.creator.creditLevelText = '极佳'; obj.creator.creditLevelClass = 'excellent'; }
  else if (cs >= 95) { obj.creator.creditLevelText = '优秀'; obj.creator.creditLevelClass = 'good'; }
  delete obj.creator_id; delete obj.creator_nickName; delete obj.creator_avatarUrl;
  delete obj.creator_userCode; delete obj.creator_creditScore; delete obj.creator_gender; delete obj.creator_school;
  obj._id = obj.id;
  obj.module = 'forum';
  obj.contentType = 'forum';
  obj.displayType = 'standard';
  obj._module = 'forum';
  obj._moduleName = '校园墙';
  return obj;
}

async function findPost(id) {
  const pool = getPool();
  const [rows] = await pool.query('SELECT * FROM forum_posts WHERE id = ? LIMIT 1', [id]);
  return rows[0] || null;
}

exports.getList = async (req, res, next) => {
  try {
    const { category, keyword, order, page = 1, pageSize = 20 } = req.query;
    const pool = getPool();
    const where = ["auditStatus = 'approved'", "status = 'active'"];
    const values = [];
    if (category && CATEGORY_TAGS[category]) {
      const ors = CATEGORY_TAGS[category].map(() => 'JSON_CONTAINS(tags, JSON_QUOTE(?))').join(' OR ');
      where.push(`(${ors})`);
      values.push(...CATEGORY_TAGS[category]);
    }
    if (keyword) {
      where.push('(title LIKE ? OR content LIKE ?)');
      values.push(`%${keyword}%`, `%${keyword}%`);
    }
    const orderBy = order === 'hot' ? 'viewCount DESC, likeCount DESC, createTime DESC' : 'isTop DESC, displayOrder DESC, createTime DESC';
    const size = Math.min(Math.max(asInt(pageSize, 20), 1), 100);
    const current = Math.max(asInt(page, 1), 1);
    const [[{ total }]] = await pool.query(`SELECT COUNT(*) total FROM forum_posts WHERE ${where.join(' AND ')}`, values);
    const [rows] = await pool.query(`SELECT * FROM forum_posts WHERE ${where.join(' AND ')} ORDER BY ${orderBy} LIMIT ? OFFSET ?`, [...values, size, (current - 1) * size]);
    const list = rows.map(formatPost);
    if (req.userId && list.length) {
      const ids = list.map(x => x.id);
      const [likeRows] = await pool.query(`SELECT post_id FROM forum_likes WHERE user_id = ? AND post_id IN (${ids.map(() => '?').join(',')})`, [req.userId, ...ids]);
      const [favRows] = await pool.query(`SELECT post_id FROM forum_favorites WHERE user_id = ? AND post_id IN (${ids.map(() => '?').join(',')})`, [req.userId, ...ids]);
      const lm = new Set(likeRows.map(r => r.post_id)), fm = new Set(favRows.map(r => r.post_id));
      list.forEach(x => { x.isLiked = lm.has(x.id); x.isFavorited = fm.has(x.id); });
    }
    res.json({ success: true, data: { list, total, page: current, pageSize: size, totalPages: Math.ceil(total / size) } });
  } catch (e) { next(e); }
};

exports.getDetail = async (req, res, next) => {
  try {
    const pool = getPool();
    const row = await findPost(req.params.id);
    if (!row || row.status === 'cancelled') throw new AppError('帖子不存在或已删除', 404);
    if (row.auditStatus !== 'approved' && String(row.creator_id) !== String(req.userId || '')) {
      throw new AppError('帖子审核中或未通过', 404);
    }
    await pool.query('UPDATE forum_posts SET viewCount = viewCount + 1 WHERE id = ?', [row.id]);
    row.viewCount += 1;
    const post = formatPost(row);
    if (req.userId) {
      const [likeRows] = await pool.query('SELECT id FROM forum_likes WHERE user_id = ? AND post_id = ?', [req.userId, row.id]);
      const [favRows] = await pool.query('SELECT id FROM forum_favorites WHERE user_id = ? AND post_id = ?', [req.userId, row.id]);
      post.isLiked = likeRows.length > 0;
      post.isFavorited = favRows.length > 0;
    } else {
      post.isLiked = false; post.isFavorited = false;
    }
    const replies = await exports.getRepliesData(row.id, 1, 10);
    post.replies = replies.list;
    post.replyCount = row.replyCount || 0;
    res.json({ success: true, data: post });
  } catch (e) { next(e); }
};

exports.create = async (req, res, next) => {
  try {
    const { title, content, type = 'chat', tags = [], images = [], contact = '', location = '', isAnonymous = false, notifySubscribe, notifyTemplateId } = req.body;
    if (!title || !title.trim()) throw new AppError('标题不能为空', 400);
    if (title.trim().length > 50) throw new AppError('标题不能超过50字', 400);
    if (!content || !content.trim()) throw new AppError('正文不能为空', 400);
    const user = await User.findById(req.userId);
    const pool = getPool();
    const extra = {};
    if (notifySubscribe) extra.notifySubscribe = true;
    if (notifyTemplateId) extra.notifyTemplateId = notifyTemplateId;
    const [result] = await pool.query(
      `INSERT INTO forum_posts (type, creator_id, creator_nickName, creator_avatarUrl, creator_userCode, creator_creditScore, creator_gender, creator_school, isAnonymous, title, content, summary, tags, images, location, auditStatus, extra)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [type, req.userId, user.nickName || '', user.avatarUrl || '', user.user_id_code || '', user.creditScore || 100,
       user.gender || 'secret', user.school || '', isAnonymous ? 1 : 0, title.trim(), content.trim(), content.trim().substring(0, 120),
       JSON.stringify(tags), JSON.stringify(images), location || '', 'pending',
       Object.keys(extra).length ? JSON.stringify(extra) : null]
    );
    const row = await findPost(result.insertId);
    res.status(201).json({ success: true, message: '发布成功，等待审核', data: formatPost(row) });
  } catch (e) { next(e); }
};

exports.update = async (req, res, next) => {
  try {
    const pool = getPool();
    const row = await findPost(req.params.id);
    if (!row) throw new AppError('帖子不存在', 404);
    if (String(row.creator_id) !== String(req.userId)) throw new AppError('只能编辑自己的帖子', 403);
    if (row.status !== 'active') throw new AppError('帖子已结束，无法编辑', 400);
    const { title, content, tags, images, contact, location } = req.body;
    const sets = []; const values = [];
    if (title !== undefined) { sets.push('title = ?'); values.push(title.trim()); }
    if (content !== undefined) { sets.push('content = ?', 'summary = ?'); values.push(content.trim(), content.trim().substring(0, 120)); }
    if (tags !== undefined) { sets.push('tags = ?'); values.push(JSON.stringify(tags)); }
    if (images !== undefined) { sets.push('images = ?'); values.push(JSON.stringify(images)); }
    if (contact !== undefined) { sets.push('contact = ?'); values.push(contact); }
    if (location !== undefined) { sets.push('location = ?'); values.push(location); }
    if (sets.length) await pool.query(`UPDATE forum_posts SET ${sets.join(', ')} WHERE id = ?`, [...values, row.id]);
    res.json({ success: true, message: '更新成功', data: formatPost(await findPost(row.id)) });
  } catch (e) { next(e); }
};

exports.remove = async (req, res, next) => {
  try {
    const row = await findPost(req.params.id);
    if (!row) throw new AppError('帖子不存在', 404);
    if (String(row.creator_id) !== String(req.userId)) throw new AppError('只能删除自己的帖子', 403);
    await getPool().query("UPDATE forum_posts SET status = 'cancelled' WHERE id = ?", [row.id]);
    res.json({ success: true, message: '已删除' });
  } catch (e) { next(e); }
};

exports.toggleLike = async (req, res, next) => {
  try {
    const pool = getPool();
    const row = await findPost(req.params.id);
    if (!row) throw new AppError('帖子不存在', 404);
    const [exist] = await pool.query('SELECT id FROM forum_likes WHERE user_id = ? AND post_id = ?', [req.userId, row.id]);
    if (exist.length) {
      await pool.query('DELETE FROM forum_likes WHERE user_id = ? AND post_id = ?', [req.userId, row.id]);
      await pool.query('UPDATE forum_posts SET likeCount = GREATEST(likeCount - 1, 0) WHERE id = ?', [row.id]);
      res.json({ success: true, data: { liked: false } });
    } else {
      await pool.query('INSERT INTO forum_likes (user_id, post_id) VALUES (?, ?)', [req.userId, row.id]);
      await pool.query('UPDATE forum_posts SET likeCount = likeCount + 1 WHERE id = ?', [row.id]);
      res.json({ success: true, data: { liked: true } });
    }
  } catch (e) { next(e); }
};

exports.toggleFavorite = async (req, res, next) => {
  try {
    const pool = getPool();
    const row = await findPost(req.params.id);
    if (!row) throw new AppError('帖子不存在', 404);
    const [exist] = await pool.query('SELECT id FROM forum_favorites WHERE user_id = ? AND post_id = ?', [req.userId, row.id]);
    if (exist.length) {
      await pool.query('DELETE FROM forum_favorites WHERE user_id = ? AND post_id = ?', [req.userId, row.id]);
      await pool.query('UPDATE forum_posts SET favoriteCount = GREATEST(favoriteCount - 1, 0) WHERE id = ?', [row.id]);
      res.json({ success: true, data: { favorited: false } });
    } else {
      await pool.query('INSERT INTO forum_favorites (user_id, post_id) VALUES (?, ?)', [req.userId, row.id]);
      await pool.query('UPDATE forum_posts SET favoriteCount = favoriteCount + 1 WHERE id = ?', [row.id]);
      res.json({ success: true, data: { favorited: true } });
    }
  } catch (e) { next(e); }
};

exports.getRepliesData = async (postId, page = 1, pageSize = 20) => {
  const pool = getPool();
  const offset = (page - 1) * pageSize;
  const [[{ total }]] = await pool.query('SELECT COUNT(*) total FROM forum_replies WHERE post_id = ? AND isDeleted = 0', [postId]);
  const [rows] = await pool.query('SELECT * FROM forum_replies WHERE post_id = ? AND isDeleted = 0 ORDER BY createTime ASC LIMIT ? OFFSET ?', [postId, pageSize, offset]);
  return { list: rows.map(r => ({ ...r, images: json(r.images, []) })), total, page, pageSize };
};

exports.getReplies = async (req, res, next) => {
  try {
    const { page = 1, pageSize = 20 } = req.query;
    const result = await exports.getRepliesData(req.params.id, asInt(page, 1), Math.min(asInt(pageSize, 20), 100));
    res.json({ success: true, data: result });
  } catch (e) { next(e); }
};

exports.createReply = async (req, res, next) => {
  try {
    const { content, parent_id, reply_to_id, reply_to_nickName, images = [] } = req.body;
    if (!content || !content.trim()) throw new AppError('回复内容不能为空', 400);
    const row = await findPost(req.params.id);
    if (!row || row.auditStatus !== 'approved' || row.status !== 'active') throw new AppError('帖子不存在或不可回复', 404);
    const user = await User.findById(req.userId);
    const pool = getPool();
    const [result] = await pool.query(
      'INSERT INTO forum_replies (post_id, parent_id, reply_to_id, reply_to_nickName, user_id, user_nickName, user_avatarUrl, content, images) VALUES (?,?,?,?,?,?,?,?,?)',
      [row.id, parent_id || null, reply_to_id || null, reply_to_nickName || '', req.userId, user.nickName || '', user.avatarUrl || '', content.trim(), JSON.stringify(images)]
    );
    await pool.query('UPDATE forum_posts SET replyCount = replyCount + 1 WHERE id = ?', [row.id]);
    const [[replyRow]] = await pool.query('SELECT * FROM forum_replies WHERE id = ?', [result.insertId]);
    res.status(201).json({ success: true, data: { ...replyRow, images: json(replyRow.images, []) } });
  } catch (e) { next(e); }
};

exports.deleteReply = async (req, res, next) => {
  try {
    const pool = getPool();
    const [rows] = await pool.query('SELECT * FROM forum_replies WHERE id = ?', [req.params.replyId]);
    if (!rows.length) throw new AppError('回复不存在', 404);
    const reply = rows[0];
    const post = await findPost(reply.post_id);
    if (String(reply.user_id) !== String(req.userId) && String(post && post.creator_id) !== String(req.userId)) {
      throw new AppError('无权删除该回复', 403);
    }
    await pool.query('UPDATE forum_replies SET isDeleted = 1 WHERE id = ?', [reply.id]);
    await pool.query('UPDATE forum_posts SET replyCount = GREATEST(replyCount - 1, 0) WHERE id = ?', [reply.post_id]);
    res.json({ success: true, message: '已删除' });
  } catch (e) { next(e); }
};

exports.likeReply = async (req, res, next) => {
  try {
    await getPool().query('UPDATE forum_replies SET likeCount = likeCount + 1 WHERE id = ?', [req.params.replyId]);
    res.json({ success: true });
  } catch (e) { next(e); }
};

exports.getMyPosts = async (req, res, next) => {
  try {
    const { page = 1, pageSize = 20 } = req.query;
    const pool = getPool();
    const size = Math.min(Math.max(asInt(pageSize, 20), 1), 100), current = Math.max(asInt(page, 1), 1);
    const [[{ total }]] = await pool.query('SELECT COUNT(*) total FROM forum_posts WHERE creator_id = ?', [req.userId]);
    const [rows] = await pool.query('SELECT * FROM forum_posts WHERE creator_id = ? ORDER BY createTime DESC LIMIT ? OFFSET ?', [req.userId, size, (current - 1) * size]);
    res.json({ success: true, data: { list: rows.map(formatPost), total, page: current, pageSize: size, totalPages: Math.ceil(total / size) } });
  } catch (e) { next(e); }
};

exports.getMyFavorites = async (req, res, next) => {
  try {
    const { page = 1, pageSize = 20 } = req.query;
    const pool = getPool();
    const size = Math.min(Math.max(asInt(pageSize, 20), 1), 100), current = Math.max(asInt(page, 1), 1);
    const [[{ total }]] = await pool.query('SELECT COUNT(*) total FROM forum_favorites f JOIN forum_posts p ON p.id = f.post_id WHERE f.user_id = ?', [req.userId]);
    const [rows] = await pool.query('SELECT p.* FROM forum_favorites f JOIN forum_posts p ON p.id = f.post_id WHERE f.user_id = ? ORDER BY f.createTime DESC LIMIT ? OFFSET ?', [req.userId, size, (current - 1) * size]);
    res.json({ success: true, data: { list: rows.map(formatPost), total, page: current, pageSize: size, totalPages: Math.ceil(total / size) } });
  } catch (e) { next(e); }
};

// 方法均通过 exports.xxx 定义；formatPost/findPost/getRepliesData 为局部函数，一并挂载
module.exports = Object.assign(exports, { formatPost, findPost });
