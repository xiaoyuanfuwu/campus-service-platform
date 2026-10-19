const { Notification } = require('../models');
const { AppError } = require('../middleware/auth');

/**
 * 获取通知列表
 * GET /api/notifications
 */
exports.getList = async (req, res, next) => {
  try {
    const { type, isRead, page = 1, pageSize = 20 } = req.query;

    const query = {
      recipient: req.userId,
      isDeleted: false,
    };

    if (type) {
      query.type = type;
    }

    if (isRead !== undefined) {
      query.isRead = isRead === 'true';
    }

    const [list, total, unreadCount] = await Promise.all([
      Notification.find(query)
        .sort({ createTime: -1 })
        .skip((parseInt(page) - 1) * parseInt(pageSize))
        .limit(parseInt(pageSize))
        .populate('sender', 'nickName avatarUrl')
        .populate('relatedCarpool', 'from to departureTime status')
        .populate('relatedPost', 'module title content status auditStatus'),
      Notification.countDocuments(query),
      Notification.countDocuments({
        recipient: req.userId,
        isRead: false,
        isDeleted: false,
      }),
    ]);

    res.json({
      success: true,
      data: {
        list,
        total,
        unreadCount,
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
 * 获取未读通知数量
 * GET /api/notifications/unread-count
 */
exports.getUnreadCount = async (req, res, next) => {
  try {
    const count = await Notification.countDocuments({
      recipient: req.userId,
      isRead: false,
      isDeleted: false,
    });

    res.json({
      success: true,
      data: { count },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 标记已读
 * PUT /api/notifications/:id/read
 */
exports.markRead = async (req, res, next) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      {
        _id: req.params.id,
        recipient: req.userId,
      },
      {
        isRead: true,
      },
      { new: true }
    );

    if (!notification) {
      throw new AppError('通知不存在', 404);
    }

    res.json({
      success: true,
      message: '已标记为已读',
      data: notification,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 全部已读
 * PUT /api/notifications/read-all
 */
exports.markAllRead = async (req, res, next) => {
  try {
    const result = await Notification.updateMany(
      {
        recipient: req.userId,
        isRead: false,
        isDeleted: false,
      },
      {
        isRead: true,
      }
    );

    res.json({
      success: true,
      message: `已将 ${result.modifiedCount} 条通知标记为已读`,
      data: { count: result.modifiedCount },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 删除通知
 * DELETE /api/notifications/:id
 */
exports.remove = async (req, res, next) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      {
        _id: req.params.id,
        recipient: req.userId,
      },
      {
        isDeleted: true,
      }
    );

    if (!notification) {
      throw new AppError('通知不存在', 404);
    }

    res.json({
      success: true,
      message: '已删除',
    });
  } catch (error) {
    next(error);
  }
};
