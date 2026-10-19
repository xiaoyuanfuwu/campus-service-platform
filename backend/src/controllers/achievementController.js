/**
 * 校园成就控制器 — 赛道 + 成就项 + 用户进度
 */
const { AchievementTrack, AchievementItem, UserAchievement } = require('../models');
const { authenticate, optionalAuth } = require('../middleware/auth');

// ========== 获取用户成就总进度 ==========
exports.getProgress = async (req, res, next) => {
  try {
    const userId = req.userId;
    const tracks = await AchievementTrack.find({ is_active: 1 }).sort({ sort_order: 1, id: 1 });

    const result = await Promise.all(tracks.map(async (track) => {
      const total = await AchievementItem.countDocuments({ track_key: track.track_key, is_active: 1 });
      let unlocked = 0;
      let recent = [];

      if (userId) {
        const approved = await AchievementItem.find({
          track_key: track.track_key,
          item_key: {
            $in: (
              await UserAchievement.find({ user_id: userId, track_key: track.track_key, status: 'approved' })
            ).map(ua => ua.item_key)
          }
        });
        unlocked = approved.length;

        // 最近解锁（最近3条）
        const recentUA = await UserAchievement.find({
          user_id: userId, track_key: track.track_key, status: 'approved'
        }).sort({ updateTime: -1 }).limit(3);
        recent = recentUA.map(ua => ({ itemKey: ua.item_key, unlockedAt: ua.updateTime }));
      }

      return {
        key: track.track_key,
        theme: track.theme || track.track_key,
        icon: track.icon || '',
        icon_img: track.icon_img || '',
        name: track.name,
        desc: track.description || '',
        unlocked,
        total,
        recent,
      };
    }));

    const totalAll = result.reduce((s, t) => s + t.total, 0);
    const unlockedAll = result.reduce((s, t) => s + t.unlocked, 0);
    const progressPercent = totalAll > 0 ? Math.round((unlockedAll / totalAll) * 100) : 0;

    res.json({
      success: true,
      data: {
        tracks: result,
        unlockedCount: unlockedAll,
        totalCount: totalAll,
        progressPercent,
      }
    });
  } catch (err) {
    next(err);
  }
};

// ========== 获取赛道详情（含用户状态） ==========
exports.getTrackDetail = async (req, res, next) => {
  try {
    const { trackKey } = req.params;
    const userId = req.userId;

    const track = await AchievementTrack.findOne({ track_key: trackKey, is_active: 1 });
    if (!track) {
      return res.status(404).json({ success: false, message: '赛道不存在' });
    }

    const allItems = await AchievementItem.find({ track_key: trackKey, is_active: 1 }).sort({ sort_order: 1, id: 1 });

    // 获取用户在该赛道的状态
    let userStatusMap = {};
    if (userId) {
      const userAchievements = await UserAchievement.find({ user_id: userId, track_key: trackKey });
      userStatusMap = {};
      userAchievements.forEach(ua => {
        userStatusMap[ua.item_key] = ua.status;
      });
    }

    let unlocked = 0;
    const items = allItems.map(item => {
      const status = userStatusMap[item.item_key] || 'none';
      if (status === 'approved') unlocked++;
      return {
        key: item.item_key,
        icon: item.icon || '',
        name: item.name,
        desc: item.description || '',
        status,
        statusLabel: status === 'approved' ? '已点亮' : status === 'pending' ? '审核中' : status === 'rejected' ? '未通过' : '未解锁',
      };
    });

    res.json({
      success: true,
      data: {
        trackKey: track.track_key,
        trackName: track.name,
        trackTheme: track.theme || track.track_key,
        items,
        unlocked,
      }
    });
  } catch (err) {
    next(err);
  }
};

// ========== 获取当前用户的成就提交列表 ==========
exports.getMySubmissions = async (req, res, next) => {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ success: false, message: '未登录' });
    }

    // 取当前用户所有 UserAchievement 记录
    const submissions = await UserAchievement.find({ user_id: userId }).sort({ createTime: -1 });

    // 一次性把涉及的 item / track 信息拉出来
    const trackKeys = [...new Set(submissions.map(s => s.track_key))];
    const itemKeys = [...new Set(submissions.map(s => s.item_key))];

    const tracks = await AchievementTrack.find({ track_key: { $in: trackKeys } });
    const trackMap = {};
    tracks.forEach(t => {
      trackMap[t.track_key] = { name: t.name, theme: t.theme || t.track_key, icon: t.icon || '' };
    });

    const items = await AchievementItem.find({
      item_key: { $in: itemKeys },
      track_key: { $in: trackKeys },
    });
    const itemMap = {};
    items.forEach(it => {
      itemMap[`${it.track_key}::${it.item_key}`] = { name: it.name, icon: it.icon || '' };
    });

    const list = submissions.map(s => {
      const itemInfo = itemMap[`${s.track_key}::${s.item_key}`] || {};
      const trackInfo = trackMap[s.track_key] || {};
      return {
        id: s.id,
        track: s.track_key,
        trackName: trackInfo.name || s.track_key,
        trackTheme: trackInfo.theme,
        trackIcon: trackInfo.icon,
        itemKey: s.item_key,
        title: itemInfo.name || s.item_key,
        itemName: itemInfo.name || s.item_key,
        itemIcon: itemInfo.icon,
        status: s.status,
        images: s.image_url ? [s.image_url] : [],
        image_url: s.image_url,
        note: s.note || '',
        reviewRemark: s.review_remark || '',
        reviewedBy: s.reviewed_by || null,
        reviewedAt: s.reviewed_at,
        createTime: s.createTime,
        updateTime: s.updateTime,
      };
    });

    res.json({ success: true, data: list });
  } catch (err) {
    next(err);
  }
};// ========== 提交成就验证 ==========
exports.submitAchievement = async (req, res, next) => {
  try {
    const { trackKey, itemKey } = req.params;
    const userId = req.userId;
    const { image, note } = req.body;

    // 确认成就项存在
    const item = await AchievementItem.findOne({ track_key: trackKey, item_key: itemKey, is_active: 1 });
    if (!item) {
      return res.status(404).json({ success: false, message: '成就项不存在' });
    }

    // 检查是否已提交（防止重复）
    const existing = await UserAchievement.findOne({ user_id: userId, track_key: trackKey, item_key: itemKey });
    if (existing) {
      if (existing.status === 'approved') {
        return res.status(400).json({ success: false, message: '该成就已解锁' });
      }
      if (existing.status === 'pending') {
        return res.status(400).json({ success: false, message: '该成就正在审核中' });
      }
      // rejected 状态允许重新提交
      await UserAchievement.findByIdAndUpdate(existing.id, {
        $set: { status: 'pending', image_url: image || '', note: note || '', updateTime: new Date() }
      });
    } else {
      await UserAchievement.create({
        user_id: userId,
        track_key: trackKey,
        item_key: itemKey,
        status: 'pending',
        image_url: image || '',
        note: note || '',
      });
    }

    res.json({
      success: true,
      message: '提交成功，等待审核',
      data: { trackKey, itemKey, status: 'pending' }
    });
  } catch (err) {
    next(err);
  }
};


// ========== 管理端：成就审核 ==========

/**
 * GET /api/admin/achievement/pending
 * 获取待审核列表（支持分页/赛道筛选）
 */
exports.adminGetPendingList = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const pageSize = Math.min(100, Math.max(1, parseInt(req.query.pageSize) || 20));
    const trackKey = req.query.trackKey || '';
    const status = req.query.status || 'pending';

    const conditions = {};
    if (status) conditions.status = status;
    if (trackKey) conditions.track_key = trackKey;

    const [list, total] = await Promise.all([
      UserAchievement.find(conditions)
        .sort({ createTime: -1 })
        .limit(pageSize)
        .skip((page - 1) * pageSize)
        .exec(),
      UserAchievement.countDocuments(conditions),
    ]);

    // 附加用户信息
    const { User } = require('../models');
    const enriched = await Promise.all(list.map(async (ua) => {
      const user = await User.findById(ua.user_id).catch(() => null);
      return {
        id: ua.id,
        userId: ua.user_id,
        trackKey: ua.track_key,
        itemKey: ua.item_key,
        status: ua.status,
        imageUrl: ua.image_url || '',
        note: ua.note || '',
        reviewedBy: ua.reviewed_by,
        reviewedAt: ua.reviewed_at,
        reviewRemark: ua.review_remark || '',
        createTime: ua.createTime,
        updateTime: ua.updateTime,
        userNickname: user ? (user.nickname || user.username || '用户' + ua.user_id) : '用户' + ua.user_id,
        userAvatar: user ? (user.avatarUrl || '') : '',
      };
    }));

    res.json({
      success: true,
      data: {
        list: enriched,
        pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * PUT /api/admin/achievement/:id/approve
 * 审核通过
 */
exports.adminApproveSubmission = async (req, res, next) => {
  try {
    const { id } = req.params;
    const adminId = req.adminId || req.userId || 0;
    const { remark } = req.body;

    const existing = await UserAchievement.findById(id);
    if (!existing) {
      return res.status(404).json({ success: false, message: '记录不存在' });
    }
    if (existing.status === 'approved') {
      return res.json({ success: false, message: '该记录已通过审核' });
    }

    const updated = await UserAchievement.findByIdAndUpdate(id, {
      $set: {
        status: 'approved',
        reviewed_by: adminId,
        reviewed_at: new Date(),
        review_remark: remark || '审核通过',
      },
    });

    res.json({
      success: true,
      data: { id: updated.id, userId: updated.user_id, trackKey: updated.track_key, itemKey: updated.item_key, status: 'approved' },
      message: '已通过',
    });
  } catch (err) {
    next(err);
  }
};

/**
 * PUT /api/admin/achievement/:id/reject
 * 审核拒绝
 */
exports.adminRejectSubmission = async (req, res, next) => {
  try {
    const { id } = req.params;
    const adminId = req.adminId || req.userId || 0;
    const { remark } = req.body;

    const existing = await UserAchievement.findById(id);
    if (!existing) {
      return res.status(404).json({ success: false, message: '记录不存在' });
    }

    const updated = await UserAchievement.findByIdAndUpdate(id, {
      $set: {
        status: 'rejected',
        reviewed_by: adminId,
        reviewed_at: new Date(),
        review_remark: remark || '审核未通过',
      },
    });

    res.json({
      success: true,
      data: { id: updated.id, userId: updated.user_id, trackKey: updated.track_key, itemKey: updated.item_key, status: 'rejected' },
      message: '已拒绝',
    });
  } catch (err) {
    next(err);
  }
};
