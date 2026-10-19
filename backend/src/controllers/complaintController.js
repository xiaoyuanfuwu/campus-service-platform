const { Complaint, User, Carpool, Notification } = require('../models');
const { AppError } = require('../middleware/auth');

/**
 * 提交投诉
 * POST /api/complaints
 */
exports.create = async (req, res, next) => {
  try {
    const {
      targetType,
      targetUserId,
      targetCarpoolId,
      targetReviewId,
      targetMessageId,
      category,
      title,
      content,
      evidence,
      severity,
      isAnonymous,
    } = req.body;

    if (!targetType || !category || !title || !content) {
      throw new AppError('投诉对象类型、投诉类型、标题和内容不能为空', 400);
    }

    // 不能投诉自己
    if (targetUserId && targetUserId === req.userId.toString()) {
      throw new AppError('不能投诉自己', 400);
    }

    // 检查被投诉对象是否存在
    let targetUserSnapshot = {};
    if (targetUserId) {
      const targetUser = await User.findById(targetUserId);
      if (targetUser) {
        targetUserSnapshot = {
          nickName: targetUser.nickName || '',
          avatarUrl: targetUser.avatarUrl || '',
          phone: targetUser.phone || '',
        };
      }
    }

    // 检查拼车是否存在（统一内容表，兼容新旧 ID）
    if (targetCarpoolId) {
      const [cpRows] = await require('../config/db')().query(
        "SELECT id FROM module_posts WHERE module = 'carpool' AND (id = ? OR legacyCarpoolId = ?) LIMIT 1",
        [targetCarpoolId, targetCarpoolId]
      );
      if (!cpRows[0]) {
        throw new AppError('关联拼车不存在', 404);
      }
    }

    const complaint = await Complaint.create({
      complainant: req.userId,
      complainantSnapshot: {
        nickName: isAnonymous ? '匿名用户' : req.user.nickName,
        avatarUrl: isAnonymous ? '' : req.user.avatarUrl,
        phone: isAnonymous ? '' : (req.user.phone || ''),
        creditScore: req.user.creditScore,
      },
      targetType,
      targetUser: targetUserId || null,
      targetUserSnapshot,
      targetCarpool: targetCarpoolId || null,
      targetReview: targetReviewId || null,
      targetMessage: targetMessageId || null,
      category,
      title,
      content,
      evidence: evidence || [],
      severity: severity || 'medium',
      isAnonymous: isAnonymous || false,
    });

    // 写入初始时间线
    const pool = require('../config/db')();
    await pool.query(
      'INSERT INTO complaint_timeline (complaint_id, action, operator_id, operatorName, note) VALUES (?, ?, ?, ?, ?)',
      [complaint.id, 'submitted', req.userId, isAnonymous ? '匿名用户' : req.user.nickName, '提交投诉']
    );

    res.status(201).json({
      success: true,
      message: '投诉提交成功，我们会尽快处理',
      data: { id: complaint._id },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 获取我的投诉列表
 * GET /api/complaints/my
 */
exports.getMyList = async (req, res, next) => {
  try {
    const { status, page = 1, pageSize = 20 } = req.query;

    const query = { complainant: req.userId };
    if (status) query.status = status;

    const [list, total] = await Promise.all([
      Complaint.find(query)
        .select('-timeline -appeal') // 列表不返回时间线和申诉详情
        .sort({ createTime: -1 })
        .skip((parseInt(page) - 1) * parseInt(pageSize))
        .limit(parseInt(pageSize))
        .populate('handler', 'nickName')
        .populate('targetCarpool', 'from to departureTime'),
      Complaint.countDocuments(query),
    ]);

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
 * 获取投诉详情
 * GET /api/complaints/:id
 */
exports.getDetail = async (req, res, next) => {
  try {
    const complaint = await Complaint.find({ id: req.params.id })
      .limit(1)
      .populate('complainant', 'nickName avatarUrl phone')
      .populate('handler', 'nickName')
      .populate('targetCarpool', 'from to departureTime type')
      .populate('targetReview', 'rating content')
      .populate('targetMessage', 'content type createTime');
    const result = complaint[0] || null;

    if (!result) {
      throw new AppError('投诉不存在', 404);
    }

    // 只能查看自己的投诉（管理员可看全部）
    const complainantId = result.complainant?._id || result.complainant_id || result.complainant;
    if (complainantId && String(complainantId) !== String(req.userId)) {
      throw new AppError('无权查看此投诉', 403);
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
 * 提交申诉
 * POST /api/complaints/:id/appeal
 */
exports.submitAppeal = async (req, res, next) => {
  try {
    const { content, evidence } = req.body;

    if (!content) {
      throw new AppError('申诉内容不能为空', 400);
    }

    const complaint = await Complaint.findOne({
      id: req.params.id,
      complainant_id: req.userId,
      status: { $in: ['penalized', 'banned', 'warning'] },
    });

    if (!complaint) {
      throw new AppError('投诉不存在或无法申诉', 404);
    }

    complaint.appeal = {
      content,
      evidence: evidence || [],
      submittedAt: new Date(),
      result: 'pending',
    };
    complaint.status = 'appealed';

    // 保存申诉
    await Complaint.updateMany({ id: complaint.id }, {
      $set: {
        status: 'appealed',
        appeal_content: content,
        appeal_evidence: evidence ? JSON.stringify(evidence) : null,
        appeal_submittedAt: new Date(),
        appeal_result: 'pending',
      }
    });

    // 写入时间线
    const pool = require('../config/db')();
    await pool.query(
      'INSERT INTO complaint_timeline (complaint_id, action, operator_id, operatorName, note) VALUES (?, ?, ?, ?, ?)',
      [complaint.id, 'appeal_submitted', req.userId, req.user.nickName, '提交申诉']
    );

    res.json({
      success: true,
      message: '申诉提交成功',
    });
  } catch (error) {
    next(error);
  }
};

// ==================== 管理员接口 ====================

/**
 * 获取所有投诉列表（管理员）
 * GET /api/complaints/admin/list
 */
exports.getAdminList = async (req, res, next) => {
  try {
    const { status, category, severity, targetType, page = 1, pageSize = 20 } = req.query;

    const query = {};
    if (status) query.status = status;
    if (category) query.category = category;
    if (severity) query.severity = severity;
    if (targetType) query.targetType = targetType;

    const [list, total] = await Promise.all([
      Complaint.find(query)
        .sort({ severity: -1, createTime: -1 })
        .skip((parseInt(page) - 1) * parseInt(pageSize))
        .limit(parseInt(pageSize))
        .populate('complainant', 'nickName avatarUrl phone')
        .populate('targetUser', 'nickName avatarUrl phone creditScore')
        .populate('handler', 'nickName'),
      Complaint.countDocuments(query),
    ]);

    // 统计各状态数量
    const [stats] = await require('../config/db')().query("SELECT status as _id, COUNT(*) as count FROM complaints GROUP BY status");

    res.json({
      success: true,
      data: {
        list,
        total,
        stats,
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
 * 处理投诉（管理员）
 * PUT /api/complaints/admin/:id/handle
 */
exports.handleComplaint = async (req, res, next) => {
  try {
    const {
      status,
      handlerNote,
      resolution,
      penalty,
    } = req.body;

    const complaint = await Complaint.findById(req.params.id);
    if (!complaint) {
      throw new AppError('投诉不存在', 404);
    }

    // 更新状态
    if (status) {
      complaint.status = status;
      if (['resolved', 'rejected', 'closed'].includes(status)) {
        complaint.handledAt = new Date();
      }
    }
    if (handlerNote !== undefined) complaint.handlerNote = handlerNote;
    if (resolution !== undefined) complaint.resolution = resolution;
    complaint.handler = req.userId;

    // 处理处罚
    if (penalty) {
      complaint.penalty = {
        ...complaint.penalty.toObject?.() || {},
        ...penalty,
      };

      // 执行处罚
      if (penalty.type && penalty.type !== 'none' && complaint.targetUser) {
        const targetUser = await User.findById(complaint.targetUser);

        if (targetUser) {
          switch (penalty.type) {
            case 'warning':
              // 发警告通知
              await Notification.create({
                recipient: targetUser._id,
                sender: req.userId,
                senderSnapshot: { nickName: '管理员', avatarUrl: '' },
                type: 'system',
                title: '⚠️ 违规警告',
                content: `你因「${complaint.title}」被警告，请注意规范行为。${penalty.reason || ''}`,
                priority: 'high',
              });
              break;

            case 'credit_deduct':
              // 扣信用分
              const deduct = penalty.creditDeduct || 5;
              const oldScore = targetUser.creditScore;
              targetUser.creditScore = Math.max(0, targetUser.creditScore - deduct);

              // 自动封禁规则：信用分低于 80 分 → 自动临时封禁 1 个月
              if (targetUser.creditScore < 80 && targetUser.status === 'active') {
                const banExpiresAt = new Date();
                banExpiresAt.setMonth(banExpiresAt.getMonth() + 1);
                targetUser.status = 'disabled';
                targetUser.banExpiresAt = banExpiresAt;
              }

              await targetUser.save();

              await Notification.create({
                recipient: targetUser._id,
                sender: req.userId,
                senderSnapshot: { nickName: '管理员', avatarUrl: '' },
                type: 'credit_change',
                title: '信用分扣减',
                content: `因违规行为，你的信用分被扣除 ${deduct} 分。${penalty.reason || ''}`,
                priority: 'high',
                extraData: { deduct, reason: penalty.reason },
              });
              break;

            case 'temp_ban':
              // 临时封禁
              targetUser.status = 'disabled';
              await targetUser.save();

              await Notification.create({
                recipient: targetUser._id,
                sender: req.userId,
                senderSnapshot: { nickName: '管理员', avatarUrl: '' },
                type: 'system',
                title: '🚫 账号临时封禁',
                content: `你的账号已被临时封禁${penalty.banDuration || 7}天。${penalty.reason || ''}`,
                priority: 'urgent',
              });
              break;

            case 'permanent_ban':
              // 永久封禁
              targetUser.status = 'banned';
              await targetUser.save();

              await Notification.create({
                recipient: targetUser._id,
                sender: req.userId,
                senderSnapshot: { nickName: '管理员', avatarUrl: '' },
                type: 'system',
                title: '🚫 账号永久封禁',
                content: `你的账号因严重违规已被永久封禁。${penalty.reason || ''}`,
                priority: 'urgent',
              });
              break;
          }
        }
      }
    }

    // 添加时间线
    complaint.timeline.push({
      action: `status_${status || 'updated'}`,
      operator: req.userId,
      operatorName: req.user.nickName,
      note: handlerNote || `状态更新为：${status}`,
    });

    await complaint.save();

    // 通知投诉人
    const statusText = {
      investigating: '调查中',
      verified: '已核实',
      rejected: '已驳回',
      warning: '已警告',
      penalized: '已处罚',
      banned: '已封禁',
      resolved: '已解决',
      closed: '已关闭',
    };

    await Notification.create({
      recipient: complaint.complainant,
      sender: req.userId,
      senderSnapshot: { nickName: '管理员', avatarUrl: '' },
      type: 'system',
      title: '投诉处理进度更新',
      content: `你的投诉「${complaint.title}」状态已更新为：${statusText[status] || status}${resolution ? '。结果：' + resolution : ''}`,
      priority: 'normal',
      extraData: { complaintId: complaint._id, status },
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

/**
 * 处理申诉（管理员）
 * PUT /api/complaints/admin/:id/appeal-review
 */
exports.reviewAppeal = async (req, res, next) => {
  try {
    const { result, resultNote } = req.body;

    if (!result || !['approved', 'rejected'].includes(result)) {
      throw new AppError('申诉结果只能是 approved 或 rejected', 400);
    }

    const complaint = await Complaint.findById(req.params.id);
    if (!complaint) {
      throw new AppError('投诉不存在', 404);
    }

    if (complaint.status !== 'appealed') {
      throw new AppError('该投诉未处于申诉状态', 400);
    }

    complaint.appeal.result = result;
    complaint.appeal.reviewedAt = new Date();
    complaint.appeal.resultNote = resultNote || '';

    if (result === 'approved') {
      // 申诉通过，恢复处罚前的状态
      complaint.status = 'resolved';

      if (complaint.targetUser) {
        const targetUser = await User.findById(complaint.targetUser);
        if (targetUser && targetUser.status === 'disabled') {
          targetUser.status = 'active';
          await targetUser.save();
        }

        // 如果扣了分，恢复
        if (complaint.penalty?.creditDeduct > 0) {
          targetUser.creditScore = Math.min(
            200,
            targetUser.creditScore + complaint.penalty.creditDeduct
          );
          await targetUser.save();
        }
      }
    } else {
      complaint.status = 'closed';
    }

    complaint.timeline.push({
      action: `appeal_${result}`,
      operator: req.userId,
      operatorName: req.user.nickName,
      note: `申诉${result === 'approved' ? '通过' : '驳回'}${resultNote ? '：' + resultNote : ''}`,
    });

    await complaint.save();

    // 通知投诉人
    await Notification.create({
      recipient: complaint.complainant,
      sender: req.userId,
      senderSnapshot: { nickName: '管理员', avatarUrl: '' },
      type: 'system',
      title: result === 'approved' ? '申诉通过' : '申诉驳回',
      content: `你的申诉${result === 'approved' ? '已通过' : '被驳回'}${resultNote ? '：' + resultNote : ''}`,
      priority: 'high',
    });

    res.json({
      success: true,
      message: result === 'approved' ? '申诉已通过' : '申诉已驳回',
      data: complaint,
    });
  } catch (error) {
    next(error);
  }
};
