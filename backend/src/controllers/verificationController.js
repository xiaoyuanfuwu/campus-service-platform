/**
 * 用户实名认证 Controller
 * 认证材料：学生证 / 身份证 / 学信网 / 易校园 / 校园卡（任选其一）
 * 流程：提交 → pending → (管理端/审核端) approve/reject → isVerified=1
 */
const getPool = require('../config/db');
const { User } = require('../models');
const { AppError } = require('../middleware/auth');

const VERIFY_TYPES = ['student_card', 'id_card', 'xuexin', 'yi_campus', 'campus_card'];
const TYPE_LABELS = {
  student_card: '学生证',
  id_card: '身份证',
  xuexin: '学信网截图',
  yi_campus: '易校园截图',
  campus_card: '校园卡',
};

/**
 * 提交认证申请
 * POST /api/user/verify
 * body: { verifyType, imageUrl }
 */
exports.submitVerification = async (req, res, next) => {
  try {
    const { verifyType, imageUrl } = req.body || {};
    if (!VERIFY_TYPES.includes(verifyType)) {
      throw new AppError('请选择有效的认证类型', 400);
    }
    if (!imageUrl || typeof imageUrl !== 'string') {
      throw new AppError('请上传认证材料截图', 400);
    }
    const pool = getPool();

    // 已有 approved 认证 → 直接返回
    const [approved] = await pool.query(
      `SELECT id FROM user_verifications WHERE user_id = ? AND status = 'approved' LIMIT 1`,
      [req.userId]
    );
    if (approved.length > 0) {
      return res.json({ success: true, message: '您已通过实名认证', data: { status: 'approved' } });
    }

    // 有 pending 记录 → 提示等待（可重新提交覆盖旧的 pending/rejected）
    const [pending] = await pool.query(
      `SELECT id FROM user_verifications WHERE user_id = ? AND status = 'pending' LIMIT 1`,
      [req.userId]
    );
    if (pending.length > 0) {
      return res.json({
        success: false,
        message: '您已提交认证申请，正在审核中，请耐心等待',
        code: 'VERIFY_PENDING',
      });
    }

    // 新提交
    const [result] = await pool.query(
      `INSERT INTO user_verifications (user_id, verify_type, image_url, status) VALUES (?, ?, ?, 'pending')`,
      [req.userId, verifyType, imageUrl]
    );

    res.json({
      success: true,
      message: '认证申请已提交，等待审核',
      data: { id: result.insertId, status: 'pending', verifyType, imageUrl },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * 查询我的认证状态
 * GET /api/user/verify/status
 */
exports.getMyVerificationStatus = async (req, res, next) => {
  try {
    const pool = getPool();
    const [rows] = await pool.query(
      `SELECT * FROM user_verifications WHERE user_id = ? ORDER BY id DESC LIMIT 1`,
      [req.userId]
    );
    if (rows.length === 0) {
      return res.json({ success: true, data: { verified: false, status: 'none', records: [] } });
    }
    const latest = rows[0];
    // 附带历史记录（最近 5 条）
    const [records] = await pool.query(
      `SELECT id, verify_type, image_url, status, reject_reason, create_time, review_time
       FROM user_verifications WHERE user_id = ? ORDER BY id DESC LIMIT 5`,
      [req.userId]
    );
    res.json({
      success: true,
      data: {
        verified: latest.status === 'approved',
        status: latest.status,
        latest: {
          ...latest,
          verifyTypeLabel: TYPE_LABELS[latest.verify_type] || latest.verify_type,
        },
        records: records.map(r => ({ ...r, verifyTypeLabel: TYPE_LABELS[r.verify_type] || r.verify_type })),
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * 重新提交认证（覆盖 rejected 记录）
 * POST /api/user/verify/resubmit
 * body: { verifyType, imageUrl }
 */
exports.resubmitVerification = exports.submitVerification;

/**
 * ===== 管理端接口 =====
 */

/**
 * 认证审核列表
 * GET /api/admin/verifications?status=pending&page=1&pageSize=20
 */
exports.getVerificationList = async (req, res, next) => {
  try {
    const { status, page = 1, pageSize = 20, keyword } = req.query;
    const pool = getPool();
    const where = [];
    const params = [];
    if (status && ['pending', 'approved', 'rejected'].includes(status)) {
      where.push('v.status = ?');
      params.push(status);
    }
    if (keyword) {
      where.push('(u.nickName LIKE ? OR u.user_id_code LIKE ?)');
      params.push(`%${keyword}%`, `%${keyword}%`);
    }
    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const limit = Math.min(Math.max(parseInt(pageSize) || 20, 1), 100);
    const offset = (Math.max(parseInt(page) || 1, 1) - 1) * limit;

    const [countRows] = await pool.query(
      `SELECT COUNT(*) as total FROM user_verifications v LEFT JOIN users u ON u.id = v.user_id ${whereSql}`,
      params
    );
    const [rows] = await pool.query(
      `SELECT v.*, u.nickName, u.avatarUrl, u.user_id_code, u.school, u.realName, u.studentId
       FROM user_verifications v LEFT JOIN users u ON u.id = v.user_id
       ${whereSql} ORDER BY v.id DESC LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );
    res.json({
      success: true,
      data: {
        list: rows.map(r => ({
          ...r,
          verifyTypeLabel: TYPE_LABELS[r.verify_type] || r.verify_type,
          // 前端统一用 v.user 取用户信息
          user: {
            nickName: r.nickName,
            avatarUrl: r.avatarUrl,
            user_id_code: r.user_id_code,
            school: r.school,
            realName: r.realName,
            studentId: r.studentId,
          },
        })),
        total: countRows[0].total,
        page: parseInt(page),
        pageSize: limit,
        stats: await getVerifyStats(pool),
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * 审核通过
 * POST /api/admin/verifications/:id/approve
 */
exports.approveVerification = async (req, res, next) => {
  try {
    const pool = getPool();
    const id = req.params.id;
    const [rows] = await pool.query(`SELECT * FROM user_verifications WHERE id = ?`, [id]);
    if (rows.length === 0) throw new AppError('认证记录不存在', 404);
    const record = rows[0];
    if (record.status === 'approved') {
      return res.json({ success: true, message: '该记录已通过审核' });
    }
    await pool.query(
      `UPDATE user_verifications SET status = 'approved', review_time = NOW(), reviewer_id = ? WHERE id = ?`,
      [req.adminId || req.userId || 0, id]
    );
    // 同步 users.isVerified
    await User.findByIdAndUpdate(record.user_id, { isVerified: 1 });
    // 通知用户
    try {
      const { Notification } = require('../models');
      await Notification.create({
        recipient: record.user_id,
        sender: null,
        senderSnapshot: { nickName: '系统', avatarUrl: '' },
        type: 'verify_result',
        title: '实名认证通过',
        content: '恭喜！您的实名认证已通过，现在可以发布帖子、评论、聊天和加入拼车啦~',
        priority: 'normal',
      });
    } catch (_) { /* 通知失败不影响主流程 */ }
    res.json({ success: true, message: '认证已通过' });
  } catch (err) {
    next(err);
  }
};

/**
 * 审核拒绝
 * POST /api/admin/verifications/:id/reject
 * body: { reason }
 */
exports.rejectVerification = async (req, res, next) => {
  try {
    const pool = getPool();
    const id = req.params.id;
    const reason = (req.body && req.body.reason) || '材料不清晰，请重新上传';
    const [rows] = await pool.query(`SELECT * FROM user_verifications WHERE id = ?`, [id]);
    if (rows.length === 0) throw new AppError('认证记录不存在', 404);
    const record = rows[0];
    await pool.query(
      `UPDATE user_verifications SET status = 'rejected', reject_reason = ?, review_time = NOW(), reviewer_id = ? WHERE id = ?`,
      [reason, req.adminId || req.userId || 0, id]
    );
    await User.findByIdAndUpdate(record.user_id, { isVerified: 0 });
    try {
      const { Notification } = require('../models');
      await Notification.create({
        recipient: record.user_id,
        sender: null,
        senderSnapshot: { nickName: '系统', avatarUrl: '' },
        type: 'verify_result',
        title: '实名认证未通过',
        content: `很遗憾，您的实名认证未通过。原因：${reason}。请重新提交清晰的材料。`,
        priority: 'normal',
      });
    } catch (_) { /* ignore */ }
    res.json({ success: true, message: '已拒绝该认证' });
  } catch (err) {
    next(err);
  }
};

/**
 * 认证统计（审核台用）
 */
async function getVerifyStats(pool) {
  const [rows] = await pool.query(
    `SELECT status, COUNT(*) as c FROM user_verifications GROUP BY status`
  );
  const stats = { pending: 0, approved: 0, rejected: 0, total: 0 };
  rows.forEach(r => { stats[r.status] = r.c; stats.total += r.c; });
  return stats;
}

exports.getVerifyStats = async (req, res, next) => {
  try {
    const pool = getPool();
    res.json({ success: true, data: await getVerifyStats(pool) });
  } catch (err) { next(err); }
};

/**
 * 撤销认证（管理端强制取消用户认证资格）
 * POST /api/admin/verifications/:id/revoke
 */
exports.revokeVerification = async (req, res, next) => {
  try {
    const pool = getPool();
    const id = req.params.id;
    const [rows] = await pool.query(`SELECT * FROM user_verifications WHERE id = ?`, [id]);
    if (rows.length === 0) throw new AppError('认证记录不存在', 404);
    const record = rows[0];
    await pool.query(
      `UPDATE user_verifications SET status = 'rejected', reject_reason = ?, review_time = NOW(), reviewer_id = ? WHERE id = ?`,
      ['管理员撤销认证', req.adminId || req.userId || 0, id]
    );
    await User.findByIdAndUpdate(record.user_id, { isVerified: 0 });
    res.json({ success: true, message: '已撤销认证' });
  } catch (err) {
    next(err);
  }
};
