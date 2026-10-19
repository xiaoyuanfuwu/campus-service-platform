const { Carpool, User, Notification, Favorite } = require('../models');
const { AppError } = require('../middleware/auth');

/**
 * 获取拼车列表
 * GET /api/carpools
 * Query: type, status, from, to, keyword, sortBy, page, pageSize
 */
exports.getList = async (req, res, next) => {
  try {
    // 惰性更新：查询前先把超过出发时间的进行中拼车标记为已结束（只改状态，不删除记录）
    await Carpool.markExpired().catch(() => {});

    const {
      type,           // find | offer
      status,         // active | full | ended
      from,
      to,
      keyword,
      sortBy = 'createTime',
      page = 1,
      pageSize = 10,
    } = req.query;

    // 构建查询条件
    const query = {};

    // 默认只显示进行中的（除非明确指定 status）
    if (status) {
      query.status = status;
    } else {
      query.status = { $in: ['active', 'full'] };
    }

    if (type) {
      query.type = type;
    }

    if (from) {
      query.from = new RegExp(from, 'i');
    }

    if (to) {
      query.to = new RegExp(to, 'i');
    }

    if (keyword) {
      const regex = new RegExp(keyword, 'i');
      query.$or = [
        { from: regex },
        { to: regex },
        { note: regex },
        { tags: regex },
      ];
    }

    // 排序映射
    const sortMap = {
      createTime: { createTime: -1 },
      departureTime: { departureTime: 1 },
      price: { price: 1 },
      remainSeats: { remainSeats: -1 },
      creditScore: { 'creatorSnapshot.creditScore': -1 },
    };

    const sort = sortMap[sortBy] || sortMap.createTime;

    const skip = (parseInt(page) - 1) * parseInt(pageSize);
    const limit = parseInt(pageSize);

    const [list, total] = await Promise.all([
      Carpool.find(query)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .populate('creator', 'nickName avatarUrl creditScore gender school'),
      Carpool.countDocuments(query),
    ]);

    // 为每个拼车添加 isJoined 和 isCreator 标记
    const userId = req.user ? req.userId.toString() : null;
    const listWithFlags = list.map(item => {
      const obj = item.toObject ? item.toObject() : item;
      if (userId) {
        obj.isCreator = obj.creator && String(obj.creator._id || obj.creator.id || obj.creator) === userId;
        obj.isJoined = (obj.participants || []).some(
          p => String(p.user?._id || p.user) === userId && p.status === 'joined'
        );
      } else {
        obj.isCreator = false;
        obj.isJoined = false;
      }
      return obj;
    });

    res.json({
      success: true,
      data: {
        list: listWithFlags,
        total,
        page: parseInt(page),
        pageSize: limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 获取拼车详情
 * GET /api/carpools/:id
 */
exports.getDetail = async (req, res, next) => {
  try {
    const carpool = await Carpool.findById(req.params.id)
      .populate('creator', 'nickName avatarUrl creditScore gender school bio tripCount goodRate')
      ;

    if (!carpool) {
      throw new AppError('拼车信息不存在', 404);
    }

    // 增加浏览量
    carpool.viewCount = (carpool.viewCount || 0) + 1;
    await carpool.save();

    // 检查当前用户是否已加入
    let isJoined = false;
    let isCreator = false;
    let isFavorited = false;

    if (req.user) {
      isCreator = carpool.creator._id.toString() === req.userId.toString();
      isJoined = carpool.participants.some(
        (p) => p.user?._id?.toString() === req.userId.toString() && p.status === 'joined'
      );

      const fav = await Favorite.findOne({
        user: req.userId,
        carpool: carpool._id,
      });
      isFavorited = !!fav;
    }

    res.json({
      success: true,
      data: {
        ...carpool.toObject(),
        isJoined,
        isCreator,
        isFavorited,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 发布拼车
 * POST /api/carpools
 */
exports.create = async (req, res, next) => {
  try {
    const {
      from,
      to,
      fromDetail,
      toDetail,
      departureTime,
      totalSeats,
      type,
      contact,
      contactType,
      note,
      tags,
      price,
      priceNote,
      vehicleInfo,
      deadlineTime,
      images,
    } = req.body;

    // 参数校验
    if (!from || !to) {
      throw new AppError('出发地和目的地不能为空', 400);
    }
    if (!departureTime) {
      throw new AppError('出发时间不能为空', 400);
    }
    if (!totalSeats || totalSeats < 1) {
      throw new AppError('总人数至少为1', 400);
    }
    if (!contact) {
      throw new AppError('联系方式不能为空', 400);
    }
    if (!type || !['find', 'offer'].includes(type)) {
      throw new AppError('拼车类型不正确', 400);
    }

    // 出发时间不能是过去
    if (new Date(departureTime) < new Date()) {
      throw new AppError('出发时间不能是过去', 400);
    }

    // 获取用户信息
    const user = await User.findById(req.userId);

    // 创建拼车
    const carpool = await Carpool.create({
      creator: req.userId,
      creatorSnapshot: {
        nickName: user.nickName,
        avatarUrl: user.avatarUrl,
        creditScore: user.creditScore,
        gender: user.gender,
        school: user.school,
      },
      from,
      to,
      fromDetail: fromDetail || '',
      toDetail: toDetail || '',
      departureTime: new Date(departureTime),
      deadlineTime: deadlineTime ? new Date(deadlineTime) : null,
      totalSeats: parseInt(totalSeats),
      remainSeats: parseInt(totalSeats), // 发布者自己不占位，由发布者自己决定
      type,
      contact,
      contactType: contactType || 'phone',
      note: note || '',
      tags: tags || [],
      price: price || 0,
      priceNote: priceNote || '',
      vehicleInfo: vehicleInfo || {},
      images: images || [],
    });

    // 更新用户发布次数
    user.publishCount = (user.publishCount || 0) + 1;
    user.tripCount = (user.tripCount || 0) + 1;
    await user.save();

    res.status(201).json({
      success: true,
      message: '发布成功',
      data: carpool,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 更新拼车信息
 * PUT /api/carpools/:id
 */
exports.update = async (req, res, next) => {
  try {
    const carpool = await Carpool.findById(req.params.id);

    if (!carpool) {
      throw new AppError('拼车信息不存在', 404);
    }

    if (carpool.creator.toString() !== req.userId.toString()) {
      throw new AppError('只能修改自己发布的拼车', 403);
    }

    if (carpool.status !== 'active') {
      throw new AppError('只能修改进行中的拼车', 400);
    }

    const allowedFields = [
      'from',
      'to',
      'fromDetail',
      'toDetail',
      'departureTime',
      'deadlineTime',
      'totalSeats',
      'contact',
      'contactType',
      'note',
      'tags',
      'price',
      'priceNote',
      'vehicleInfo',
      'images',
    ];

    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        if (field === 'totalSeats') {
          const newTotal = parseInt(req.body[field]);
          const joinedCount = carpool.participants.filter(
            (p) => p.status === 'joined'
          ).length;
          if (newTotal < joinedCount) {
            throw new AppError(`总人数不能小于已加入人数(${joinedCount})`, 400);
          }
          carpool[field] = newTotal;
          carpool.remainSeats = newTotal - joinedCount;
        } else {
          carpool[field] = req.body[field];
        }
      }
    });

    await carpool.save();

    res.json({
      success: true,
      message: '更新成功',
      data: carpool,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 删除拼车（软删除 -> 取消）
 * DELETE /api/carpools/:id
 */
exports.remove = async (req, res, next) => {
  try {
    const carpool = await Carpool.findById(req.params.id);

    if (!carpool) {
      throw new AppError('拼车信息不存在', 404);
    }

    if (carpool.creator.toString() !== req.userId.toString()) {
      throw new AppError('只能取消自己发布的拼车', 403);
    }

    if (['ended', 'cancelled', 'expired'].includes(carpool.status)) {
      throw new AppError('该拼车已经结束或已取消', 400);
    }

    carpool.status = 'cancelled';
    carpool.cancelReason = req.body.reason || '发布者取消';
    await carpool.save();

    // 通知所有参与者
    const joinedParticipants = carpool.participants.filter(
      (p) => p.status === 'joined'
    );

    if (joinedParticipants.length > 0) {
      const notifications = joinedParticipants.map((p) => ({
        recipient: p.user,
        sender: req.userId,
        senderSnapshot: {
          nickName: req.user.nickName,
          avatarUrl: req.user.avatarUrl,
        },
        type: 'carpool_cancelled',
        title: '拼车已取消',
        content: `${req.user.nickName} 取消了 ${carpool.from} → ${carpool.to} 的拼车`,
        relatedCarpool: carpool._id,
        priority: 'high',
      }));
      await Notification.insertMany(notifications);
    }

    // 更新用户取消次数
    await User.findByIdAndUpdate(req.userId, {
      $inc: { cancelCount: 1 },
    });

    res.json({
      success: true,
      message: '拼车已取消',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 加入拼车
 * POST /api/carpools/:id/join
 */
exports.join = async (req, res, next) => {
  try {
    const { contact, note } = req.body;
    const carpool = await Carpool.findById(req.params.id);

    if (!carpool) {
      throw new AppError('拼车信息不存在', 404);
    }

    if (carpool.status !== 'active' && carpool.status !== 'full') {
      throw new AppError('该拼车已无法加入', 400);
    }

    if (carpool.creator.toString() === req.userId.toString()) {
      throw new AppError('不能加入自己发布的拼车', 400);
    }

    // 检查是否已加入
    const alreadyJoined = carpool.participants.some(
      (p) =>
        p.user.toString() === req.userId.toString() && p.status === 'joined'
    );
    if (alreadyJoined) {
      throw new AppError('你已经加入了这个拼车', 400);
    }

    if (carpool.remainSeats <= 0) {
      throw new AppError('人数已满', 400);
    }

    // 添加参与者
    const user = await User.findById(req.userId);
    carpool.participants.push({
      user: req.userId,
      nickName: user.nickName,
      avatarUrl: user.avatarUrl,
      creditScore: user.creditScore,
      contact: contact || user.phone || '',
      note: note || '',
      status: 'joined',
    });

    carpool.remainSeats -= 1;

    if (carpool.remainSeats === 0) {
      carpool.status = 'full';
    }

    await carpool.save();

    // 更新用户统计
    user.joinCount = (user.joinCount || 0) + 1;
    user.tripCount = (user.tripCount || 0) + 1;
    await user.save();

    // 通知发布者
    await Notification.create({
      recipient: carpool.creator,
      sender: req.userId,
      senderSnapshot: {
        nickName: user.nickName,
        avatarUrl: user.avatarUrl,
      },
      type: 'new_participant',
      title: '有人加入了你的拼车',
      content: `${user.nickName} 加入了 ${carpool.from} → ${carpool.to} 的拼车`,
      relatedCarpool: carpool._id,
      relatedUser: req.userId,
      priority: 'normal',
    });

    res.json({
      success: true,
      message: '加入成功',
      data: {
        remainSeats: carpool.remainSeats,
        status: carpool.status,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 取消加入
 * POST /api/carpools/:id/cancel
 */
exports.cancelJoin = async (req, res, next) => {
  try {
    const carpool = await Carpool.findById(req.params.id);

    if (!carpool) {
      throw new AppError('拼车信息不存在', 404);
    }

    const participant = carpool.participants.find(
      (p) =>
        p.user.toString() === req.userId.toString() && p.status === 'joined'
    );

    if (!participant) {
      throw new AppError('你未加入此拼车', 400);
    }

    participant.status = 'cancelled';
    carpool.remainSeats += 1;

    if (carpool.status === 'full') {
      carpool.status = 'active';
    }

    await carpool.save();

    // 更新用户取消次数
    await User.findByIdAndUpdate(req.userId, {
      $inc: { cancelCount: 1 },
    });

    // 通知发布者
    await Notification.create({
      recipient: carpool.creator,
      sender: req.userId,
      senderSnapshot: {
        nickName: req.user.nickName,
        avatarUrl: req.user.avatarUrl,
      },
      type: 'participant_left',
      title: '有人退出了你的拼车',
      content: `${req.user.nickName} 退出了 ${carpool.from} → ${carpool.to} 的拼车`,
      relatedCarpool: carpool._id,
      priority: 'normal',
    });

    res.json({
      success: true,
      message: '已取消加入',
      data: {
        remainSeats: carpool.remainSeats,
        status: carpool.status,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 结束拼车
 * POST /api/carpools/:id/end
 */
exports.endCarpool = async (req, res, next) => {
  try {
    const carpool = await Carpool.findById(req.params.id);

    if (!carpool) {
      throw new AppError('拼车信息不存在', 404);
    }

    if (carpool.creator.toString() !== req.userId.toString()) {
      throw new AppError('只能结束自己发布的拼车', 403);
    }

    if (carpool.status !== 'active' && carpool.status !== 'full') {
      throw new AppError('该拼车已结束', 400);
    }

    carpool.status = 'ended';
    await carpool.save();

    // 完成拼车 → 给发布者和参与者增加信用分
    const INITIAL_CREDIT = parseInt(process.env.INITIAL_CREDIT) || 100;
    const PUBLISH_CREDIT_BONUS = parseInt(process.env.PUBLISH_CREDIT_BONUS) || 5;
    const JOIN_CREDIT_BONUS = parseInt(process.env.JOIN_CREDIT_BONUS) || 2;

    // 给发布者加分
    const creator = await User.findById(carpool.creator);
    if (creator) {
      creator.creditScore = Math.min(110, (creator.creditScore || INITIAL_CREDIT) + PUBLISH_CREDIT_BONUS);
      await creator.save();
    }

    // 给每个参与者加分
    const joinedParticipants = carpool.participants.filter(
      (p) => p.status === 'joined'
    );

    if (joinedParticipants.length > 0) {
      for (const p of joinedParticipants) {
        const participant = await User.findById(p.user);
        if (participant) {
          participant.creditScore = Math.min(110, (participant.creditScore || INITIAL_CREDIT) + JOIN_CREDIT_BONUS);
          await participant.save();
        }
      }

      const notifications = joinedParticipants.map((p) => ({
        recipient: p.user,
        sender: req.userId,
        senderSnapshot: {
          nickName: req.user.nickName,
          avatarUrl: req.user.avatarUrl,
        },
        type: 'carpool_ended',
        title: '拼车已结束',
        content: `${req.user.nickName} 已将 ${carpool.from} → ${carpool.to} 的拼车标记为已结束，快去评价吧~`,
        relatedCarpool: carpool._id,
        priority: 'high',
      }));
      await Notification.insertMany(notifications);
    }

    res.json({
      success: true,
      message: '拼车已结束',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 我发布的拼车
 * GET /api/carpools/my/published
 */
exports.getMyPublished = async (req, res, next) => {
  try {
    const { status, page = 1, pageSize = 10 } = req.query;

    const query = { creator: req.userId };
    if (status) {
      query.status = status;
    }

    const [list, total] = await Promise.all([
      Carpool.find(query)
        .sort({ createTime: -1 })
        .skip((parseInt(page) - 1) * parseInt(pageSize))
        .limit(parseInt(pageSize))
        ,
      Carpool.countDocuments(query),
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
 * 我参与的拼车
 * GET /api/carpools/my/joined
 */
exports.getMyJoined = async (req, res, next) => {
  try {
    const { status, page = 1, pageSize = 10 } = req.query;

    const matchStage = {
      'participants.user': req.userId,
      'participants.status': 'joined',
    };
    if (status) {
      matchStage.status = status;
    }

    const [list, total] = await Promise.all([
      Carpool.find(matchStage)
        .sort({ createTime: -1 })
        .skip((parseInt(page) - 1) * parseInt(pageSize))
        .limit(parseInt(pageSize))
        .populate('creator', 'nickName avatarUrl creditScore')
        ,
      Carpool.countDocuments(matchStage),
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
 * 收藏拼车
 * POST /api/carpools/:id/favorite
 */
exports.favorite = async (req, res, next) => {
  try {
    const carpool = await Carpool.findById(req.params.id);

    if (!carpool) {
      throw new AppError('拼车信息不存在', 404);
    }

    const existing = await Favorite.findOne({
      user: req.userId,
      carpool: carpool._id,
    });

    if (existing) {
      throw new AppError('已收藏', 400);
    }

    await Favorite.create({
      user: req.userId,
      carpool: carpool._id,
    });

    carpool.favoriteCount = (carpool.favoriteCount || 0) + 1;
    await carpool.save();

    // 添加到用户收藏列表
    await User.findByIdAndUpdate(req.userId, {
      $addToSet: { favoriteCarpools: carpool._id },
    });

    res.json({
      success: true,
      message: '收藏成功',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 取消收藏
 * DELETE /api/carpools/:id/favorite
 */
exports.unfavorite = async (req, res, next) => {
  try {
    const result = await Favorite.findOneAndDelete({
      user: req.userId,
      carpool: req.params.id,
    });

    if (!result) {
      throw new AppError('未收藏', 400);
    }

    await Carpool.findByIdAndUpdate(req.params.id, {
      $inc: { favoriteCount: -1 },
    });

    await User.findByIdAndUpdate(req.userId, {
      $pull: { favoriteCarpools: req.params.id },
    });

    res.json({
      success: true,
      message: '已取消收藏',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 我的收藏列表
 * GET /api/carpools/my/favorites
 */
exports.getMyFavorites = async (req, res, next) => {
  try {
    const { page = 1, pageSize = 10 } = req.query;
    const pool = require('../config/db')();

    const [totalR] = await pool.query('SELECT COUNT(*) as cnt FROM favorites WHERE user_id = ?', [req.userId]);
    const total = totalR[0].cnt;

    const [rows] = await pool.query(
      `SELECT f.createTime as favoritedAt, c.*
       FROM favorites f
       INNER JOIN carpools c ON f.carpool_id = c.id
       WHERE f.user_id = ?
       ORDER BY f.createTime DESC
       LIMIT ? OFFSET ?`,
      [req.userId, parseInt(pageSize), (parseInt(page) - 1) * parseInt(pageSize)]
    );

    // Fetch creators
    const creatorIds = [...new Set(rows.map(r => r.creator_id).filter(Boolean))];
    const creatorMap = {};
    if (creatorIds.length > 0) {
      const [creators] = await pool.query(
        'SELECT id, nickName, avatarUrl, creditScore FROM users WHERE id IN (' + creatorIds.map(() => '?').join(',') + ')',
        creatorIds
      );
      for (const c of creators) creatorMap[c.id] = c;
    }

    const list = rows.map(r => {
      const obj = { ...r, creator: creatorMap[r.creator_id] || null };
      // Clean up MySQL column names
      obj.from = obj.from_place;
      obj.to = obj.to_place;
      return obj;
    });

    res.json({
      success: true,
      data: { list, total, page: parseInt(page), pageSize: parseInt(pageSize) },
    });
  } catch (error) {
    next(error);
  }
};
