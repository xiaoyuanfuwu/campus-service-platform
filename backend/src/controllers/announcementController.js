const { Announcement, User, Notification } = require('../models');
const { AppError } = require('../middleware/auth');

/**
 * 获取公告列表（用户端）
 * GET /api/announcements
 */
exports.getList = async (req, res, next) => {
  try {
    const { type, isTop, page = 1, pageSize = 10 } = req.query;

    // 简化查询：已发布的公告，visibility='all' 的对所有人可见
    // school/role/custom 可见性需要 JSON 查询，暂简化为 all
    const query = { status: 'published' };

    if (type) query.type = type;
    if (isTop !== undefined) query.isTop = isTop === 'true';

    const [list, total] = await Promise.all([
      Announcement.find(query)
        .select('-content')
        .sort({ isTop: -1, displayOrder: -1, publishTime: -1 })
        .skip((parseInt(page) - 1) * parseInt(pageSize))
        .limit(parseInt(pageSize)),
      Announcement.countDocuments(query),
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
 * 获取公告详情
 * GET /api/announcements/:id
 */
exports.getDetail = async (req, res, next) => {
  try {
    const announcement = await Announcement.findById(req.params.id);

    if (!announcement) {
      throw new AppError('公告不存在', 404);
    }

    if (announcement.status !== 'published') {
      // 非发布状态只有管理员能看
      if (!req.user) {
        throw new AppError('公告不存在', 404);
      }
    }

    // 增加浏览量
    const newViewCount = (announcement.viewCount || 0) + 1;
    const newReadCount = req.user ? (announcement.readCount || 0) + 1 : (announcement.readCount || 0);
    await Announcement.findByIdAndUpdate(req.params.id, {
      $set: { viewCount: newViewCount, readCount: newReadCount }
    });
    announcement.viewCount = newViewCount;
    announcement.readCount = newReadCount;

    res.json({
      success: true,
      data: announcement,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 点赞公告
 * POST /api/announcements/:id/like
 */
exports.like = async (req, res, next) => {
  try {
    const announcement = await Announcement.findByIdAndUpdate(
      req.params.id,
      { $inc: { likeCount: 1 } },
      { new: true }
    );

    if (!announcement) {
      throw new AppError('公告不存在', 404);
    }

    res.json({
      success: true,
      message: '点赞成功',
      data: { likeCount: announcement.likeCount },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 获取公告评论
 * GET /api/announcements/:id/comments
 */
exports.getComments = async (req, res, next) => {
  try {
    const pool = require('../config/db')();
    const [comments] = await pool.query(
      'SELECT c.*, u.nickName, u.avatarUrl FROM announcement_comments c LEFT JOIN users u ON c.user_id = u.id WHERE c.announcement_id = ? ORDER BY c.createTime ASC',
      [req.params.id]
    );
    res.json({ success: true, data: comments });
  } catch (error) {
    next(error);
  }
};

/**
 * 添加公告评论
 * POST /api/announcements/:id/comments
 */
exports.addComment = async (req, res, next) => {
  try {
    const pool = require('../config/db')();
    const { content } = req.body;
    if (!content) throw new AppError('评论内容不能为空', 400);
    await pool.query(
      'INSERT INTO announcement_comments (announcement_id, user_id, content) VALUES (?, ?, ?)',
      [req.params.id, req.userId, content]
    );
    res.json({ success: true, message: '评论成功' });
  } catch (error) {
    next(error);
  }
};

/**
 * 删除公告评论
 * DELETE /api/announcements/:id/comments/:commentId
 */
exports.deleteComment = async (req, res, next) => {
  try {
    const pool = require('../config/db')();
    await pool.query('DELETE FROM announcement_comments WHERE id = ? AND announcement_id = ?', [req.params.commentId, req.params.id]);
    res.json({ success: true, message: '评论已删除' });
  } catch (error) {
    next(error);
  }
};

// ==================== 管理员接口 ====================

/**
 * 创建公告（管理员）
 * POST /api/announcements/admin
 */
exports.create = async (req, res, next) => {
  try {
    const {
      type,
      title,
      summary,
      content,
      coverImage,
      images,
      status = 'published',
      isTop,
      isPopup,
      isImportant,
      displayOrder,
      visibility,
      targetSchools,
      targetRoles,
      targetUsers,
      publishTime,
      expireTime,
      tags,
      relatedCarpool,
    } = req.body;

    if (!type || !title || !content) {
      throw new AppError('公告类型、标题和内容不能为空', 400);
    }

    const announcement = await Announcement.create({
      publisher: req.adminId,
      publisherSnapshot: {
        nickName: req.admin.nickName,
        avatarUrl: req.admin.avatarUrl || '',
      },
      type,
      title,
      summary: summary || '',
      content,
      coverImage: coverImage || '',
      images: images || [],
      status,
      isTop: isTop || false,
      isPopup: isPopup || false,
      isImportant: isImportant || false,
      displayOrder: displayOrder || 0,
      visibility: visibility || 'all',
      targetSchools: targetSchools || [],
      targetRoles: targetRoles || [],
      targetUsers: targetUsers || [],
      publishTime: publishTime ? new Date(publishTime) : new Date(),
      expireTime: expireTime ? new Date(expireTime) : null,
      tags: tags || [],
      relatedCarpool: relatedCarpool || null,
    });

    // 如果是重要公告，给所有用户发通知
    if (isImportant && status === 'published') {
      // 异步发送通知，不阻塞响应
      setImmediate(async () => {
        try {
          const users = await User.find({ status: 'active' });
          const notifications = users.map((u) => ({
            recipient: u.id,
            sender: req.adminId,
            senderSnapshot: {
              nickName: '系统公告',
              avatarUrl: '',
            },
            type: 'system',
            title: `📢 ${title}`,
            content: summary || content.slice(0, 200),
            priority: 'high',
          }));
          // 分批插入避免内存溢出
          const batchSize = 500;
          for (let i = 0; i < notifications.length; i += batchSize) {
            await Notification.insertMany(
              notifications.slice(i, i + batchSize)
            );
          }
        } catch (err) {
          console.error('发送公告通知失败:', err.message);
        }
      });
    }

    res.status(201).json({
      success: true,
      message: '公告创建成功',
      data: announcement,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 更新公告（管理员）
 * PUT /api/announcements/admin/:id
 */
exports.update = async (req, res, next) => {
  try {
    const allowedFields = [
      'type', 'title', 'summary', 'content', 'coverImage', 'images',
      'status', 'isTop', 'isPopup', 'isImportant', 'displayOrder',
      'visibility', 'targetSchools', 'targetRoles', 'targetUsers',
      'publishTime', 'expireTime', 'tags', 'relatedCarpool',
    ];

    const updates = {};
    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        if (['publishTime', 'expireTime'].includes(field) && req.body[field]) {
          updates[field] = new Date(req.body[field]);
        } else {
          updates[field] = req.body[field];
        }
      }
    });

    const announcement = await Announcement.findByIdAndUpdate(
      req.params.id,
      updates,
      { new: true, runValidators: true }
    );

    if (!announcement) {
      throw new AppError('公告不存在', 404);
    }

    res.json({
      success: true,
      message: '公告更新成功',
      data: announcement,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 删除公告（管理员）
 * DELETE /api/announcements/admin/:id
 */
exports.remove = async (req, res, next) => {
  try {
    const announcement = await Announcement.findByIdAndDelete(req.params.id);

    if (!announcement) {
      throw new AppError('公告不存在', 404);
    }

    res.json({
      success: true,
      message: '公告已删除',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 获取管理端公告列表（管理员）
 * GET /api/announcements/admin/list
 */
exports.getAdminList = async (req, res, next) => {
  try {
    const { status, type, page = 1, pageSize = 20 } = req.query;

    const query = {};
    if (status) query.status = status;
    if (type) query.type = type;

    const [list, total] = await Promise.all([
      Announcement.find(query)
        .sort({ createTime: -1 })
        .skip((parseInt(page) - 1) * parseInt(pageSize))
        .limit(parseInt(pageSize))
        .populate('publisher', 'nickName'),
      Announcement.countDocuments(query),
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
