/**
 * 校园墙管理端控制器（独立审核流：新帖默认 pending，管理端单独审核）
 */
const getPool = require('../config/db');
const { Notification } = require('../models');
const { AppError } = require('../middleware/auth');
const forumController = require('./forumController');

exports.getList = async (req, res, next) => {
  try {
    const { keyword, status, auditStatus, page = 1, pageSize = 15 } = req.query;
    const pool = getPool();
    const where = ['1=1'];
    const values = [];
    if (status) { where.push('status = ?'); values.push(status); }
    if (auditStatus) { where.push('auditStatus = ?'); values.push(auditStatus); }
    if (keyword) {
      where.push('(title LIKE ? OR content LIKE ? OR creator_nickName LIKE ?)');
      values.push(`%${keyword}%`, `%${keyword}%`, `%${keyword}%`);
    }
    const size = parseInt(pageSize), current = parseInt(page);
    const [[{ total }]] = await pool.query(`SELECT COUNT(*) total FROM forum_posts WHERE ${where.join(' AND ')}`, values);
    const [rows] = await pool.query(
      `SELECT * FROM forum_posts WHERE ${where.join(' AND ')} ORDER BY (auditStatus = 'pending') DESC, createTime DESC LIMIT ? OFFSET ?`,
      [...values, size, (current - 1) * size]
    );
    const list = rows.map(r => {
      const obj = forumController.formatPost(r);
      return {
        id: obj.id, _id: obj.id, type: obj.type, title: obj.title,
        content: (obj.content || '').substring(0, 100), tags: obj.tags,
        status: obj.status, auditStatus: obj.auditStatus, auditReason: obj.auditReason || '',
        isAnonymous: obj.isAnonymous, viewCount: obj.viewCount, likeCount: obj.likeCount,
        replyCount: obj.replyCount, favoriteCount: obj.favoriteCount,
        creator: obj.creator, createTime: obj.createTime, updateTime: obj.updateTime,
      };
    });
    res.json({ success: true, data: { list, total, page: current, pageSize: size, totalPages: Math.ceil(total / size) } });
  } catch (e) { next(e); }
};

exports.getDetail = async (req, res, next) => {
  try {
    const row = await forumController.findPost(req.params.id);
    if (!row) throw new AppError('帖子不存在', 404);
    res.json({ success: true, data: forumController.formatPost(row) });
  } catch (e) { next(e); }
};

exports.audit = async (req, res, next) => {
  try {
    const { action, reason } = req.body; // approve | reject
    const pool = getPool();
    const row = await forumController.findPost(req.params.id);
    if (!row) throw new AppError('帖子不存在', 404);
    if (action === 'approve') {
      await pool.query("UPDATE forum_posts SET auditStatus = 'approved', auditReason = ? WHERE id = ?", [reason || '', row.id]);
    } else if (action === 'reject') {
      await pool.query("UPDATE forum_posts SET auditStatus = 'rejected', auditReason = ? WHERE id = ?", [reason || '不符合社区规范', row.id]);
      await Notification.create({
        recipient: row.creator_id, sender: null,
        senderSnapshot: { nickName: '系统管理员', avatarUrl: '' },
        type: 'module_status_change', title: '帖子审核未通过',
        content: `你发布的「${row.title}」审核未通过：${reason || '不符合社区规范'}`,
        priority: 'high',
      });
    } else {
      throw new AppError('无效的操作', 400);
    }
    res.json({ success: true, message: action === 'approve' ? '审核通过' : '已拒绝', data: { id: row.id } });
  } catch (e) { next(e); }
};

exports.takedown = async (req, res, next) => {
  try {
    const { reason } = req.body;
    const pool = getPool();
    const row = await forumController.findPost(req.params.id);
    if (!row) throw new AppError('帖子不存在', 404);
    await pool.query("UPDATE forum_posts SET status = 'cancelled', auditReason = ? WHERE id = ?", [`管理员下架：${reason || '违规内容'}`, row.id]);
    await Notification.create({
      recipient: row.creator_id, sender: null,
      senderSnapshot: { nickName: '系统管理员', avatarUrl: '' },
      type: 'module_status_change', title: '帖子已被下架',
      content: `你发布的「${row.title}」已被管理员下架。原因：${reason || '违反平台规则'}`,
      priority: 'high',
    });
    res.json({ success: true, message: '已下架' });
  } catch (e) { next(e); }
};

module.exports = exports;
