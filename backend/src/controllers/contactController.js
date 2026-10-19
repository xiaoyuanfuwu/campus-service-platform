const { ContactMessage } = require('../models');
const { AppError } = require('../middleware/auth');

/**
 * 提交留言
 * POST /api/contact
 */
exports.create = async (req, res, next) => {
  try {
    const { content, contact } = req.body;

    if (!content || !content.trim()) {
      throw new AppError('留言内容不能为空', 400);
    }

    const message = await ContactMessage.create({
      user_id: req.userId || null,
      user_nickName: req.user ? req.user.nickName : (req.body.nickName || '匿名用户'),
      user_avatarUrl: req.user ? req.user.avatarUrl : '',
      contact: contact || '',
      content: content.trim(),
    });

    res.status(201).json({
      success: true,
      message: '留言已提交，感谢你的反馈！',
      data: message,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 获取我的留言列表
 * GET /api/contact/my
 */
exports.getMyList = async (req, res, next) => {
  try {
    const { page = 1, pageSize = 20 } = req.query;

    const query = { user_id: req.userId };
    const [list, total] = await Promise.all([
      ContactMessage.find(query)
        .sort({ createTime: -1 })
        .skip((parseInt(page) - 1) * parseInt(pageSize))
        .limit(parseInt(pageSize)),
      ContactMessage.countDocuments(query),
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

// ==================== 管理员接口 ====================

/**
 * 获取所有留言（管理员）
 * GET /api/contact/admin/list
 */
exports.getAdminList = async (req, res, next) => {
  try {
    const { is_read, page = 1, pageSize = 20 } = req.query;

    const query = {};
    if (is_read !== undefined) query.is_read = is_read === 'true';

    const [list, total] = await Promise.all([
      ContactMessage.find(query)
        .sort({ is_read: 1, createTime: -1 })
        .skip((parseInt(page) - 1) * parseInt(pageSize))
        .limit(parseInt(pageSize)),
      ContactMessage.countDocuments(query),
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
 * 回复留言（管理员）
 * PUT /api/contact/admin/:id/reply
 */
exports.reply = async (req, res, next) => {
  try {
    const { reply } = req.body;

    if (!reply || !reply.trim()) {
      throw new AppError('回复内容不能为空', 400);
    }

    const message = await ContactMessage.findByIdAndUpdate(
      req.params.id,
      {
        reply: reply.trim(),
        replied_at: new Date(),
        is_read: true,
      },
      { new: true }
    );

    if (!message) {
      throw new AppError('留言不存在', 404);
    }

    res.json({
      success: true,
      message: '回复成功',
      data: message,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 标记已读（管理员）
 * PUT /api/contact/admin/:id/read
 */
exports.markRead = async (req, res, next) => {
  try {
    const message = await ContactMessage.findByIdAndUpdate(
      req.params.id,
      { is_read: true },
      { new: true }
    );

    if (!message) {
      throw new AppError('留言不存在', 404);
    }

    res.json({
      success: true,
      message: '已标记已读',
      data: message,
    });
  } catch (error) {
    next(error);
  }
};
