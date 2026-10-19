const { User, Carpool, Review } = require('../models');
const { AppError } = require('../middleware/auth');
const { getRandomNickname } = require('../services/randomProfile');

/**
 * 随机生成一个昵称（优先未用过的组合，用完标记）
 * GET /api/user/random-nickname
 */
exports.getRandomNickname = async (req, res, next) => {
  try {
    const nickname = await getRandomNickname();
    if (!nickname) {
      throw new AppError('昵称池已用完，请联系管理员扩充', 500);
    }
    res.json({ success: true, data: { nickname } });
  } catch (error) {
    next(error);
  }
};

/**
 * 获取个人资料
 * GET /api/user/profile
 */
exports.getProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.userId);

    if (!user) {
      throw new AppError('用户不存在', 404);
    }

    res.json({
      success: true,
      data: user.toSafeObject(),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 获取指定用户公开资料
 * GET /api/user/profile/:userId
 */
exports.getPublicProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.userId);

    if (!user) {
      throw new AppError('用户不存在', 404);
    }

    // 只返回公开字段
    const publicFields = ['nickName', 'avatarUrl', 'gender', 'school', 'department',
      'grade', 'creditScore', 'tripCount', 'goodRate', 'totalReviews', 'bio',
      'createTime', 'user_id_code'];
    const publicUser = {};
    for (const f of publicFields) {
      if (user[f] !== undefined) publicUser[f] = user[f];
    }
    publicUser._id = user._id;
    publicUser.id = user.id;

    res.json({
      success: true,
      data: publicUser,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 更新个人资料
 * PUT /api/user/profile
 */
exports.updateProfile = async (req, res, next) => {
  try {
    const allowedFields = [
      'nickName',
      'avatarUrl',
      'realName',
      'gender',
      'birthday',
      'bio',
      'school',
      'studentId',
      'department',
      'grade',
      'role',
      'preferences',
      'wechat_id',
      'qq',
      'email',
      'phone',
      'dormCommunity',
      'dormBuilding',
      'dormGate',
      'tags',
    ];

    const updates = {};
    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    });
    console.log('[updateProfile] updates:', JSON.stringify(updates, null, 2));

    if (Object.keys(updates).length === 0) {
      throw new AppError('没有需要更新的字段', 400);
    }

    const user = await User.findByIdAndUpdate(
      req.userId,
      { $set: updates },
      { new: true, runValidators: true }
    );

    res.json({
      success: true,
      message: '资料更新成功',
      data: user.toSafeObject(),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 绑定手机号
 * PUT /api/user/bind-phone
 */
exports.bindPhone = async (req, res, next) => {
  try {
    const { phone, password } = req.body;

    if (!phone || !password) {
      throw new AppError('手机号和密码不能为空', 400);
    }

    // 检查手机号是否已被绑定
    const existing = await User.findOne({ phone });
    if (existing && existing.id != req.userId) {
      throw new AppError('该手机号已被其他账号绑定', 409);
    }

    const user = await User.findById(req.userId);
    user.phone = phone;
    user.password = password;
    user.isVerified = true;
    await user.save();

    res.json({
      success: true,
      message: '手机号绑定成功',
      data: user.toSafeObject(),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 绑定微信
 * PUT /api/user/bind-wechat
 */
exports.bindWechat = async (req, res, next) => {
  try {
    const { code } = req.body;

    if (!code) {
      throw new AppError('缺少微信 code', 400);
    }

    // 调用微信接口（或开发环境模拟）
    let openid = code;
    if (process.env.NODE_ENV === 'production') {
      // 实际环境调用微信接口
      const axios = require('axios');
      const wechatRes = await axios.get(
        'https://api.weixin.qq.com/sns/jscode2session',
        {
          params: {
            appid: process.env.WECHAT_APPID,
            secret: process.env.WECHAT_SECRET,
            js_code: code,
            grant_type: 'authorization_code',
          },
        }
      );
      if (wechatRes.data.errcode) {
        throw new AppError(`微信绑定失败: ${wechatRes.data.errmsg}`, 400);
      }
      openid = wechatRes.data.openid;
    }

    // 检查是否已被绑定
    const existing = await User.findOne({ openid });
    if (existing && existing.id != req.userId) {
      throw new AppError('该微信已被其他账号绑定', 409);
    }

    const user = await User.findById(req.userId);
    user.openid = openid;
    await user.save();

    res.json({
      success: true,
      message: '微信绑定成功',
      data: user.toSafeObject(),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 获取个人统计
 * GET /api/user/statistics
 */
exports.getStatistics = async (req, res, next) => {
  try {
    const user = await User.findById(req.userId);

    const pool = require('../config/db')();
    const [[activePub]] = await pool.query(
      "SELECT COUNT(*) as cnt FROM module_posts WHERE module = 'carpool' AND creator_id = ? AND status = 'active'",
      [req.userId]
    );
    const [[activeJoined]] = await pool.query(
      "SELECT COUNT(*) as cnt FROM content_participants cp INNER JOIN module_posts m ON cp.content_id = m.id WHERE cp.user_id = ? AND cp.status = 'joined' AND m.module = 'carpool' AND m.status IN ('active', 'full')",
      [req.userId]
    );

    res.json({
      success: true,
      data: {
        tripCount: user.tripCount,
        publishCount: user.publishCount,
        joinCount: user.joinCount,
        cancelCount: user.cancelCount,
        creditScore: user.creditScore,
        goodRate: user.goodRate,
        totalReviews: user.totalReviews,
        positiveReviews: user.positiveReviews,
        activePublished: activePub.cnt,
        activeJoined: activeJoined.cnt,
      },
    });
  } catch (error) {
    next(error);
  }
};

exports.updateCredit = async (req, res, next) => {
  try {
    const { userId, score, reason } = req.body;

    if (!userId || score === undefined) {
      throw new AppError('缺少必要参数', 400);
    }

    const targetUser = await User.findById(userId);
    if (!targetUser) {
      throw new AppError('用户不存在', 404);
    }

    const oldScore = targetUser.creditScore;
    targetUser.creditScore = Math.min(110, Math.max(0, score));

    // 自动封禁规则：信用分低于 80 分 → 自动临时封禁 1 个月
    if (targetUser.creditScore < 80 && targetUser.status === 'active') {
      const banExpiresAt = new Date();
      banExpiresAt.setMonth(banExpiresAt.getMonth() + 1);
      targetUser.status = 'disabled';
      targetUser.banExpiresAt = banExpiresAt;
    }

    await targetUser.save();

    // 创建信用分变更通知
    const { Notification } = require('../models');
    await Notification.create({
      recipient: userId,
      sender: req.userId,
      senderSnapshot: {
        nickName: req.user.nickName,
        avatarUrl: req.user.avatarUrl,
      },
      type: 'credit_change',
      title: '信用分变更',
      content: reason || `信用分从 ${oldScore} 调整为 ${targetUser.creditScore}`,
      priority: 'normal',
      extraData: { oldScore, newScore: targetUser.creditScore, reason },
    });

    res.json({
      success: true,
      message: '信用分更新成功',
      data: { oldScore, newScore: targetUser.creditScore },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 获取信用变动记录
 * GET /api/user/credit-records
 */
exports.getCreditRecords = async (req, res, next) => {
  try {
    const { page = 1, pageSize = 20 } = req.query;
    const { Notification } = require('../models');
    const pool = require('../config/db')();

    const [rows] = await pool.query(
      `SELECT id, title, extraData, createTime
       FROM notifications
       WHERE recipient_id = ? AND type = 'credit_change'
       ORDER BY createTime DESC
       LIMIT ? OFFSET ?`,
      [req.userId, parseInt(pageSize), (parseInt(page) - 1) * parseInt(pageSize)]
    );

    const [[{total}]] = await pool.query(
      `SELECT COUNT(*) as total
       FROM notifications
       WHERE recipient_id = ? AND type = 'credit_change'`,
      [req.userId]
    );

    const list = rows.map(row => {
      let change = 0;
      let title = row.title;
      try {
        const extra = row.extraData || {};
        if (extra.oldScore !== undefined && extra.newScore !== undefined) {
          change = extra.newScore - extra.oldScore;
        }
      } catch (e) {}
      return {
        id: row.id,
        title,
        change,
        createTime: row.create_time,
      };
    });

    res.json({
      success: true,
      data: {
        list,
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
 * 搜索用户
 * GET /api/user/search?keyword=xxx
 */
exports.searchUsers = async (req, res, next) => {
  try {
    const { keyword, page = 1, pageSize = 20 } = req.query;

    if (!keyword) {
      throw new AppError('请输入搜索关键词', 400);
    }

    const regex = new RegExp(keyword, 'i');
    const query = {
      $or: [
        { nickName: regex },
        { realName: regex },
        { studentId: regex },
        { phone: regex },
        { user_id_code: regex },
      ],
      status: 'active',
    };

    const [list, total] = await Promise.all([
      User.find(query)
        .select('nickName avatarUrl gender school department creditScore tripCount goodRate user_id_code')
        .skip((parseInt(page) - 1) * parseInt(pageSize))
        .limit(parseInt(pageSize)),
      User.countDocuments(query),
    ]);

    res.json({
      success: true,
      data: { list, total, page: parseInt(page), pageSize: parseInt(pageSize) },
    });
  } catch (error) {
    next(error);
  }
};
