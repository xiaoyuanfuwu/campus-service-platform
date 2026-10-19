const express = require('express');
const router = express.Router();
const { getPool } = require('../models/mysql');
const { AppError } = require('../middleware/auth');
const { formatPost } = require('../models/TreeholePost');

// 管理后台密码（必须通过环境变量 TREEHOLE_ADMIN_PASSWORD 配置）
const ADMIN_USERNAME = 'admin';
const ADMIN_PASSWORD = process.env.TREEHOLE_ADMIN_PASSWORD || '';
if (!ADMIN_PASSWORD) {
  console.warn('⚠️  TREEHOLE_ADMIN_PASSWORD 未设置，树洞管理后台将不可用。请在 .env 中配置该变量。');
}

/**
 * 简易 token：base64(timestamp) + 短签名，过期 12h
 * 适合内网/单机管理后台；如要更强可以换成 JWT
 */
function makeToken() {
  const ts = Date.now();
  const payload = `${ts}`;
  const sig = require('crypto')
    .createHmac('sha256', ADMIN_PASSWORD)
    .update(payload)
    .digest('hex')
    .slice(0, 16);
  return Buffer.from(`${payload}.${sig}`).toString('base64');
}

function verifyToken(token) {
  if (!token) return false;
  try {
    const decoded = Buffer.from(token, 'base64').toString('utf-8');
    const [tsStr, sig] = decoded.split('.');
    if (!tsStr || !sig) return false;
    const ts = Number(tsStr);
    if (!Number.isFinite(ts)) return false;
    if (Date.now() - ts > 12 * 60 * 60 * 1000) return false; // 12h 过期
    const expected = require('crypto')
      .createHmac('sha256', ADMIN_PASSWORD)
      .update(tsStr)
      .digest('hex')
      .slice(0, 16);
    return sig === expected;
  } catch (e) {
    return false;
  }
}

function adminOnly(req, res, next) {
  const auth = req.headers['x-admin-token'] || req.query.adminToken;
  if (!verifyToken(auth)) {
    return res.status(401).json({ success: false, message: '请先登录管理后台' });
  }
  next();
}

/**
 * 发送系统通知
 * @param {number} userId - 接收者用户ID
 * @param {string} title - 通知标题
 * @param {string} content - 通知内容
 */
async function sendNotification(userId, title, content) {
  if (!userId) return;
  try {
    const pool = getPool();
    await pool.query(
      `INSERT INTO notifications
        (recipient_id, sender_id, sender_nickName, sender_avatarUrl, type, title, content, priority)
       VALUES (?, 0, '树洞管理员', '🌳', 'system', ?, ?, 'normal')`,
      [userId, title, content]
    );
  } catch (err) {
    console.error('[TreeholeAdmin] 发送通知失败:', err);
  }
}

/** 截取帖子内容摘要（最多50字） */
function excerpt(text, maxLen = 50) {
  if (!text) return '';
  const s = String(text).replace(/\s+/g, ' ').trim();
  return s.length > maxLen ? s.slice(0, maxLen) + '…' : s;
}

/**
 * 登录
 * POST /api/treehole-admin/login
 * body: { password }
 */
router.post('/login', (req, res) => {
  const { username, password } = req.body || {};
  if (String(username) !== ADMIN_USERNAME || String(password) !== ADMIN_PASSWORD) {
    return res.status(401).json({ success: false, message: '账号或密码错误' });
  }
  res.json({ success: true, message: '登录成功', data: { token: makeToken() } });
});

/**
 * 校验 token
 * GET /api/treehole-admin/check
 */
router.get('/check', adminOnly, (req, res) => {
  res.json({ success: true, message: 'token 有效' });
});

/**
 * 待审核列表
 * GET /api/treehole-admin/pending?page=1&pageSize=20
 */
router.get('/pending', adminOnly, async (req, res, next) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(req.query.pageSize) || 20));
    const offset = (page - 1) * pageSize;
    const pool = getPool();

    const [[{ total }]] = await pool.query(
      `SELECT COUNT(*) as total FROM treehole_posts WHERE status = 0`
    );
    const [rows] = await pool.query(
      `SELECT * FROM treehole_posts WHERE status = 0
       ORDER BY createTime DESC LIMIT ? OFFSET ?`,
      [pageSize, offset]
    );
    res.json({
      success: true,
      list: rows.map(formatPost),
      total,
      page,
      pageSize,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * 已发布列表（包含官方和已审核通过的）
 * GET /api/treehole-admin/posts?status=1|2&page=1&pageSize=20
 *   status: 1=用户帖已通过 2=官方帖  缺省=全部已发布
 */
router.get('/posts', adminOnly, async (req, res, next) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(req.query.pageSize) || 20));
    const offset = (page - 1) * pageSize;
    const status = req.query.status ? Number(req.query.status) : null;

    const pool = getPool();
    const where = ['status >= 1'];
    const params = [];
    if (status !== null && [1, 2].includes(status)) {
      where[0] = 'status = ?';
      params.push(status);
    }
    const whereSql = 'WHERE ' + where.join(' AND ');

    const [[{ total }]] = await pool.query(
      `SELECT COUNT(*) as total FROM treehole_posts ${whereSql}`, params
    );
    const [rows] = await pool.query(
      `SELECT * FROM treehole_posts ${whereSql}
       ORDER BY createTime DESC LIMIT ? OFFSET ?`,
      [...params, pageSize, offset]
    );
    res.json({
      success: true,
      list: rows.map(formatPost),
      total,
      page,
      pageSize,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * 通过审核
 * POST /api/treehole-admin/posts/:id/approve
 */
router.post('/posts/:id/approve', adminOnly, async (req, res, next) => {
  try {
    const { id } = req.params;
    const pool = getPool();
    const [[post]] = await pool.query(
      `SELECT user_id, content FROM treehole_posts WHERE id = ? AND status = 0`, [id]
    );
    if (!post) {
      throw new AppError('帖子不存在或已审核', 400);
    }
    await pool.query(
      `UPDATE treehole_posts SET status = 1 WHERE id = ?`, [id]
    );
    sendNotification(post.user_id, '你的帖子已通过审核', `树洞管理员通过了你的帖子「${excerpt(post.content)}」的审核，现在所有人可见啦 🌱`);
    res.json({ success: true, message: '已通过' });
  } catch (error) {
    next(error);
  }
});

/**
 * 驳回（软删）
 * POST /api/treehole-admin/posts/:id/reject
 * body: { reason?: '违规' }
 */
router.post('/posts/:id/reject', adminOnly, async (req, res, next) => {
  try {
    const { id } = req.params;
    const reason = (req.body && req.body.reason) || '';
    const pool = getPool();
    const [[post]] = await pool.query(
      `SELECT user_id, content FROM treehole_posts WHERE id = ? AND status = 0`, [id]
    );
    if (!post) {
      throw new AppError('帖子不存在或已处理', 400);
    }
    await pool.query(
      `UPDATE treehole_posts SET status = -1 WHERE id = ?`, [id]
    );
    const reasonText = reason ? `（原因：${excerpt(reason, 80)}）` : '';
    sendNotification(post.user_id, '你的帖子未通过审核', `树洞管理员驳回了你的帖子「${excerpt(post.content)}」${reasonText}。可修改后重新发布。`);
    res.json({ success: true, message: '已驳回' });
  } catch (error) {
    next(error);
  }
});

/**
 * 撤销审核（从已通过回到待审，仅管理用）
 * POST /api/treehole-admin/posts/:id/revert
 */
router.post('/posts/:id/revert', adminOnly, async (req, res, next) => {
  try {
    const { id } = req.params;
    const pool = getPool();
    const [result] = await pool.query(
      `UPDATE treehole_posts SET status = 0 WHERE id = ? AND status = 1`, [id]
    );
    if (result.affectedRows === 0) {
      throw new AppError('仅用户帖支持撤销', 400);
    }
    res.json({ success: true, message: '已撤回到待审' });
  } catch (error) {
    next(error);
  }
});

/**
 * 官方发布
 * POST /api/treehole-admin/posts/official
 * body: { content, category, location?, images? }
 *   - nick_name 写死为「树洞官方」
 *   - avatar 用 🌳
 *   - user_id 用 0（无真实用户）
 *   - status 直接 = 2（已发布且标记为官方）
 */
router.post('/posts/official', adminOnly, async (req, res, next) => {
  try {
    const { content, category = 'share', location = '', images = [] } = req.body || {};
    if (!content || !String(content).trim()) {
      throw new AppError('请填写内容', 400);
    }
    if (String(content).length > 500) {
      throw new AppError('内容不能超过 500 字', 400);
    }
    const validCategories = ['find', 'complain', 'help', 'share'];
    if (!validCategories.includes(category)) {
      throw new AppError('分类不合法', 400);
    }

    const pool = getPool();
    const [result] = await pool.query(
      `INSERT INTO treehole_posts
        (user_id, user_id_code, nick_name, avatar, content, images, category, location, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 2)`,
      [
        0,                              // 官方帖 user_id = 0
        '000000',                       // 官方 userIdCode
        '树洞官方',
        '🌳',
        String(content).trim(),
        Array.isArray(images) && images.length ? JSON.stringify(images) : null,
        category,
        String(location).trim().slice(0, 20),
      ]
    );
    const [rows] = await pool.query('SELECT * FROM treehole_posts WHERE id = ?', [result.insertId]);
    res.status(201).json({
      success: true,
      message: '官方帖已发布',
      data: formatPost(rows[0]),
    });
  } catch (error) {
    next(error);
  }
});

/**
 * 单帖详情（管理员用）
 * GET /api/treehole-admin/posts/:id
 */
router.get('/posts/:id', adminOnly, async (req, res, next) => {
  try {
    const { id } = req.params;
    const pool = getPool();
    const [rows] = await pool.query('SELECT * FROM treehole_posts WHERE id = ?', [id]);
    if (rows.length === 0) throw new AppError('帖子不存在', 404);
    res.json({ success: true, data: formatPost(rows[0]) });
  } catch (error) { next(error); }
});

/**
 * 编辑帖子（管理员编辑用户帖或官方帖）
 * PUT /api/treehole-admin/posts/:id
 * body: { content?, category?, location? }
 */
router.put('/posts/:id', adminOnly, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { content, category, location } = req.body || {};
    const pool = getPool();

    const [[post]] = await pool.query(
      `SELECT user_id, content, status FROM treehole_posts WHERE id = ? AND status >= 0`, [id]
    );
    if (!post) throw new AppError('帖子不存在或已删除', 400);

    const sets = [];
    const vals = [];
    if (content !== undefined) {
      const trimmed = String(content).trim();
      if (!trimmed) throw new AppError('内容不能为空', 400);
      if (trimmed.length > 500) throw new AppError('内容不能超过 500 字', 400);
      sets.push('content = ?'); vals.push(trimmed);
    }
    if (category !== undefined) {
      if (!['find', 'complain', 'help', 'share'].includes(category)) {
        throw new AppError('分类不合法', 400);
      }
      sets.push('category = ?'); vals.push(category);
    }
    if (location !== undefined) {
      sets.push('location = ?'); vals.push(String(location).trim().slice(0, 20));
    }
    if (sets.length === 0) throw new AppError('没有需要修改的内容', 400);

    await pool.query(`UPDATE treehole_posts SET ${sets.join(', ')} WHERE id = ?`, [...vals, id]);

    sendNotification(post.user_id, '你的帖子已被编辑', `树洞管理员编辑了你的帖子「${excerpt(post.content)}」的内容。`);
    res.json({ success: true, message: '已编辑' });
  } catch (error) {
    next(error);
  }
});

/**
 * 删帖（已发布/官方/待审都行；不区分作者）
 * DELETE /api/treehole-admin/posts/:id
 */
router.delete('/posts/:id', adminOnly, async (req, res, next) => {
  try {
    const { id } = req.params;
    const pool = getPool();
    const [[post]] = await pool.query(
      `SELECT user_id, content FROM treehole_posts WHERE id = ? AND status >= 0`, [id]
    );
    if (!post) {
      throw new AppError('帖子不存在或已删除', 400);
    }
    await pool.query(
      `UPDATE treehole_posts SET status = -1 WHERE id = ?`, [id]
    );
    sendNotification(post.user_id, '你的帖子已被删除', `树洞管理员删除了你的帖子「${excerpt(post.content)}」。如有疑问请联系管理员。`);
    res.json({ success: true, message: '已删除' });
  } catch (error) {
    next(error);
  }
});

/**
 * 统计
 * GET /api/treehole-admin/stats
 */
router.get('/stats', adminOnly, async (req, res, next) => {
  try {
    const pool = getPool();
    const [postRows] = await pool.query(`
      SELECT
        SUM(CASE WHEN status = 0 THEN 1 ELSE 0 END) AS pending,
        SUM(CASE WHEN status = 1 THEN 1 ELSE 0 END) AS userPosts,
        SUM(CASE WHEN status = 2 THEN 1 ELSE 0 END) AS officialPosts,
        SUM(CASE WHEN status = -1 THEN 1 ELSE 0 END) AS rejected,
        COUNT(*) AS total
      FROM treehole_posts
    `);
    const [cmtRows] = await pool.query(`
      SELECT
        SUM(CASE WHEN status = 0 THEN 1 ELSE 0 END) AS pendingComments,
        SUM(CASE WHEN status = 1 THEN 1 ELSE 0 END) AS publishedComments,
        SUM(CASE WHEN status = -1 THEN 1 ELSE 0 END) AS rejectedComments
      FROM treehole_comments
    `);
    res.json({ success: true, data: { ...postRows[0], ...cmtRows[0] } });
  } catch (error) {
    next(error);
  }
});

// ===== 用户管理 =====

/**
 * 封禁用户
 * POST /api/treehole-admin/users/:userIdCode/ban
 */
router.post('/users/:userIdCode/ban', adminOnly, async (req, res, next) => {
  try {
    const { userIdCode } = req.params;
    const pool = getPool();
    const [[user]] = await pool.query(
      `SELECT id, nickName, banned FROM users WHERE user_id_code = ?`, [userIdCode]
    );
    if (!user) throw new AppError('用户不存在', 404);
    if (user.banned) throw new AppError('该用户已被封禁', 400);
    await pool.query(`UPDATE users SET banned = 1 WHERE user_id_code = ?`, [userIdCode]);
    sendNotification(user.id, '你的账号已被封禁', `树洞管理员封禁了你的账号。被封禁期间你将无法发布帖子和评论。如有疑问请联系管理员。`);
    res.json({ success: true, message: '已封禁' });
  } catch (error) {
    next(error);
  }
});

/**
 * 解封用户
 * POST /api/treehole-admin/users/:userIdCode/unban
 */
router.post('/users/:userIdCode/unban', adminOnly, async (req, res, next) => {
  try {
    const { userIdCode } = req.params;
    const pool = getPool();
    const [[user]] = await pool.query(
      `SELECT id, nickName, banned FROM users WHERE user_id_code = ?`, [userIdCode]
    );
    if (!user) throw new AppError('用户不存在', 404);
    if (!user.banned) throw new AppError('该用户未被封禁', 400);
    await pool.query(`UPDATE users SET banned = 0 WHERE user_id_code = ?`, [userIdCode]);
    sendNotification(user.id, '你的账号已解封', `树洞管理员解封了你的账号。你可以继续使用树洞功能了 🌱`);
    res.json({ success: true, message: '已解封' });
  } catch (error) {
    next(error);
  }
});

/**
 * 封禁用户列表
 * GET /api/treehole-admin/users/banned?page=1&pageSize=20
 */
router.get('/users/banned', adminOnly, async (req, res, next) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(req.query.pageSize) || 20));
    const offset = (page - 1) * pageSize;
    const pool = getPool();
    const [[{ total }]] = await pool.query(`SELECT COUNT(*) as total FROM users WHERE banned = 1`);
    const [rows] = await pool.query(
      `SELECT id, user_id_code, nickName, avatarUrl, banned FROM users WHERE banned = 1 ORDER BY id ASC LIMIT ? OFFSET ?`,
      [pageSize, offset]
    );
    res.json({ success: true, list: rows, total, page, pageSize });
  } catch (error) {
    next(error);
  }
});

// ===== 评论管理 =====

function formatComment(c) {
  return {
    id: c.id,
    postId: c.post_id,
    userId: c.user_id,
    userIdCode: c.user_id_code || '',
    nickName: c.nick_name,
    avatar: c.avatar,
    content: c.content,
    status: c.status,
    createTime: c.createTime,
    postContent: c.post_content ? (c.post_content.length > 60 ? c.post_content.slice(0, 60) + '…' : c.post_content) : '',
    postNickName: c.post_nick_name || '',
  };
}

/**
 * 待审核评论
 * GET /api/treehole-admin/comments/pending?page=1&pageSize=20
 */
router.get('/comments/pending', adminOnly, async (req, res, next) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(req.query.pageSize) || 20));
    const offset = (page - 1) * pageSize;
    const pool = getPool();

    const [[{ total }]] = await pool.query(
      `SELECT COUNT(*) as total FROM treehole_comments WHERE status = 0`
    );
    const [rows] = await pool.query(
      `SELECT c.*, p.content as post_content, p.nick_name as post_nick_name
       FROM treehole_comments c
       LEFT JOIN treehole_posts p ON c.post_id = p.id
       WHERE c.status = 0
       ORDER BY c.createTime DESC LIMIT ? OFFSET ?`,
      [pageSize, offset]
    );
    res.json({
      success: true,
      list: rows.map(formatComment),
      total, page, pageSize,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * 已通过 / 已驳回 评论列表
 * GET /api/treehole-admin/comments?status=1|-1&page=1&pageSize=20
 */
router.get('/comments', adminOnly, async (req, res, next) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(req.query.pageSize) || 20));
    const offset = (page - 1) * pageSize;
    const status = req.query.status !== undefined ? Number(req.query.status) : 1;
    const pool = getPool();

    const [[{ total }]] = await pool.query(
      `SELECT COUNT(*) as total FROM treehole_comments WHERE status = ?`, [status]
    );
    const [rows] = await pool.query(
      `SELECT c.*, p.content as post_content, p.nick_name as post_nick_name
       FROM treehole_comments c
       LEFT JOIN treehole_posts p ON c.post_id = p.id
       WHERE c.status = ?
       ORDER BY c.createTime DESC LIMIT ? OFFSET ?`,
      [status, pageSize, offset]
    );
    res.json({
      success: true,
      list: rows.map(formatComment),
      total, page, pageSize,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * 通过评论审核
 * POST /api/treehole-admin/comments/:id/approve
 */
router.post('/comments/:id/approve', adminOnly, async (req, res, next) => {
  try {
    const { id } = req.params;
    const pool = getPool();
    const [[cmt]] = await pool.query(
      `SELECT user_id, content, post_id FROM treehole_comments WHERE id = ? AND status = 0`, [id]
    );
    if (!cmt) {
      throw new AppError('评论不存在或已审核', 400);
    }
    await pool.query(`UPDATE treehole_comments SET status = 1 WHERE id = ?`, [id]);
    await pool.query(`UPDATE treehole_posts SET comments = comments + 1 WHERE id = ?`, [cmt.post_id]);
    sendNotification(cmt.user_id, '你的评论已通过审核', `树洞管理员通过了你的评论「${excerpt(cmt.content)}」的审核 🌱`);
    res.json({ success: true, message: '评论已通过' });
  } catch (error) {
    next(error);
  }
});

/**
 * 驳回评论
 * POST /api/treehole-admin/comments/:id/reject
 */
router.post('/comments/:id/reject', adminOnly, async (req, res, next) => {
  try {
    const { id } = req.params;
    const pool = getPool();
    const [[cmt]] = await pool.query(
      `SELECT user_id, content FROM treehole_comments WHERE id = ? AND status = 0`, [id]
    );
    if (!cmt) {
      throw new AppError('评论不存在或已处理', 400);
    }
    await pool.query(`UPDATE treehole_comments SET status = -1 WHERE id = ?`, [id]);
    sendNotification(cmt.user_id, '你的评论未通过审核', `树洞管理员驳回了你的评论「${excerpt(cmt.content)}」。`);
    res.json({ success: true, message: '评论已驳回' });
  } catch (error) {
    next(error);
  }
});

/**
 * 单条评论详情（管理员用）
 * GET /api/treehole-admin/comments/:id
 */
router.get('/comments/:id', adminOnly, async (req, res, next) => {
  try {
    const { id } = req.params;
    const pool = getPool();
    const [rows] = await pool.query(
      `SELECT c.*, p.content as post_content, p.nick_name as post_nick_name
       FROM treehole_comments c
       LEFT JOIN treehole_posts p ON c.post_id = p.id
       WHERE c.id = ?`, [id]
    );
    if (rows.length === 0) throw new AppError('评论不存在', 404);
    res.json({ success: true, data: formatComment(rows[0]) });
  } catch (error) { next(error); }
});

/**
 * 编辑评论
 * PUT /api/treehole-admin/comments/:id
 * body: { content }
 */
router.put('/comments/:id', adminOnly, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { content } = req.body || {};
    if (!content || !String(content).trim()) throw new AppError('内容不能为空', 400);
    const pool = getPool();
    const [[cmt]] = await pool.query(
      `SELECT user_id, content FROM treehole_comments WHERE id = ? AND status >= 0`, [id]
    );
    if (!cmt) throw new AppError('评论不存在或已删除', 400);
    await pool.query(`UPDATE treehole_comments SET content = ? WHERE id = ?`, [String(content).trim(), id]);
    sendNotification(cmt.user_id, '你的评论已被编辑', `树洞管理员编辑了你的评论「${excerpt(cmt.content)}」的内容。`);
    res.json({ success: true, message: '已编辑' });
  } catch (error) {
    next(error);
  }
});

/**
 * 删除评论（软删）
 * DELETE /api/treehole-admin/comments/:id
 */
router.delete('/comments/:id', adminOnly, async (req, res, next) => {
  try {
    const { id } = req.params;
    const pool = getPool();
    const [[cmt]] = await pool.query(
      `SELECT post_id, status, content, user_id FROM treehole_comments WHERE id = ?`, [id]
    );
    if (!cmt) throw new AppError('评论不存在', 400);
    await pool.query(
      `UPDATE treehole_comments SET status = -1 WHERE id = ? AND status >= 0`, [id]
    );
    if (Number(cmt.status) === 1) {
      await pool.query(
        `UPDATE treehole_posts SET comments = GREATEST(comments - 1, 0) WHERE id = ?`,
        [cmt.post_id]
      );
    }
    sendNotification(cmt.user_id, '你的评论已被删除', `树洞管理员删除了你的评论「${excerpt(cmt.content)}」。如有疑问请联系管理员。`);
    res.json({ success: true, message: '评论已删除' });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
