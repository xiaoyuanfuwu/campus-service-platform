const { Feedback, User, Notification } = require('../models');
const { AppError } = require('../middleware/auth');

/**
 * 提交反馈
 * POST /api/feedback
 */
exports.create = async (req, res, next) => {
  try {
    const {
      category,
      title,
      content,
      images,
      relatedCarpool,
      relatedUser,
      pagePath,
      deviceInfo,
    } = req.body;

    if (!category || !title || !content) {
      throw new AppError('反馈类型、标题和内容不能为空', 400);
    }

    const feedback = await Feedback.create({
      user: req.userId,
      userSnapshot: {
        nickName: req.user.nickName,
        avatarUrl: req.user.avatarUrl,
        phone: req.user.phone || '',
      },
      category,
      title,
      content,
      images: images || [],
      relatedCarpool: relatedCarpool || null,
      relatedUser: relatedUser || null,
      pagePath: pagePath || '',
      deviceInfo: deviceInfo || {},
    });

    res.status(201).json({
      success: true,
      message: '反馈提交成功，感谢你的宝贵意见！',
      data: feedback,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 获取我的反馈列表
 * GET /api/feedback/my
 */
exports.getMyList = async (req, res, next) => {
  try {
    const { status, page = 1, pageSize = 20 } = req.query;

    const query = { user: req.userId };
    if (status) query.status = status;

    const [list, total] = await Promise.all([
      Feedback.find(query)
        .sort({ createTime: -1 })
        .skip((parseInt(page) - 1) * parseInt(pageSize))
        .limit(parseInt(pageSize))
        .populate('handler', 'nickName'),
      Feedback.countDocuments(query),
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
 * 获取反馈详情
 * GET /api/feedback/:id
 */
exports.getDetail = async (req, res, next) => {
  try {
    const feedback = await Feedback.findById(req.params.id)
      .populate('user', 'nickName avatarUrl')
      .populate('handler', 'nickName');

    if (!feedback) {
      throw new AppError('反馈不存在', 404);
    }

    // 只能查看自己的反馈（管理员可看全部）
    if (
      feedback.user._id.toString() !== req.userId.toString()
    ) {
      throw new AppError('无权查看此反馈', 403);
    }

    res.json({
      success: true,
      data: feedback,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 对处理结果评分
 * PUT /api/feedback/:id/rate
 */
exports.rateResult = async (req, res, next) => {
  try {
    const { rating } = req.body;

    if (!rating || rating < 1 || rating > 5) {
      throw new AppError('评分范围为1-5分', 400);
    }

    const feedback = await Feedback.findOneAndUpdate(
      { _id: req.params.id, user: req.userId },
      { userRating: rating },
      { new: true }
    );

    if (!feedback) {
      throw new AppError('反馈不存在', 404);
    }

    res.json({
      success: true,
      message: '评分成功',
      data: feedback,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 关闭反馈
 * PUT /api/feedback/:id/close
 */
exports.close = async (req, res, next) => {
  try {
    const feedback = await Feedback.findOneAndUpdate(
      { _id: req.params.id, user: req.userId, status: { $in: ['pending', 'reviewing', 'resolved'] } },
      { status: 'closed' },
      { new: true }
    );

    if (!feedback) {
      throw new AppError('反馈不存在或无法关闭', 404);
    }

    res.json({
      success: true,
      message: '反馈已关闭',
      data: feedback,
    });
  } catch (error) {
    next(error);
  }
};

// ==================== 管理员接口 ====================

/**
 * 获取所有反馈列表（管理员）
 * GET /api/feedback/admin/list
 */
exports.getAdminList = async (req, res, next) => {
  try {
    const { status, category, priority, page = 1, pageSize = 20 } = req.query;

    const query = {};
    if (status) query.status = status;
    if (category) query.category = category;
    if (priority) query.priority = priority;

    const [list, total] = await Promise.all([
      Feedback.find(query)
        .sort({ priority: -1, createTime: -1 })
        .skip((parseInt(page) - 1) * parseInt(pageSize))
        .limit(parseInt(pageSize))
        .populate('user', 'nickName avatarUrl phone')
        .populate('handler', 'nickName'),
      Feedback.countDocuments(query),
    ]);

    // 统计各状态数量
    const [stats] = await require('../config/db')().query("SELECT status as _id, COUNT(*) as count FROM feedbacks GROUP BY status");

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
 * 处理反馈（管理员）
 * PUT /api/feedback/admin/:id/handle
 */
exports.handleFeedback = async (req, res, next) => {
  try {
    const { status, handlerNote, resolveNote, priority } = req.body;

    const updateData = {};
    if (status) {
      updateData.status = status;
      if (['accepted', 'resolved', 'rejected', 'closed'].includes(status)) {
        updateData.handledAt = new Date();
      }
    }
    if (handlerNote !== undefined) updateData.handlerNote = handlerNote;
    if (resolveNote !== undefined) updateData.resolveNote = resolveNote;
    if (priority) updateData.priority = priority;
    updateData.handler = req.userId;

    const feedback = await Feedback.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    ).populate('user', 'nickName');

    if (!feedback) {
      throw new AppError('反馈不存在', 404);
    }

    // 通知提交者
    if (status && feedback.user) {
      const statusText = {
        reviewing: '审核中',
        accepted: '已采纳',
        in_progress: '处理中',
        resolved: '已解决',
        rejected: '已拒绝',
        closed: '已关闭',
      };

      await Notification.create({
        recipient: feedback.user._id,
        sender: req.userId,
        senderSnapshot: {
          nickName: '管理员',
          avatarUrl: '',
        },
        type: 'system',
        title: '反馈状态更新',
        content: `你的反馈「${feedback.title}」状态已更新为：${statusText[status] || status}${resolveNote ? '。回复：' + resolveNote : ''}`,
        priority: 'normal',
        extraData: { feedbackId: feedback._id, status },
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
