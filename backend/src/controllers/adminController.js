const { Admin, User, Carpool, ModulePost, Complaint, Feedback, Notification, OperationLog, DailyStat } = require('../models');
const { AppError } = require('../middleware/auth');
const { generateAdminToken } = require('../middleware/adminAuth');
const { generateToken } = require('../middleware/auth');
const bcrypt = require('bcryptjs');

// ==================== 登录相关 ====================

/**
 * 管理员登录
 * POST /api/admin/login
 */
exports.login = async (req, res, next) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      throw new AppError('用户名和密码不能为空', 400);
    }

    const admin = await Admin.findOne({ username: username.toLowerCase() });

    if (!admin) {
      throw new AppError('用户名或密码错误', 401);
    }

    if (admin.status !== 'active') {
      throw new AppError('账号已被禁用', 403);
    }

    if (admin.lockedUntil && admin.lockedUntil > new Date()) {
      const remaining = Math.ceil((admin.lockedUntil - new Date()) / 60000);
      throw new AppError(`账号已锁定，请${remaining}分钟后再试`, 403);
    }

    const isMatch = await admin.comparePassword(password);
    if (!isMatch) {
      admin.loginFailCount = (admin.loginFailCount || 0) + 1;
      if (admin.loginFailCount >= 5) {
        admin.lockedUntil = new Date(Date.now() + 30 * 60000); // 锁定30分钟
      }
      await admin.save();
      throw new AppError('用户名或密码错误', 401);
    }

    // 登录成功
    admin.loginFailCount = 0;
    admin.lockedUntil = null;
    admin.lastLoginAt = new Date();
    admin.lastLoginIp = req.ip || '';
    admin.loginCount = (admin.loginCount || 0) + 1;
    await admin.save();

    const token = generateAdminToken(admin._id);

    res.json({
      success: true,
      message: '登录成功',
      data: {
        token,
        admin: admin.toSafeObject(),
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 获取当前管理员信息
 * GET /api/admin/profile
 */
exports.getProfile = async (req, res, next) => {
  try {
    res.json({
      success: true,
      data: req.admin.toSafeObject(),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 修改密码
 * PUT /api/admin/change-password
 */
exports.changePassword = async (req, res, next) => {
  try {
    const { oldPassword, newPassword } = req.body;

    if (!oldPassword || !newPassword) {
      throw new AppError('旧密码和新密码不能为空', 400);
    }

    if (newPassword.length < 6) {
      throw new AppError('新密码至少6位', 400);
    }

    const admin = await Admin.findById(req.adminId);
    const isMatch = await admin.comparePassword(oldPassword);
    if (!isMatch) {
      throw new AppError('旧密码错误', 400);
    }

    admin.password = await bcrypt.hash(String(newPassword), 14);
    await admin.save();

    res.json({
      success: true,
      message: '密码修改成功',
    });
  } catch (error) {
    next(error);
  }
};

// ==================== 管理员管理（超管） ====================

/**
 * 创建管理员（仅超管）
 * POST /api/admin/admins
 */
exports.createAdmin = async (req, res, next) => {
  try {
    const { username, password, nickName, role, permissions, email, phone } = req.body;

    // 仅超级管理员可以创建/管理管理员账号（含审核员）
    const isSuperAdmin = req.admin && (req.admin.role === 'super_admin' || req.admin.role === 'superadmin');
    if (!isSuperAdmin) throw new AppError('仅超级管理员可以创建管理员账号', 403);

    if (!username || !password) {
      throw new AppError('用户名和密码不能为空', 400);
    }

    const allowedRoles = ['admin', 'super_admin', 'moderator'];
    const safeRole = role && allowedRoles.includes(role) ? role : 'admin';

    const existing = await Admin.findOne({ username: username.toLowerCase() });
    if (existing) {
      throw new AppError('用户名已存在', 409);
    }

    const admin = await Admin.create({
      username: username.toLowerCase(),
      password,
      nickName: nickName || username,
      role: safeRole,
      permissions: permissions || [],
      email: email || '',
      phone: phone || '',
    });

    res.status(201).json({
      success: true,
      message: '管理员创建成功',
      data: admin.toSafeObject(),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 管理员列表
 * GET /api/admin/admins
 */
exports.getAdminList = async (req, res, next) => {
  try {
    const { status, page = 1, pageSize = 20 } = req.query;

    const query = {};
    if (status) query.status = status;

    const [list, total] = await Promise.all([
      Admin.find(query)
        .sort({ createTime: -1 })
        .skip((parseInt(page) - 1) * parseInt(pageSize))
        .limit(parseInt(pageSize)),
      Admin.countDocuments(query),
    ]);

    res.json({
      success: true,
      data: {
        list: list.map((a) => {
          const o = { ...a };
          delete o.password; // 不向客户端返回密码哈希
          return o;
        }),
        total,
        page: parseInt(page),
        pageSize: parseInt(pageSize),
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 更新管理员
 * PUT /api/admin/admins/:id
 */
exports.updateAdmin = async (req, res, next) => {
  try {
    const { nickName, role, permissions, status, password, username } = req.body;
    const isSuperAdmin = req.admin && (req.admin.role === 'super_admin' || req.admin.role === 'superadmin');
    if (!isSuperAdmin) throw new AppError('仅超级管理员可以修改管理员账号信息', 403);

    const updateData = {};
    if (username) updateData.username = String(username).trim().toLowerCase();
    if (nickName) updateData.nickName = nickName;
    if (role) {
      const allowedRoles = ['admin', 'super_admin', 'moderator'];
      if (!allowedRoles.includes(role)) throw new AppError('非法的角色', 400);
      updateData.role = role;
    }
    if (permissions) updateData.permissions = permissions;
    if (status) updateData.status = status;

    const admin = await Admin.findById(req.params.id);
    if (!admin) {
      throw new AppError('管理员不存在', 404);
    }

    if (password) {
      admin.password = await bcrypt.hash(String(password), 14);
      await admin.save();
    }

    Object.assign(admin, updateData);
    await admin.save();

    res.json({
      success: true,
      message: '更新成功',
      data: admin.toSafeObject(),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 删除管理员（仅超管）
 * DELETE /api/admin/admins/:id
 */
exports.deleteAdmin = async (req, res, next) => {
  try {
    const isSuperAdmin = req.admin && (req.admin.role === 'super_admin' || req.admin.role === 'superadmin');
    if (!isSuperAdmin) throw new AppError('仅超级管理员可以删除管理员账号', 403);

    const targetId = parseInt(req.params.id, 10);
    if (targetId === req.admin.id) {
      throw new AppError('不能删除当前登录的账号', 400);
    }

    const target = await Admin.findById(req.params.id);
    if (!target) {
      throw new AppError('管理员不存在', 404);
    }
    if (target.role === 'super_admin' || target.role === 'superadmin') {
      throw new AppError('超级管理员账号不允许删除，可改为禁用', 400);
    }

    await target.deleteOne();

    res.json({
      success: true,
      message: '管理员已删除',
    });
  } catch (error) {
    next(error);
  }
};

// ==================== 用户管理 ====================

/**
 * 用户列表
 * GET /api/admin/users
 */
exports.getUserList = async (req, res, next) => {
  try {
    const {
      keyword,
      status,
      role,
      school,
      minCredit,
      maxCredit,
      sortBy = 'createTime',
      page = 1,
      pageSize = 20,
    } = req.query;

    const query = {};
    if (status) query.status = status;
    if (role) query.role = role;
    if (school) query.school = new RegExp(school, 'i');
    if (minCredit) query.creditScore = { ...query.creditScore, $gte: parseInt(minCredit) };
    if (maxCredit) query.creditScore = { ...query.creditScore, $lte: parseInt(maxCredit) };

    if (keyword) {
      const regex = new RegExp(keyword, 'i');
      query.$or = [
        { nickName: regex },
        { realName: regex },
        { phone: regex },
        { studentId: regex },
      ];
    }

    const sortMap = {
      createTime: { createTime: -1 },
      creditScore: { creditScore: -1 },
      tripCount: { tripCount: -1 },
      loginCount: { loginCount: -1 },
      lastLoginTime: { lastLoginTime: -1 },
    };

    let sort = sortMap[sortBy] || sortMap.createTime;
    // 支持 order 参数：asc 升序、desc 降序
    if (req.query.order === 'asc') {
      const key = Object.keys(sort)[0];
      sort = { [key]: 1 };
    }

    const [list, total] = await Promise.all([
      User.find(query)
        .sort(sort)
        .skip((parseInt(page) - 1) * parseInt(pageSize))
        .limit(parseInt(pageSize)),
      User.countDocuments(query),
    ]);

    // 设备信息直接取自 users.device_info（首次登录写入的 JSON 字符串）
    try {
      for (const u of list) {
        let dev = null;
        if (u.device_info) {
          try { dev = JSON.parse(u.device_info); } catch (e) { dev = null; }
        }
        u.device = dev;
      }
    } catch (e) {
      console.warn('[getUserList] 解析设备信息失败:', e.message);
    }

    res.json({
      success: true,
      data: {
        list,
        total,
        page: parseInt(page),
        pageSize: parseInt(pageSize),
        totalPages: Math.ceil(total / parseInt(pageSize)),
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 用户详情
 * GET /api/admin/users/:id
 */
exports.getUserDetail = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      throw new AppError('用户不存在', 404);
    }

    // 附加统计信息
    const pool = require('../config/db')();
    const [publishedCount, joinedCount, complaintCount] = await Promise.all([
      pool.query('SELECT COUNT(*) as cnt FROM module_posts WHERE creator_id = ? AND module = ?', [user._id, 'carpool']).then(r => r[0][0].cnt),
      pool.query("SELECT COUNT(*) as cnt FROM content_participants cp JOIN module_posts m ON m.id = cp.content_id WHERE cp.user_id = ? AND cp.status = 'joined' AND m.module = ?", [user._id, 'carpool']).then(r => r[0][0].cnt),
      require('../models').Complaint.countDocuments({
        $or: [{ complainant: user._id }, { targetUser: user._id }],
      }),
    ]);

    res.json({
      success: true,
      data: {
        ...user.toSafeObject(),
        extra: { publishedCount, joinedCount, complaintCount },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 封禁/解封用户
 * PUT /api/admin/users/:id/ban
 */
exports.toggleBan = async (req, res, next) => {
  try {
    const { action, reason } = req.body; // action: 'ban' | 'unban' | 'disable'

    const user = await User.findById(req.params.id);
    if (!user) {
      throw new AppError('用户不存在', 404);
    }

    const statusMap = {
      ban: 'banned',
      unban: 'active',
      disable: 'disabled',
    };

    const newStatus = statusMap[action];
    if (!newStatus) {
      throw new AppError('无效的操作，请使用 ban/unban/disable', 400);
    }

    user.status = newStatus;
    await user.save();

    // 记录操作日志
    const actionText = { ban: '封禁', unban: '解封', disable: '禁用' };

    // 通知用户
    if (action === 'ban' || action === 'disable') {
      await Notification.create({
        recipient: user._id,
        sender: null,
        senderSnapshot: { nickName: '系统管理员', avatarUrl: '' },
        type: 'system',
        title: action === 'ban' ? '🚫 账号已被封禁' : '⚠️ 账号已被禁用',
        content: reason || `你的账号已被${actionText[action]}，如有疑问请联系管理员`,
        priority: 'urgent',
      });
    }

    res.json({
      success: true,
      message: `用户已${actionText[action]}`,
      data: { status: newStatus },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 重置用户信用分
 * PUT /api/admin/users/:id/credit
 */
exports.resetCredit = async (req, res, next) => {
  try {
    const { score, reason } = req.body;

    if (score === undefined || score < 0 || score > 110) {
      throw new AppError('信用分必须在0-110之间', 400);
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      throw new AppError('用户不存在', 404);
    }

    const oldScore = user.creditScore;
    user.creditScore = parseInt(score);
    await user.save();

    // 通知用户
    await Notification.create({
      recipient: user._id,
      sender: null,
      senderSnapshot: { nickName: '系统管理员', avatarUrl: '' },
      type: 'credit_change',
      title: '信用分已调整',
      content: reason || `你的信用分已从 ${oldScore} 调整为 ${score}`,
      priority: 'normal',
      extraData: { oldScore, newScore: score, reason },
    });

    res.json({
      success: true,
      message: '信用分已更新',
      data: { oldScore, newScore: score },
    });
  } catch (error) {
    next(error);
  }
};

// ==================== 拼车管理 ====================

/**
 * 修改用户信息（昵称/头像）
 * PUT /api/admin/users/:id
 */
exports.updateUser = async (req, res, next) => {
  try {
    const { nickName, avatarUrl } = req.body;

    const user = await User.findById(req.params.id);
    if (!user) {
      throw new AppError('用户不存在', 404);
    }

    const changes = {};
    if (nickName !== undefined && nickName.trim()) {
      changes.nickName = nickName.trim();
      user.nickName = nickName.trim();
    }
    if (avatarUrl !== undefined) {
      changes.avatarUrl = avatarUrl;
      user.avatarUrl = avatarUrl;
    }

    if (Object.keys(changes).length === 0) {
      throw new AppError('没有可更新的字段', 400);
    }

    await user.save();

    res.json({
      success: true,
      message: '用户信息已更新',
      data: changes,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 重置用户数据（将所有统计数据恢复默认值）
 * PUT /api/admin/users/:id/reset
 */
exports.resetUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      throw new AppError('用户不存在', 404);
    }

    const oldStats = {
      creditScore: user.creditScore,
      tripCount: user.tripCount,
      publishCount: user.publishCount,
      joinCount: user.joinCount,
      cancelCount: user.cancelCount,
      totalReviews: user.totalReviews,
      positiveReviews: user.positiveReviews,
      goodRate: user.goodRate,
      loginCount: user.loginCount,
    };

    user.creditScore = 100;
    user.tripCount = 0;
    user.publishCount = 0;
    user.joinCount = 0;
    user.cancelCount = 0;
    user.totalReviews = 0;
    user.positiveReviews = 0;
    user.goodRate = 100;
    user.loginCount = 0;
    user.banReason = '';
    user.banUntil = null;
    user.status = 'active';
    await user.save();

    // 通知用户
    await Notification.create({
      recipient: user._id,
      sender: null,
      senderSnapshot: { nickName: '系统管理员', avatarUrl: '' },
      type: 'system',
      title: '账号数据已重置',
      content: '管理员已重置你的账号统计数据，信用分已恢复为100分。',
      priority: 'normal',
    });

    res.json({
      success: true,
      message: '用户数据已重置',
      data: { oldStats, newStats: { creditScore: 100, tripCount: 0, publishCount: 0, joinCount: 0, cancelCount: 0, totalReviews: 0, positiveReviews: 0, goodRate: 100, loginCount: 0, status: 'active' } },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 删除用户（及关联数据）
 * DELETE /api/admin/users/:id
 */
exports.deleteUser = async (req, res, next) => {
  try {
    const { models } = require('../models');
    const user = await User.findById(req.params.id);
    if (!user) {
      throw new AppError('用户不存在', 404);
    }

    const userId = user._id;
    const userNick = user.nickName || '未知用户';

    // 清理关联数据
    const pool = require('../config/db')();
    await Promise.all([
      pool.query('DELETE FROM notifications WHERE recipient_id = ?', [userId]),
      pool.query('DELETE FROM messages WHERE sender_id = ? OR receiver_id = ?', [userId, userId]),
      pool.query('DELETE FROM reviews WHERE reviewer_id = ? OR targetUser_id = ?', [userId, userId]),
      pool.query('DELETE FROM favorites WHERE user_id = ?', [userId]),
      pool.query('DELETE FROM complaints WHERE complainant_id = ? OR targetUser_id = ?', [userId, userId]),
      pool.query('DELETE FROM feedbacks WHERE user_id = ?', [userId]),
      pool.query('DELETE FROM user_remarks WHERE user_id = ?', [userId]),
      pool.query('DELETE FROM module_posts WHERE creator_id = ?', [userId]),
      pool.query('DELETE FROM module_replies WHERE user_id = ?', [userId]),
      pool.query('DELETE FROM module_favorites WHERE user_id = ?', [userId]),
      pool.query('DELETE FROM content_participants WHERE user_id = ?', [userId]),
      pool.query('DELETE FROM carpools WHERE creator_id = ?', [userId]),
    ]);

    // 删除用户
    await user.deleteOne();

    res.json({
      success: true,
      message: `用户「${userNick}」已删除`,
    });
  } catch (error) {
    next(error);
  }
};

// ==================== 投诉管理 ====================

/**
 * 投诉列表
 * GET /api/admin/complaints
 */
exports.getComplaintList = async (req, res, next) => {
  try {
    const { status, category, severity, page = 1, pageSize = 20 } = req.query;

    const query = {};
    if (status) query.status = status;
    if (category) query.category = category;
    if (severity) query.severity = severity;

    const pageNum = parseInt(page);
    const pageSizeNum = parseInt(pageSize);
    const [list, total, pendingCount] = await Promise.all([
      Complaint.find(query)
        .sort({ severity: -1, createTime: -1 })
        .skip((pageNum - 1) * pageSizeNum)
        .limit(pageSizeNum)
        .populate('complainant', 'nickName phone')
        .populate('targetUser', 'nickName phone creditScore')
        .populate('handler', 'nickName'),
      Complaint.countDocuments(query),
      Complaint.countDocuments({ ...query, status: 'pending' }),
    ]);

    res.json({
      success: true,
      data: {
        list,
        total,
        pendingCount,
        page: pageNum,
        pageSize: pageSizeNum,
        totalPages: Math.ceil(total / pageSizeNum),
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 处理投诉（回复+处罚）
 * PUT /api/admin/complaints/:id/handle
 */
exports.handleComplaint = async (req, res, next) => {
  try {
    const { id } = req.params;
    // 兼容前端发送的字段名：action=处理动作, result=处理结果, penalty=惩罚类型(字符串)
    // 后端标准字段名：status, handlerNote, resolution, penalty(object)
    const action = req.body.action || req.body.status;
    const result = req.body.result || '';
    let penalty = req.body.penalty;

    // 如果 penalty 是字符串，转换为对象格式
    if (penalty && typeof penalty === 'string') {
      penalty = { type: penalty };
      if (penalty.type === 'temp_ban') {
        penalty.banDuration = parseInt(req.body.penaltyDays) || 7;
      }
      if (penalty.type === 'credit_deduct') {
        penalty.creditDeduct = parseInt(req.body.penaltyCredit) || 10;
      }
    }

    const complaint = await Complaint.findById(id);
    if (!complaint) {
      throw new AppError('投诉不存在', 404);
    }

    complaint.status = action || complaint.status;
    complaint.handlerNote = result || complaint.handlerNote;
    complaint.resolution = result || complaint.resolution;
    complaint.handler = req.adminId;
    complaint.handledAt = new Date();

    // 执行处罚
    if (penalty && penalty.type && penalty.type !== 'none' && complaint.targetUser) {
      complaint.penalty = penalty;
      const targetUserId = complaint.targetUser; // rowToObject 已将 targetUser_id 映射为 targetUser（数字ID）
      const targetUser = await User.findById(targetUserId);

      if (targetUser) {
        switch (penalty.type) {
          case 'warning':
            await Notification.create({
              recipient: targetUser._id,
              sender: null,
              senderSnapshot: { nickName: '系统管理员', avatarUrl: '' },
              type: 'system',
              title: '违规警告',
              content: `你因违规行为被警告。${penalty.reason || ''}`,
              priority: 'high',
            });
            break;
          case 'credit_deduct':
            const deduct = penalty.creditDeduct || 5;
            const oldCredit = targetUser.creditScore || 100;
            targetUser.creditScore = Math.max(0, oldCredit - deduct);
            await Notification.create({
              recipient: targetUser._id,
              sender: null,
              senderSnapshot: { nickName: '系统管理员', avatarUrl: '' },
              type: 'credit_change',
              title: '信用分扣减',
              content: `因违规行为，信用分被扣除 ${deduct} 分。原因：${penalty.reason || '违规'}。如有问题请联系管理员。`,
              priority: 'high',
              extraData: { oldScore: oldCredit, newScore: targetUser.creditScore, deduct, reason: penalty.reason },
            });
            break;
          case 'temp_ban':
            targetUser.status = 'disabled';
            const banDays = penalty.banDuration || 7;
            targetUser.banUntil = new Date(Date.now() + banDays * 24 * 60 * 60 * 1000);
            break;
          case 'perm_ban':
          case 'permanent_ban':
            targetUser.status = 'banned';
            targetUser.banReason = penalty.reason || '欺诈诈骗等严重违规';
            await Notification.create({
              recipient: targetUser._id,
              sender: null,
              senderSnapshot: { nickName: '系统管理员', avatarUrl: '' },
              type: 'system',
              title: '账号已封禁',
              content: `因欺诈诈骗等严重违规行为，你的账号已被永久封禁。如有问题请联系管理员。`,
              priority: 'urgent',
            });
            break;
        }
        await targetUser.save();
      }
    }

    // 添加时间线
    if (!complaint.timeline) complaint.timeline = [];
    complaint.timeline.push({
      action: 'admin_handle',
      operator: req.adminId,
      operatorName: req.admin.nickName,
      note: result || action || '管理员处理',
    });

    await complaint.save();

    // 通知投诉人
    await Notification.create({
      recipient: complaint.complainant,
      sender: null,
      senderSnapshot: { nickName: '系统管理员', avatarUrl: '' },
      type: 'system',
      title: '投诉处理进度更新',
      content: `你的投诉「${complaint.title}」已有处理结果：${result || '已处理'}`,
      priority: 'normal',
    });

    res.json({
      success: true,
      message: '处理成功',
      data: complaint,
    });
  } catch (error) {
    next(error);
  }
};

// ==================== 反馈管理 ====================

/**
 * 反馈列表
 * GET /api/admin/feedback
 */
exports.getFeedbackList = async (req, res, next) => {
  try {
    const { status, category, page = 1, pageSize = 20 } = req.query;

    const query = {};
    if (status) query.status = status;
    if (category) query.category = category;

    const [list, total] = await Promise.all([
      Feedback.find(query)
        .sort({ priority: -1, createTime: -1 })
        .skip((parseInt(page) - 1) * parseInt(pageSize))
        .limit(parseInt(pageSize))
        .populate('user', 'nickName phone')
        .populate('handler', 'nickName'),
      Feedback.countDocuments(query),
    ]);

    res.json({
      success: true,
      data: { list, total, page: parseInt(page), pageSize: parseInt(pageSize) },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 处理反馈
 * PUT /api/admin/feedback/:id/handle
 */
exports.handleFeedback = async (req, res, next) => {
  try {
    const { status, handlerNote, resolveNote, priority } = req.body;

    const updateData = { handler: req.adminId };
    if (status) updateData.status = status;
    if (handlerNote) updateData.handlerNote = handlerNote;
    if (resolveNote) updateData.resolveNote = resolveNote;
    if (priority) updateData.priority = priority;

    if (['resolved', 'rejected', 'closed'].includes(status)) {
      updateData.handledAt = new Date();
    }

    const feedback = await Feedback.findByIdAndUpdate(req.params.id, updateData, { new: true });

    if (!feedback) {
      throw new AppError('反馈不存在', 404);
    }

    // 通知用户
    if (resolveNote && feedback.user) {
      await Notification.create({
        recipient: feedback.user,
        sender: null,
        senderSnapshot: { nickName: '系统管理员', avatarUrl: '' },
        type: 'system',
        title: '反馈处理回复',
        content: `你的反馈「${feedback.title}」已收到回复：${resolveNote}`,
        priority: 'normal',
      });
    }

    res.json({
      success: true,
      message: '处理成功',
      data: feedback,
    });
  } catch (error) {
    next(error);
  }
};

// ==================== 数据统计 ====================

/**
 * 仪表盘概览
 * GET /api/admin/dashboard
 */
exports.dashboard = async (req, res, next) => {
  try {
    const pool = require('../config/db')();
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo = new Date(today.getTime() - 7 * 24 * 3600 * 1000);

    const [
      [totalUsersR], [newUsersTodayR], [newUsersWeekR],
      [totalCarpoolsR], [newCarpoolsTodayR], [newCarpoolsWeekR],
      [activeCarpoolsR], [joinCountR], [todayJoinCountR],
      [totalComplaintsR], [pendingComplaintsR],
      [totalReviewsR], [avgRatingR]
    ] = await Promise.all([
      pool.query('SELECT COUNT(*) as cnt FROM users'),
      pool.query('SELECT COUNT(*) as cnt FROM users WHERE createTime >= ?', [today]),
      pool.query('SELECT COUNT(*) as cnt FROM users WHERE createTime >= ?', [weekAgo]),
      pool.query("SELECT COUNT(*) as cnt FROM module_posts WHERE module = 'carpool'"),
      pool.query("SELECT COUNT(*) as cnt FROM module_posts WHERE module = 'carpool' AND createTime >= ?", [today]),
      pool.query("SELECT COUNT(*) as cnt FROM module_posts WHERE module = 'carpool' AND createTime >= ?", [weekAgo]),
      pool.query("SELECT COUNT(*) as cnt FROM module_posts WHERE module = 'carpool' AND status IN ('active', 'full')"),
      pool.query("SELECT COUNT(*) as cnt FROM content_participants WHERE status = 'joined'"),
      pool.query("SELECT COUNT(*) as cnt FROM content_participants WHERE status = 'joined' AND joinTime >= ?", [today]),
      pool.query('SELECT COUNT(*) as cnt FROM complaints'),
      pool.query("SELECT COUNT(*) as cnt FROM complaints WHERE status = 'pending'"),
      pool.query('SELECT COUNT(*) as cnt FROM reviews'),
      pool.query('SELECT AVG(rating) as avg FROM reviews'),
    ]);

    const totalUsers = totalUsersR[0].cnt;
    const newUsersToday = newUsersTodayR[0].cnt;
    const newUsersWeek = newUsersWeekR[0].cnt;
    const totalCarpools = totalCarpoolsR[0].cnt;
    const newCarpoolsToday = newCarpoolsTodayR[0].cnt;
    const newCarpoolsWeek = newCarpoolsWeekR[0].cnt;
    const activeCarpools = activeCarpoolsR[0].cnt;
    const joinCount = joinCountR[0].cnt;
    const todayJoinCount = todayJoinCountR[0].cnt;
    const totalComplaints = totalComplaintsR[0].cnt;
    const pendingComplaints = pendingComplaintsR[0].cnt;
    const totalReviews = totalReviewsR[0].cnt;
    const avgRatingVal = avgRatingR[0].avg || 0;

    const dateStr = today.toISOString().slice(0, 10);
    const DailyStat = require('../models').DailyStat;
    const todayStat = await DailyStat.findOne({ date: dateStr }) || {};

    res.json({
      success: true,
      data: {
        overview: {
          totalUsers,
          newUsersToday,
          newUsersWeek,
          totalCarpools,
          newCarpoolsToday,
          newCarpoolsWeek,
          activeCarpools,
          totalJoins: joinCount,
          newJoinsToday: todayJoinCount,
          totalComplaints,
          pendingComplaints,
          totalReviews,
          avgRating: Math.round(avgRatingVal * 10) / 10,
        },
        todayStat,
      },
    });
  } catch (error) {
    next(error);
  }
};

exports.getTrend = async (req, res, next) => {
  try {
    const { days = 30 } = req.query;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));
    const startStr = startDate.toISOString().slice(0, 10);

    const stats = await DailyStat.find({
      date: { $gte: startStr },
    }).sort({ date: 1 });

    // 补充缺失日期
    const result = [];
    let current = new Date(startDate);
    const endDate = new Date();
    const statMap = {};
    stats.forEach((s) => {
      // mysql2 返回 DATE 为 UTC 午夜的 Date 对象，需要转回本地日期字符串
      const d = new Date(s.date);
      const k = d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
      statMap[k] = s;
    });

    while (current <= endDate) {
      const dateStr = current.toISOString().slice(0, 10);
      const stat = statMap[dateStr];
      result.push({
        date: dateStr,
        newUsers: stat?.newUsers || 0,
        newCarpools: stat?.newCarpools || 0,
        joinCount: stat?.joinCount || 0,
        newComplaints: stat?.newComplaints || 0,
      });
      current.setDate(current.getDate() + 1);
    }

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 热门路线报表
 * GET /api/admin/stats/hot-routes
 */
exports.getHotRoutes = async (req, res, next) => {
  try {
    const pool = require('../config/db')();
    const { days = 30, limit = 20 } = req.query;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));

    const [routes] = await pool.query(
      `SELECT JSON_UNQUOTE(JSON_EXTRACT(m.extra, '$.from')) as \`from\`,
              JSON_UNQUOTE(JSON_EXTRACT(m.extra, '$.to')) as \`to\`,
              COUNT(*) as count, AVG(m.price) as avgPrice,
              AVG(CAST(JSON_UNQUOTE(JSON_EXTRACT(m.extra, '$.totalSeats')) AS UNSIGNED)) as avgSeats,
              COUNT(cp.id) as totalParticipants
       FROM module_posts m
       LEFT JOIN content_participants cp ON cp.content_id = m.id AND cp.status = 'joined'
       WHERE m.module = 'carpool' AND m.createTime >= ? AND m.status NOT IN ('cancelled', 'expired')
       GROUP BY \`from\`, \`to\`
       ORDER BY count DESC
       LIMIT ?`,
      [startDate, parseInt(limit)]
    );

    res.json({
      success: true,
      data: routes.map(r => ({
        from: r.from,
        to: r.to,
        count: r.count,
        avgPrice: Math.round(r.avgPrice * 100) / 100,
        avgSeats: Math.round(r.avgSeats * 10) / 10,
        totalParticipants: r.totalParticipants,
      })),
    });
  } catch (error) {
    next(error);
  }
};

exports.getUserGrowth = async (req, res, next) => {
  try {
    const pool = require('../config/db')();
    const { days = 30 } = req.query;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));

    const [growth] = await pool.query(
      'SELECT DATE(createTime) as date, COUNT(*) as count FROM users WHERE createTime >= ? GROUP BY DATE(createTime) ORDER BY date',
      [startDate]
    );

    res.json({ success: true, data: growth });
  } catch (error) {
    next(error);
  }
};

exports.getTypeDistribution = async (req, res, next) => {
  try {
    const pool = require('../config/db')();
    const [typeDist] = await pool.query("SELECT type as _id, COUNT(*) as count FROM module_posts WHERE module = 'carpool' GROUP BY type");
    const [statusDist] = await pool.query("SELECT status as _id, COUNT(*) as count FROM module_posts WHERE module = 'carpool' GROUP BY status");
    const [schoolDist] = await pool.query('SELECT school as _id, COUNT(*) as count FROM users GROUP BY school ORDER BY count DESC LIMIT 10');

    res.json({
      success: true,
      data: {
        typeDistribution: typeDist,
        statusDistribution: statusDist,
        schoolDistribution: schoolDist,
      },
    });
  } catch (error) {
    next(error);
  }
};

exports.getLogs = async (req, res, next) => {
  try {
    const { module, action, operatorId, page = 1, pageSize = 50 } = req.query;

    const query = {};
    if (module) query.module = module;
    if (action) query.action = action;
    const isSuperAdmin = req.admin && (req.admin.role === 'super_admin' || req.admin.role === 'superadmin');
    if (!isSuperAdmin) query.operator = req.adminId;
    else if (operatorId) query.operator = operatorId;

    const [list, total] = await Promise.all([
      OperationLog.find(query)
        .sort({ createTime: -1 })
        .skip((parseInt(page) - 1) * parseInt(pageSize))
        .limit(parseInt(pageSize))
        .populate('operator', 'nickName role'),
      OperationLog.countDocuments(query),
    ]);

    res.json({
      success: true,
      data: { list, total, page: parseInt(page), pageSize: parseInt(pageSize) },
    });
  } catch (error) {
    next(error);
  }
};

// ==================== IP 风控管理 ====================

/**
 * IP 风控列表
 * GET /api/admin/ip-records
 */
exports.getIpRecords = async (req, res, next) => {
  try {
    const { isBlocked, page = 1, pageSize = 50 } = req.query;

    const query = {};
    if (isBlocked !== undefined) query.isBlocked = isBlocked === 'true';

    const { IpRecord } = require('../models');
    const [list, total] = await Promise.all([
      IpRecord.find(query)
        .sort({ riskScore: -1, lastRequestAt: -1 })
        .skip((parseInt(page) - 1) * parseInt(pageSize))
        .limit(parseInt(pageSize)),
      IpRecord.countDocuments(query),
    ]);

    res.json({
      success: true,
      data: { list, total, page: parseInt(page), pageSize: parseInt(pageSize) },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 手动封锁/解封 IP
 * PUT /api/admin/ip-records/:ip/toggle
 */
exports.toggleIpBlock = async (req, res, next) => {
  try {
    const { action } = req.body; // 'block' | 'unblock'
    const { IpRecord } = require('../models');
    const ipGuard = require('../services/ipGuard');

    if (action === 'block') {
      await ipGuard.blockIp(req.params.ip, '管理员手动封锁');
    } else if (action === 'unblock') {
      await ipGuard.unblockIp(req.params.ip);
    } else {
      throw new AppError('无效操作', 400);
    }

    res.json({
      success: true,
      message: action === 'block' ? 'IP已封锁' : 'IP已解封',
    });
  } catch (error) {
    next(error);
  }
};

// ==================== 敏感词管理 ====================

/**
 * 敏感词列表
 * GET /api/admin/sensitive-words
 */
exports.getSensitiveWords = async (req, res, next) => {
  try {
    const { category, enabled, page = 1, pageSize = 50 } = req.query;

    const query = {};
    if (category) query.category = category;
    if (enabled !== undefined) query.enabled = enabled === 'true';

    const { SensitiveWord } = require('../models');
    const [list, total] = await Promise.all([
      SensitiveWord.find(query).sort({ createTime: -1 })
        .skip((parseInt(page) - 1) * parseInt(pageSize))
        .limit(parseInt(pageSize)),
      SensitiveWord.countDocuments(query),
    ]);

    res.json({
      success: true,
      data: { list, total, page: parseInt(page), pageSize: parseInt(pageSize) },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 添加敏感词
 * POST /api/admin/sensitive-words
 */
exports.addSensitiveWord = async (req, res, next) => {
  try {
    const { word, level, category, replacement } = req.body;

    if (!word) {
      throw new AppError('敏感词不能为空', 400);
    }

    const sensitiveFilter = require('../services/sensitiveFilter');
    const result = await sensitiveFilter.addWord(word, level || 'block', category || 'other', replacement);

    res.status(201).json({
      success: true,
      message: '敏感词添加成功',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 删除/禁用敏感词
 * DELETE /api/admin/sensitive-words/:id
 */
exports.removeSensitiveWord = async (req, res, next) => {
  try {
    const { SensitiveWord } = require('../models');
    const word = await SensitiveWord.findByIdAndUpdate(
      req.params.id,
      { enabled: false },
      { new: true }
    );

    if (!word) {
      throw new AppError('敏感词不存在', 404);
    }

    const sensitiveFilter = require('../services/sensitiveFilter');
    await sensitiveFilter.removeWord(word.word);

    res.json({
      success: true,
      message: '敏感词已禁用',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 每日统计快照（手动触发）
 * POST /api/admin/stats/snapshot
 */
// ==================== 模块帖子管理 ====================

/**
 * 模块帖子列表（管理端）
 * GET /api/admin/modules
 */
exports.getModuleList = async (req, res, next) => {
  try {
    const { module, keyword, status, auditStatus, page = 1, pageSize = 15 } = req.query;
    const pool = require('../config/db')();

    let whereSql = 'WHERE 1=1';
    const values = [];

    if (module) {
      whereSql += ' AND m.module = ?';
      values.push(module);
    }
    if (status) {
      whereSql += ' AND m.status = ?';
      values.push(status);
    }
    if (auditStatus) {
      whereSql += ' AND m.auditStatus = ?';
      values.push(auditStatus);
    }
    if (keyword) {
      whereSql += ' AND (m.title LIKE ? OR m.content LIKE ? OR m.contact LIKE ? OR JSON_UNQUOTE(JSON_EXTRACT(m.extra, \'$.from\')) LIKE ? OR JSON_UNQUOTE(JSON_EXTRACT(m.extra, \'$.to\')) LIKE ?)';
      const kw = `%${keyword}%`;
      values.push(kw, kw, kw, kw, kw);
    }

    const [[{ total }]] = await pool.query(
      `SELECT COUNT(*) as total FROM module_posts m ${whereSql}`, values
    );

    const offset = (parseInt(page) - 1) * parseInt(pageSize);
    const [rows] = await pool.query(
      `SELECT m.* FROM module_posts m ${whereSql}
       ORDER BY (m.auditStatus = 'pending') DESC, m.createTime DESC LIMIT ? OFFSET ?`,
      [...values, parseInt(pageSize), offset]
    );

    // 格式化输出
    const list = rows.map(r => {
      const item = {
        id: r.id,
        _id: r.id,
        module: r.module,
        type: r.type,
        title: r.title,
        content: r.content ? r.content.substring(0, 100) : '',
        contact: r.contact,
        price: r.price,
        status: r.status,
        auditStatus: r.auditStatus || 'approved',
        auditReason: r.auditReason || '',
        viewCount: r.viewCount || 0,
        replyCount: r.replyCount || 0,
        favoriteCount: r.favoriteCount || 0,
        creator: {
          id: r.creator_id,
          nickName: r.creator_nickName || '',
          avatarUrl: r.creator_avatarUrl || '',
          creditScore: r.creator_creditScore || 100,
        },
        createTime: r.createTime,
        updateTime: r.updateTime,
      };
      // 拼车类帖子（已并入 module_posts，统一在此解析特有字段）
      if (r.module === 'carpool') {
        const extra = (typeof r.extra === 'string') ? JSON.parse(r.extra || '{}') : (r.extra || {});
        item.from = extra.from || '';
        item.to = extra.to || '';
        item.departureTime = extra.departureTime || null;
        item.totalSeats = extra.totalSeats ?? 0;
        item.remainSeats = extra.remainSeats ?? 0;
        item.joinedCount = (extra.totalSeats ?? 0) - (extra.remainSeats ?? 0);
        item.note = r.content || '';
      }
      return item;
    });

    res.json({
      success: true,
      data: { list, total, page: parseInt(page), pageSize: parseInt(pageSize), totalPages: Math.ceil(total / parseInt(pageSize)) },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 模块帖子详情
 * GET /api/admin/modules/:id
 */
exports.getModuleDetail = async (req, res, next) => {
  try {
    const pool = require('../config/db')();
    // 兼容 legacyCarpoolId（旧拼车表迁移过来的帖子）
    const [rows] = await pool.query(
      'SELECT * FROM module_posts WHERE id = ? OR legacyCarpoolId = ? LIMIT 1',
      [req.params.id, req.params.id]
    );
    if (rows.length === 0) {
      throw new AppError('帖子不存在', 404);
    }
    const r = rows[0];

    // 获取回复列表
    const [replies] = await pool.query(
      'SELECT * FROM module_replies WHERE post_id = ? ORDER BY createTime ASC',
      [r.id]
    );

    const post = {
      id: r.id,
      _id: r.id,
      module: r.module,
      type: r.type,
      title: r.title,
      content: r.content,
      contact: r.contact,
      price: r.price,
      images: typeof r.images === 'string' ? JSON.parse(r.images || '[]') : (r.images || []),
      tags: typeof r.tags === 'string' ? JSON.parse(r.tags || '[]') : (r.tags || []),
      extra: typeof r.extra === 'string' ? JSON.parse(r.extra || '{}') : (r.extra || {}),
      status: r.status,
      auditStatus: r.auditStatus || 'approved',
      auditReason: r.auditReason || '',
      viewCount: r.viewCount || 0,
      replyCount: r.replyCount || 0,
      favoriteCount: r.favoriteCount || 0,
      creator: {
        id: r.creator_id,
        nickName: r.creator_nickName || '',
        avatarUrl: r.creator_avatarUrl || '',
        creditScore: r.creator_creditScore || 100,
        school: r.creator_school || '',
      },
      createTime: r.createTime,
      updateTime: r.updateTime,
      replies: replies.map(rp => ({
        id: rp.id,
        content: rp.content,
        user: {
          id: rp.user_id,
          nickName: rp.user_nickName || '',
          avatarUrl: rp.user_avatarUrl || '',
        },
        isDeleted: !!rp.isDeleted,
        createTime: rp.createTime,
      })),
    };

    // 拼车类帖子（已并入 module_posts）：补充拼车特有字段 + 参与者列表
    if (r.module === 'carpool') {
      const extra = post.extra || {};
      post.from = extra.from || '';
      post.to = extra.to || '';
      post.departureTime = extra.departureTime || null;
      post.totalSeats = extra.totalSeats ?? 0;
      post.remainSeats = extra.remainSeats ?? 0;
      post.note = r.content || '';
      post.legacyCarpoolId = r.legacyCarpoolId || null;
      const [participants] = await pool.query(
        `SELECT cp.*, u.nickName AS user_nickName, u.phone AS user_phone
         FROM content_participants cp
         LEFT JOIN users u ON u.id = cp.user_id
         WHERE cp.content_id = ?
         ORDER BY cp.joinTime ASC`,
        [r.id]
      );
      post.participants = participants.map(p => ({
        userId: p.user_id,
        nickName: p.user_nickName || '',
        phone: p.user_phone || '',
        status: p.status,
        joinTime: p.joinTime,
      }));
    }

    res.json({ success: true, data: post });
  } catch (error) {
    next(error);
  }
};

/**
 * 审核模块帖子
 * PUT /api/admin/modules/:id/audit
 * body: { action: 'approve'|'reject', reason?: string }
 */
exports.auditModule = async (req, res, next) => {
  try {
    const { action, reason } = req.body;
    if (!['approve', 'reject'].includes(action)) {
      throw new AppError('无效的操作', 400);
    }
    const pool = require('../config/db')();
    // 兼容 legacyCarpoolId（旧拼车表迁移过来的帖子）
    const [rows] = await pool.query(
      'SELECT * FROM module_posts WHERE id = ? OR legacyCarpoolId = ? LIMIT 1',
      [req.params.id, req.params.id]
    );
    if (rows.length === 0) {
      throw new AppError('帖子不存在', 404);
    }
    const r = rows[0];
    const isCarpool = r.module === 'carpool';
    const extra = (typeof r.extra === 'string') ? JSON.parse(r.extra || '{}') : (r.extra || {});
    const route = isCarpool ? `${extra.from || ''} → ${extra.to || ''}` : (r.title || '');
    const relatedCarpoolId = isCarpool ? (r.legacyCarpoolId || r.id) : null;

    if (action === 'approve') {
      await pool.query(
        "UPDATE module_posts SET auditStatus = 'approved', auditReason = ?, status = IF(status = 'cancelled', 'active', status) WHERE id = ?",
        [reason || '', req.params.id]
      );
    } else {
      await pool.query(
        "UPDATE module_posts SET auditStatus = 'rejected', auditReason = ?, status = IF(module = 'carpool', 'cancelled', status) WHERE id = ?",
        [reason || '不符合发布规范', req.params.id]
      );
      // 通知发布者（拼车用 carpool_cancelled 类型，其余用 module_status_change）
      const Notification = require('../models/Notification').default || require('../models/Notification');
      try {
        const notifyData = {
          recipient: r.creator_id,
          sender: null,
          senderSnapshot: { nickName: '系统管理员', avatarUrl: '' },
          type: isCarpool ? 'carpool_cancelled' : 'module_status_change',
          title: isCarpool ? '拼车审核未通过' : '帖子审核未通过',
          content: `你发布的「${route}」审核未通过：${reason || '不符合发布规范'}`,
          priority: 'high',
        };
        if (isCarpool) notifyData.relatedCarpool = relatedCarpoolId;
        await Notification.create(notifyData);
      } catch (notifyErr) {
        console.error('[auditModule] 通知发送失败:', notifyErr.message);
      }
    }

    res.json({
      success: true,
      message: action === 'approve' ? '审核通过' : '已拒绝',
      data: { id: r.id, auditStatus: action === 'approve' ? 'approved' : 'rejected' },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 下架/删除模块帖子
 * PUT /api/admin/modules/:id/takedown
 */
exports.takedownModule = async (req, res, next) => {
  try {
    const { reason } = req.body;
    const pool = require('../config/db')();
    const [rows] = await pool.query(
      'SELECT * FROM module_posts WHERE id = ? OR legacyCarpoolId = ? LIMIT 1',
      [req.params.id, req.params.id]
    );
    if (rows.length === 0) {
      throw new AppError('帖子不存在', 404);
    }
    const r = rows[0];
    const isCarpool = r.module === 'carpool';
    const extra = (typeof r.extra === 'string') ? JSON.parse(r.extra || '{}') : (r.extra || {});
    const route = isCarpool ? `${extra.from || ''} → ${extra.to || ''}` : (r.title || '');
    const relatedCarpoolId = isCarpool ? (r.legacyCarpoolId || r.id) : null;

    await pool.query(
      "UPDATE module_posts SET status = 'cancelled', auditReason = ? WHERE id = ?",
      [`管理员下架：${reason || '违规内容'}`, req.params.id]
    );

    // 通知发布者
    const Notification = require('../models/Notification').default || require('../models/Notification');
    try {
      const notifyData = {
        recipient: r.creator_id,
        sender: null,
        senderSnapshot: { nickName: '系统管理员', avatarUrl: '' },
        type: isCarpool ? 'carpool_cancelled' : 'module_status_change',
        title: isCarpool ? '拼车已被下架' : '帖子已被下架',
        content: `你发布的「${route}」已被管理员下架。原因：${reason || '违反平台规则'}`,
        priority: isCarpool ? 'urgent' : 'high',
      };
      if (isCarpool) notifyData.relatedCarpool = relatedCarpoolId;
      await Notification.create(notifyData);
    } catch (notifyErr) {
      console.error('[takedownModule] 通知发送失败:', notifyErr.message);
    }

    // 拼车：额外通知所有已加入的参与者
    if (isCarpool) {
      try {
        const [participants] = await pool.query(
          "SELECT user_id FROM content_participants WHERE content_id = ? AND status = 'joined'",
          [r.id]
        );
        for (const p of participants) {
          await pool.query(
            "INSERT INTO notifications (recipient_id, sender_id, sender_nickName, sender_avatarUrl, type, title, content, priority, relatedCarpool_id, relatedPost_id) VALUES (?, NULL, '系统管理员', '', 'carpool_cancelled', ?, ?, 'high', ?, ?)",
            [p.user_id, '参与的拼车已下架', `你参与的「${route}」已被管理员下架`, relatedCarpoolId, r.id]
          );
        }
      } catch (partErr) {
        console.error('[takedownModule] 参与者通知失败:', partErr.message);
      }
    }

    res.json({ success: true, message: '帖子已下架' });
  } catch (error) {
    next(error);
  }
};

// ==================== 聊天/消息管理 ====================

/**
 * 私信会话列表（管理端）
 * GET /api/admin/messages/conversations
 */
exports.getConversations = async (req, res, next) => {
  try {
    const { keyword, page = 1, pageSize = 20 } = req.query;
    const pool = require('../config/db')();

    // 获取所有1对1会话（排除群聊）
    let whereExtra = '';
    const values = [];

    if (keyword) {
      whereExtra = ` AND (u1.nickName LIKE ? OR u2.nickName LIKE ?)`;
      const kw = `%${keyword}%`;
      values.push(kw, kw);
    }

    // 先获取所有会话的最新消息
    const [conversations] = await pool.query(`
      SELECT 
        m.conversation_id,
        MAX(m.createTime) as lastTime,
        COUNT(*) as totalMessages,
        SUM(CASE WHEN m.isRead = 0 AND m.isRecalled = 0 THEN 1 ELSE 0 END) as unreadCount,
        SUBSTRING_INDEX(m.conversation_id, '_', 1) as user1_id,
        SUBSTRING_INDEX(m.conversation_id, '_', -1) as user2_id
      FROM messages m
      WHERE m.conversation_id NOT LIKE 'carpool\\_%' ESCAPE '\\\\'
      GROUP BY m.conversation_id
      ORDER BY lastTime DESC
    `);

    // 获取每个会话的用户信息和最后一条消息
    const result = [];
    for (const conv of conversations) {
      const [[lastMsg]] = await pool.query(
        `SELECT m.*, u.nickName as sender_nickName, u.avatarUrl as sender_avatarUrl
         FROM messages m LEFT JOIN users u ON m.sender_id = u.id
         WHERE m.conversation_id = ? AND m.isRecalled = 0
         ORDER BY m.createTime DESC LIMIT 1`,
        [conv.conversation_id]
      );

      const [[user1]] = await pool.query(
        'SELECT id, nickName, avatarUrl, status, creditScore FROM users WHERE id = ?',
        [conv.user1_id]
      );
      const [[user2]] = await pool.query(
        'SELECT id, nickName, avatarUrl, status, creditScore FROM users WHERE id = ?',
        [conv.user2_id]
      );

      if (keyword && user1 && user2) {
        const kwLower = keyword.toLowerCase();
        if (!(user1.nickName||'').toLowerCase().includes(kwLower) &&
            !(user2.nickName||'').toLowerCase().includes(kwLower)) continue;
      }

      result.push({
        conversationId: conv.conversation_id,
        user1: user1 ? { id: user1.id, nickName: user1.nickName, avatarUrl: user1.avatarUrl, status: user1.status, creditScore: user1.creditScore } : null,
        user2: user2 ? { id: user2.id, nickName: user2.nickName, avatarUrl: user2.avatarUrl, status: user2.status, creditScore: user2.creditScore } : null,
        lastMessage: lastMsg ? {
          content: lastMsg.content,
          type: lastMsg.type,
          senderId: lastMsg.sender_id,
          senderName: lastMsg.sender_nickName,
          createTime: lastMsg.createTime,
        } : null,
        totalMessages: conv.totalMessages,
        unreadCount: conv.unreadCount,
        lastTime: conv.lastTime,
      });
    }

    const total = result.length;
    const offset = (parseInt(page) - 1) * parseInt(pageSize);
    const pagedResult = result.slice(offset, offset + parseInt(pageSize));

    res.json({
      success: true,
      data: {
        list: pagedResult,
        total,
        page: parseInt(page),
        pageSize: parseInt(pageSize),
        totalPages: Math.ceil(total / parseInt(pageSize)),
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 查看私信会话消息
 * GET /api/admin/messages/conversation/:conversationId
 */
exports.getConversationMessages = async (req, res, next) => {
  try {
    const { page = 1, pageSize = 50 } = req.query;
    const pool = require('../config/db')();
    const offset = (parseInt(page) - 1) * parseInt(pageSize);

    const [[{ total }]] = await pool.query(
      'SELECT COUNT(*) as total FROM messages WHERE conversation_id = ?',
      [req.params.conversationId]
    );

    const [messages] = await pool.query(
      `SELECT m.*, u.nickName as sender_nickName, u.avatarUrl as sender_avatarUrl
       FROM messages m LEFT JOIN users u ON m.sender_id = u.id
       WHERE m.conversation_id = ?
       ORDER BY m.createTime DESC LIMIT ? OFFSET ?`,
      [req.params.conversationId, parseInt(pageSize), offset]
    );

    // 解析conversation_id获取用户信息
    const parts = req.params.conversationId.split('_');
    const users = [];
    for (const uid of parts) {
      if (uid && !isNaN(uid)) {
        const [[u]] = await pool.query(
          'SELECT id, nickName, avatarUrl, status, creditScore, phone FROM users WHERE id = ?',
          [uid]
        );
        if (u) users.push(u);
      }
    }

    res.json({
      success: true,
      data: {
        list: messages.map(m => ({
          id: m.id,
          senderId: m.sender_id,
          receiverId: m.receiver_id,
          type: m.type,
          content: m.content,
          imageUrl: m.imageUrl,
          voiceUrl: m.voiceUrl,
          isRead: !!m.isRead,
          isRecalled: !!m.isRecalled,
          sender: {
            id: m.sender_id,
            nickName: m.sender_nickName || '',
            avatarUrl: m.sender_avatarUrl || '',
          },
          createTime: m.createTime,
        })),
        total,
        users,
        page: parseInt(page),
        pageSize: parseInt(pageSize),
        totalPages: Math.ceil(total / parseInt(pageSize)),
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 群聊列表（管理端）
 * GET /api/admin/messages/group-chats
 */
exports.getGroupChats = async (req, res, next) => {
  try {
    const { keyword, page = 1, pageSize = 20 } = req.query;
    const pool = require('../config/db')();

    let whereExtra = '';
    const values = [];

    // 获取所有群聊会话
    const [groupChats] = await pool.query(`
      SELECT 
        m.relatedCarpool_id as carpoolId,
        MAX(m.createTime) as lastTime,
        COUNT(*) as totalMessages,
        COUNT(DISTINCT m.sender_id) as participantCount
      FROM messages m
      WHERE m.conversation_id LIKE 'carpool\\_%' ESCAPE '\\\\'
      GROUP BY m.relatedCarpool_id
      ORDER BY lastTime DESC
    `);

    const result = [];
    for (const gc of groupChats) {
      // 获取拼车信息
      const [[carpool]] = await pool.query(
        "SELECT id, JSON_UNQUOTE(JSON_EXTRACT(extra, '$.from')) as `from`, JSON_UNQUOTE(JSON_EXTRACT(extra, '$.to')) as `to`, status, creator_id, CAST(JSON_UNQUOTE(JSON_EXTRACT(extra, '$.totalSeats')) AS UNSIGNED) as totalSeats FROM module_posts WHERE module = 'carpool' AND (id = ? OR legacyCarpoolId = ?) LIMIT 1",
        [gc.carpoolId, gc.carpoolId]
      );
      if (!carpool) continue;

      // 获取创建者信息
      const [[creator]] = await pool.query(
        'SELECT nickName FROM users WHERE id = ?', [carpool.creator_id]
      );

      if (keyword) {
        const kwLower = keyword.toLowerCase();
        const from = (carpool.from || '').toLowerCase();
        const to = (carpool.to || '').toLowerCase();
        if (!from.includes(kwLower) && !to.includes(kwLower)) continue;
      }

      // 获取最新一条消息
      const [[lastMsg]] = await pool.query(
        `SELECT m.*, u.nickName as sender_nickName
         FROM messages m LEFT JOIN users u ON m.sender_id = u.id
         WHERE m.relatedCarpool_id = ? AND m.isRecalled = 0
         ORDER BY m.createTime DESC LIMIT 1`,
        [gc.carpoolId]
      );

      result.push({
        carpoolId: gc.carpoolId,
        route: `${carpool.from || '-'} → ${carpool.to || '-'}`,
        creator: creator ? creator.nickName : '-',
        status: carpool.status,
        participantCount: gc.participantCount,
        totalMessages: gc.totalMessages,
        lastMessage: lastMsg ? {
          content: (lastMsg.content || '').substring(0, 50),
          senderName: lastMsg.sender_nickName,
          createTime: lastMsg.createTime,
        } : null,
        lastTime: gc.lastTime,
      });
    }

    const total = result.length;
    const offset = (parseInt(page) - 1) * parseInt(pageSize);
    const pagedResult = result.slice(offset, offset + parseInt(pageSize));

    res.json({
      success: true,
      data: {
        list: pagedResult,
        total,
        page: parseInt(page),
        pageSize: parseInt(pageSize),
        totalPages: Math.ceil(total / parseInt(pageSize)),
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 查看群聊消息
 * GET /api/admin/messages/group-chat/:carpoolId
 */
exports.getGroupChatMessages = async (req, res, next) => {
  try {
    const { page = 1, pageSize = 50 } = req.query;
    const pool = require('../config/db')();
    const offset = (parseInt(page) - 1) * parseInt(pageSize);

    const [[{ total }]] = await pool.query(
      'SELECT COUNT(*) as total FROM messages WHERE relatedCarpool_id = ?',
      [req.params.carpoolId]
    );

    const [messages] = await pool.query(
      `SELECT m.*, u.nickName as sender_nickName, u.avatarUrl as sender_avatarUrl
       FROM messages m LEFT JOIN users u ON m.sender_id = u.id
       WHERE m.relatedCarpool_id = ?
       ORDER BY m.createTime DESC LIMIT ? OFFSET ?`,
      [req.params.carpoolId, parseInt(pageSize), offset]
    );

    res.json({
      success: true,
      data: {
        list: messages.map(m => ({
          id: m.id,
          senderId: m.sender_id,
          type: m.type,
          content: m.content,
          imageUrl: m.imageUrl,
          isRecalled: !!m.isRecalled,
          sender: {
            id: m.sender_id,
            nickName: m.sender_nickName || '',
            avatarUrl: m.sender_avatarUrl || '',
          },
          createTime: m.createTime,
        })),
        total,
        page: parseInt(page),
        pageSize: parseInt(pageSize),
        totalPages: Math.ceil(total / parseInt(pageSize)),
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 消息搜索
 * GET /api/admin/messages/search
 */
exports.searchMessages = async (req, res, next) => {
  try {
    const { keyword, page = 1, pageSize = 30 } = req.query;
    if (!keyword) throw new AppError('请输入搜索关键词', 400);

    const pool = require('../config/db')();
    const offset = (parseInt(page) - 1) * parseInt(pageSize);
    const kw = `%${keyword}%`;

    const [[{ total }]] = await pool.query(
      'SELECT COUNT(*) as total FROM messages WHERE content LIKE ? AND isRecalled = 0',
      [kw]
    );

    const [messages] = await pool.query(
      `SELECT m.*, su.nickName as sender_nickName, su.avatarUrl as sender_avatarUrl,
         ru.nickName as receiver_nickName, ru.avatarUrl as receiver_avatarUrl
       FROM messages m
       LEFT JOIN users su ON m.sender_id = su.id
       LEFT JOIN users ru ON m.receiver_id = ru.id
       WHERE m.content LIKE ? AND m.isRecalled = 0
       ORDER BY m.createTime DESC LIMIT ? OFFSET ?`,
      [kw, parseInt(pageSize), offset]
    );

    res.json({
      success: true,
      data: {
        list: messages.map(m => ({
          id: m.id,
          conversationId: m.conversation_id,
          content: m.content,
          type: m.type,
          sender: { id: m.sender_id, nickName: m.sender_nickName || '', avatarUrl: m.sender_avatarUrl || '' },
          receiver: { id: m.receiver_id, nickName: m.receiver_nickName || '', avatarUrl: m.receiver_avatarUrl || '' },
          createTime: m.createTime,
        })),
        total,
        page: parseInt(page),
        pageSize: parseInt(pageSize),
        totalPages: Math.ceil(total / parseInt(pageSize)),
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 删除消息（管理员）
 * DELETE /api/admin/messages/:id
 * ?conversation=1 删除整个对话  ?group=1 删除整个群聊
 */
exports.deleteMessage = async (req, res, next) => {
  try {
    const { Message } = require('../models');
    const pool = require('../config/db')();
    const id = req.params.id;

    if (req.query.conversation) {
      // 删除整个对话的所有消息
      await pool.query('DELETE FROM messages WHERE conversation_id = ?', [id]);
      res.json({ success: true, message: '对话已删除' });
    } else if (req.query.group) {
      // 删除群聊的所有消息
      await pool.query('DELETE FROM messages WHERE relatedCarpool_id = ?', [id]);
      res.json({ success: true, message: '群聊已删除' });
    } else {
      // 删除单条消息
      await Message.findByIdAndDelete(id);
      res.json({ success: true, message: '消息已删除' });
    }
  } catch (error) {
    next(error);
  }
};

// ==================== 评价管理 ====================

/**
 * 评价列表（管理端）
 * GET /api/admin/reviews
 */
exports.getReviewList = async (req, res, next) => {
  try {
    const { keyword, rating, page = 1, pageSize = 15 } = req.query;
    const { Review } = require('../models');

    const query = {};
    if (rating) query.rating = parseInt(rating);

    const [list, total] = await Promise.all([
      Review.find(query)
        .sort({ createTime: -1 })
        .skip((parseInt(page) - 1) * parseInt(pageSize))
        .limit(parseInt(pageSize))
        .populate('reviewer', 'nickName phone')
        .populate('targetUser', 'nickName phone creditScore')
        .populate('carpool', 'from to'),
      Review.countDocuments(query),
    ]);

    res.json({
      success: true,
      data: { list, total, page: parseInt(page), pageSize: parseInt(pageSize), totalPages: Math.ceil(total / parseInt(pageSize)) },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 删除评价（管理员）
 * DELETE /api/admin/reviews/:id
 */
exports.deleteReview = async (req, res, next) => {
  try {
    const { Review } = require('../models');
    const review = await Review.findById(req.params.id);
    if (!review) {
      throw new AppError('评价不存在', 404);
    }

    await review.deleteOne();

    // 重新计算被评价者的统计
    if (typeof Review.updateUserStats === 'function') {
      await Review.updateUserStats(review.targetUser);
    }

    res.json({ success: true, message: '评价已删除' });
  } catch (error) {
    next(error);
  }
};

exports.createSnapshot = async (req, res, next) => {
  try {
    const pool = require('../config/db')();
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10);
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDay = new Date(startOfDay.getTime() + 24 * 3600 * 1000);

    const [
      [nu], [tu], [nc], [tc], [cc], [can],
      [jc], [nr], [ar], [ncomp], [rcomp], [nfb],
      [bu], [bi]
    ] = await Promise.all([
      pool.query('SELECT COUNT(*) as cnt FROM users WHERE createTime >= ? AND createTime < ?', [startOfDay, endOfDay]),
      pool.query('SELECT COUNT(*) as cnt FROM users'),
      pool.query("SELECT COUNT(*) as cnt FROM module_posts WHERE module = 'carpool' AND createTime >= ? AND createTime < ?", [startOfDay, endOfDay]),
      pool.query("SELECT COUNT(*) as cnt FROM module_posts WHERE module = 'carpool'"),
      pool.query("SELECT COUNT(*) as cnt FROM module_posts WHERE module = 'carpool' AND status = ? AND updateTime >= ? AND updateTime < ?", ['ended', startOfDay, endOfDay]),
      pool.query("SELECT COUNT(*) as cnt FROM module_posts WHERE module = 'carpool' AND status = ? AND updateTime >= ? AND updateTime < ?", ['cancelled', startOfDay, endOfDay]),
      pool.query("SELECT COUNT(*) as cnt FROM content_participants WHERE status = 'joined' AND joinTime >= ? AND joinTime < ?", [startOfDay, endOfDay]),
      pool.query('SELECT COUNT(*) as cnt FROM reviews WHERE createTime >= ? AND createTime < ?', [startOfDay, endOfDay]),
      pool.query('SELECT AVG(rating) as avg FROM reviews WHERE createTime >= ? AND createTime < ?', [startOfDay, endOfDay]),
      pool.query('SELECT COUNT(*) as cnt FROM complaints WHERE createTime >= ? AND createTime < ?', [startOfDay, endOfDay]),
      pool.query("SELECT COUNT(*) as cnt FROM complaints WHERE status = 'resolved' AND updateTime >= ? AND updateTime < ?", [startOfDay, endOfDay]),
      pool.query('SELECT COUNT(*) as cnt FROM feedbacks WHERE createTime >= ? AND createTime < ?', [startOfDay, endOfDay]),
      pool.query("SELECT COUNT(*) as cnt FROM users WHERE status IN ('banned','disabled') AND updateTime >= ? AND updateTime < ?", [startOfDay, endOfDay]),
      pool.query('SELECT COUNT(*) as cnt FROM ip_records WHERE isBlocked = 1'),
    ]);

    const DailyStat = require('../models').DailyStat;
    const snapshot = await DailyStat.findOneAndUpdate(
      { date: dateStr },
      { $set: {
        newUsers: nu[0].cnt,
        totalUsers: tu[0].cnt,
        newCarpools: nc[0].cnt,
        totalCarpools: tc[0].cnt,
        completedCarpools: cc[0].cnt,
        cancelledCarpools: can[0].cnt,
        joinCount: jc[0].cnt,
        newReviews: nr[0].cnt,
        avgRating: ar[0].avg || 0,
        newComplaints: ncomp[0].cnt,
        resolvedComplaints: rcomp[0].cnt,
        newFeedback: nfb[0].cnt,
        bannedUsers: bu[0].cnt,
        blockedIps: bi[0].cnt,
      }},
      { upsert: true, new: true }
    );

    res.json({ success: true, message: '统计快照已生成', data: snapshot });
  } catch (error) {
    next(error);
  }
};

// ========== 图鉴条目审核（guide_items 表） ==========
// 用户在小程序发布图鉴提交到 guide_items，状态为 pending
// admin 在「内容管理 → 图鉴审核」tab 中查看并审核

/**
 * GET /api/admin/guide/items?status=pending|approved|rejected
 */
exports.getGuideItemList = async (req, res, next) => {
  try {
    const { status, page = 1, pageSize = 50, category_key, keyword } = req.query;
    const pool = require('../config/db')();

    let whereSql = 'WHERE 1=1';
    const values = [];
    if (status) { whereSql += ' AND status = ?'; values.push(status); }
    if (category_key) { whereSql += ' AND category_key = ?'; values.push(category_key); }
    if (keyword) {
      whereSql += ' AND (name LIKE ? OR description LIKE ?)';
      const kw = `%${keyword}%`;
      values.push(kw, kw);
    }

    const pageNum = parseInt(page, 10) || 1;
    const sizeNum = parseInt(pageSize, 10) || 50;

    const [[{ total }]] = await pool.query(
      `SELECT COUNT(*) as total FROM guide_items ${whereSql}`, values
    );

    const offset = (pageNum - 1) * sizeNum;
    const [rows] = await pool.query(
      `SELECT * FROM guide_items ${whereSql} ORDER BY id DESC LIMIT ? OFFSET ?`,
      [...values, sizeNum, offset]
    );

    // 解析 images JSON
    const list = rows.map(r => ({
      ...r,
      images: typeof r.images === 'string' ? JSON.parse(r.images || '[]') : (r.images || []),
    }));

    res.json({
      success: true,
      data: { list, total, page: pageNum, pageSize: sizeNum, totalPages: Math.ceil(total / sizeNum) },
    });
  } catch (error) { next(error); }
};

/**
 * PUT /api/admin/guide/items/:id/approve
 */
exports.approveGuideItem = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!id) return res.status(400).json({ success: false, message: '无效的 ID' });

    const pool = require('../config/db')();
    const [rows] = await pool.query('SELECT * FROM guide_items WHERE id = ?', [id]);
    if (rows.length === 0) return res.status(404).json({ success: false, message: '条目不存在' });

    await pool.query("UPDATE guide_items SET status = 'approved' WHERE id = ?", [id]);
    res.json({ success: true, message: '已通过' });
  } catch (error) { next(error); }
};

/**
 * PUT /api/admin/guide/items/:id/reject
 */
exports.rejectGuideItem = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!id) return res.status(400).json({ success: false, message: '无效的 ID' });

    const pool = require('../config/db')();
    const [rows] = await pool.query('SELECT * FROM guide_items WHERE id = ?', [id]);
    if (rows.length === 0) return res.status(404).json({ success: false, message: '条目不存在' });

    await pool.query("UPDATE guide_items SET status = 'rejected' WHERE id = ?", [id]);
    res.json({ success: true, message: '已拒绝' });
  } catch (error) { next(error); }
};
