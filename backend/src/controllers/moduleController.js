/**
 * 模块控制器 — 10 个模块的统一 CRUD + 回复/收藏/统计
 * 路由使用 :module 参数区分模块
 */
const { ModulePost, User, Notification } = require('../models');
const { notifyOrderTaken } = require('../services/wechatNotify');

// 联系方式类型映射（前端中文 → 数据库 ENUM）
const normalizeContactType = (v) => {
  const map = { '微信':'wechat', 'QQ':'qq', '短信':'phone', '电话':'phone', 'wechat':'wechat', 'qq':'qq', 'phone':'phone', 'other':'other' };
  return map[v] || 'other';
};

// 合法模块列表（排除 carpool / announcement，它们有独立系统）
const VALID_MODULES = [
  'express', 'task', 'lost', 'forum', 'secondhand',
  'rental', 'substitute', 'print', 'yellowpage', 'charity',
  'parttime', 'questionbank', 'guide', 'bulletin',
];

function validateModule(module) {
  if (!VALID_MODULES.includes(module)) {
    const err = new Error(`不支持的模块: ${module}`);
    err.statusCode = 400;
    throw err;
  }
}

// ========== 列表 ==========
exports.getList = async (req, res, next) => {
  try {
    const { module } = req.params;
    validateModule(module);

    const { type, keyword, order, page = 1, pageSize = 20, minPrice, maxPrice, status, category } = req.query;
    const result = await ModulePost.getList(module, {
      type: type || 'all',
      keyword: keyword || '',
      minPrice: minPrice ? parseFloat(minPrice) : undefined,
      maxPrice: maxPrice ? parseFloat(maxPrice) : undefined,
      status: status || 'active',
      category: category || '',
    }, {
      page: parseInt(page),
      pageSize: parseInt(pageSize),
      order: order || 'time',
    });

    // 注入收藏状态
    if (req.userId && result.list.length > 0) {
      const postIds = result.list.map(p => p.id);
      // 防御：确保所有 id 有效
      const validIds = postIds.filter(id => id != null);
      if (validIds.length > 0 && validIds.length !== postIds.length) {
        console.error(`[getList] module=${module} 有 ${postIds.length - validIds.length} 个帖子的 id 为 null/undefined`);
      }
      if (validIds.length > 0) {
        try {
          const favMap = await ModulePost.checkFavorited(req.userId, validIds);
          result.list = result.list.map(p => ({ ...p, isFavorited: !!favMap[p.id] }));
        } catch (favErr) {
          console.error(`[getList] module=${module} checkFavorited 失败:`, favErr.message);
          // 收藏状态查询失败不影响列表展示
        }
        // 注入点赞状态
        try {
          const likeMap = await ModulePost.checkLiked(req.userId, validIds);
          result.list = result.list.map(p => ({ ...p, isLiked: !!likeMap[p.id] }));
        } catch (likeErr) {
          console.error(`[getList] module=${module} checkLiked 失败:`, likeErr.message);
        }
      }
    }

    res.json({ success: true, data: result });
  } catch (err) {
    console.error(`[getList] module=${req.params.module} 异常:`, err.message, err.stack);
    next(err);
  }
};

// ========== 详情 ==========
exports.getDetail = async (req, res, next) => {
  try {
    const { module, id } = req.params;
    validateModule(module);

    const post = await ModulePost.getDetail(id, req.userId);
    if (!post) {
      return res.status(404).json({ success: false, message: '帖子不存在或已删除' });
    }
    if (post.module !== module) {
      return res.status(400).json({ success: false, message: '模块不匹配' });
    }
    res.json({ success: true, data: post });
  } catch (err) { next(err); }
};

// ========== 发布 ==========
exports.create = async (req, res, next) => {
  try {
    const { module } = req.params;
    validateModule(module);

    const user = req.user;
    const {
      title, content, type, price, priceNote, contact, contactType,
      notifySubscribe, notifyTemplateId,
      images, tags, location, extra,
    } = req.body;

    // 校验
    if (!title || !title.trim()) {
      return res.status(400).json({ success: false, message: '标题不能为空' });
    }
    if (title.trim().length > 50) {
      return res.status(400).json({ success: false, message: '标题不能超过50字' });
    }
    if (content && content.length > 5000) {
      return res.status(400).json({ success: false, message: '内容不能超过5000字' });
    }

    // 黄页模块 type 固定为 info
    const postType = module === 'yellowpage' ? 'info' : (type || 'offer');

    // 生成摘要
    const summary = (content || '').substring(0, 120);

    // 发帖时刻的等级快照（LV1-10，含当前这帖；与 wallController 同规则，一次性算好存快照，读取零开销）
    let creatorLevel = null;
    try {
      const pool = require('../config/db')();
      const LEVEL_THRESHOLDS = [0, 2, 5, 10, 20, 50, 100, 200, 500, 1000];
      const calcLevel = (count) => {
        let lv = 1;
        for (let i = 0; i < LEVEL_THRESHOLDS.length; i++) {
          if (count >= LEVEL_THRESHOLDS[i]) lv = i + 1;
        }
        return lv;
      };
      const [[mRow]] = await pool.query(
        'SELECT COUNT(*) AS c FROM module_posts WHERE creator_id = ?', [user._id]
      );
      const [[fRow]] = await pool.query(
        'SELECT COUNT(*) AS c FROM forum_posts WHERE creator_id = ?', [user._id]
      );
      creatorLevel = calcLevel((mRow.c || 0) + (fRow.c || 0) + 1);
    } catch (e) {
      console.error('[module create] calc level failed:', e.message);
    }

    const data = {
      module,
      type: postType,
      // 新帖默认待审核，审核通过后才公开展示
      auditStatus: 'pending',
      auditReason: '',
      creator_id: user._id,
      creator_nickName: user.nickName || '',
      creator_avatarUrl: user.avatarUrl || '',
      creator_userCode: user.user_id_code || '',
      creator_creditScore: user.creditScore || 100,
      creator_gender: user.gender || 'secret',
      creator_school: user.school || '',
      creator_level: creatorLevel,
      title: title.trim(),
      content: content || '',
      summary,
      price: price ? parseFloat(price) : 0,
      priceNote: priceNote || '',
      contact: contact || '',
      contactType: normalizeContactType(contactType),
      images: Array.isArray(images) ? JSON.stringify(images) : null,
      tags: Array.isArray(tags) ? JSON.stringify(tags) : null,
      location: location || '',
      extra: (() => {
        const ext = (extra && typeof extra === 'object') ? { ...extra } : {};
        if (notifySubscribe) ext.notifySubscribe = true;
        if (notifyTemplateId) ext.notifyTemplateId = notifyTemplateId;
        return Object.keys(ext).length > 0 ? JSON.stringify(ext) : null;
      })(),
    };

    const post = await ModulePost.create(data);

    res.status(201).json({
      success: true,
      data: ModulePost.formatPost(post),
    });
  } catch (err) { next(err); }
};

// ========== 编辑 ==========
exports.update = async (req, res, next) => {
  try {
    const { module, id } = req.params;
    validateModule(module);

    const post = await ModulePost.findById(id);
    if (!post) {
      return res.status(404).json({ success: false, message: '帖子不存在' });
    }
    if (String(post.creator) !== String(req.userId)) {
      return res.status(403).json({ success: false, message: '只能编辑自己的帖子' });
    }

    const {
      title, content, type, price, priceNote, contact, contactType,
      images, tags, location, extra,
    } = req.body;

    const updateData = {};
    if (title !== undefined) {
      if (!title.trim()) return res.status(400).json({ success: false, message: '标题不能为空' });
      updateData.title = title.trim();
    }
    if (content !== undefined) updateData.content = content;
    if (content !== undefined) updateData.summary = (content || '').substring(0, 120);
    if (type !== undefined) updateData.type = type;
    if (price !== undefined) updateData.price = parseFloat(price);
    if (priceNote !== undefined) updateData.priceNote = priceNote;
    if (contact !== undefined) updateData.contact = contact;
    if (contactType !== undefined) updateData.contactType = normalizeContactType(contactType);
    if (images !== undefined) updateData.images = Array.isArray(images) ? JSON.stringify(images) : null;
    if (tags !== undefined) updateData.tags = Array.isArray(tags) ? JSON.stringify(tags) : null;
    if (location !== undefined) updateData.location = location;
    if (extra !== undefined) updateData.extra = extra && typeof extra === 'object' ? JSON.stringify(extra) : null;

    const updated = await ModulePost.findByIdAndUpdate(id, { $set: updateData });
    res.json({ success: true, data: ModulePost.formatPost(updated) });
  } catch (err) { next(err); }
};

// ========== 删除 ==========
exports.remove = async (req, res, next) => {
  try {
    const { module, id } = req.params;
    validateModule(module);

    const post = await ModulePost.findById(id);
    if (!post) {
      return res.status(404).json({ success: false, message: '帖子不存在' });
    }
    if (String(post.creator) !== String(req.userId)) {
      return res.status(403).json({ success: false, message: '只能删除自己的帖子' });
    }

    await ModulePost.findByIdAndDelete(id);
    res.json({ success: true, message: '已删除' });
  } catch (err) { next(err); }
};

// ========== 关闭/结束帖子 ==========
exports.closePost = async (req, res, next) => {
  try {
    const { module, id } = req.params;
    validateModule(module);

    const post = await ModulePost.findById(id);
    if (!post) {
      return res.status(404).json({ success: false, message: '帖子不存在' });
    }
    if (String(post.creator) !== String(req.userId)) {
      return res.status(403).json({ success: false, message: '只能操作自己的帖子' });
    }

    const { reason } = req.body;
    const updated = await ModulePost.findByIdAndUpdate(id, {
      $set: {
        status: 'closed',
        content: reason ? `${post.content || ''}\n[关闭原因: ${reason}]` : post.content,
      }
    });
    res.json({ success: true, data: ModulePost.formatPost(updated) });
  } catch (err) { next(err); }
};

// ========== 接单（任何登录用户可接） ==========
exports.takePost = async (req, res, next) => {
  try {
    const { module, id } = req.params;
    validateModule(module);

    const post = await ModulePost.findById(id);
    if (!post) {
      return res.status(404).json({ success: false, message: '帖子不存在' });
    }
    if (String(post.creator) === String(req.userId)) {
      return res.status(400).json({ success: false, message: '不能接自己的帖子' });
    }
    if (post.status === 'closed') {
      return res.status(400).json({ success: false, message: '该帖子已结束' });
    }

    const extra = typeof post.extra === 'string' ? JSON.parse(post.extra || '{}') : (post.extra || {});
    extra.taker = { userId: req.userId, userCode: req.user?.user_id_code || '', nickName: req.user?.nickName || '', avatarUrl: req.user?.avatarUrl || '', takenAt: new Date().toISOString() };

    const updated = await ModulePost.findByIdAndUpdate(id, {
      $set: { status: 'closed', extra },
    });

    // 微信订阅通知：通知发布者有人接单
    try {
      if (extra.notifySubscribe && extra.notifyTemplateId) {
        const publisher = await User.findById(post.creator_id || post.creator);
        if (publisher && publisher.openid) {
          notifyOrderTaken(
            { openid: publisher.openid, nickName: publisher.nickName || '' },
            { title: post.title, module: post.module },
            { nickName: req.user?.nickName || '同学' },
            extra.notifyTemplateId
          ).then(r => {
            console.log('[takePost] 订阅通知结果:', r);
          }).catch(e => {
            console.error('[takePost] 订阅通知异常:', e.message);
          });
        } else {
          console.log('[takePost] 发布者无 openid，跳过通知');
        }
      }
    } catch (notifyErr) {
      console.error('[takePost] 通知发送异常:', notifyErr.message);
    }

    res.json({ success: true, data: ModulePost.formatPost(updated), message: '接单成功' });
  } catch (err) { next(err); }
};

// ========== 收藏/取消收藏 ==========
exports.toggleFavorite = async (req, res, next) => {
  try {
    const { module, id } = req.params;
    validateModule(module);

    const post = await ModulePost.findById(id);
    if (!post) {
      return res.status(404).json({ success: false, message: '帖子不存在' });
    }

    const result = await ModulePost.toggleFavorite(req.userId, id, module);
    const updated = await ModulePost.findById(id);

    res.json({
      success: true,
      data: { favorited: result.favorited, count: updated.favoriteCount || 0 },
    });
  } catch (err) { next(err); }
};

// ========== 我发布的 ==========
exports.getMyPublished = async (req, res, next) => {
  try {
    const { module } = req.params;
    validateModule(module);
    const { page = 1, pageSize = 20 } = req.query;

    const result = await ModulePost.getMyPosts(req.userId, module, parseInt(page), parseInt(pageSize));
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
};

// ========== 我接的单 ==========
exports.getMyTaken = async (req, res, next) => {
  try {
    const { module } = req.params;
    validateModule(module);
    const { page = 1, pageSize = 20 } = req.query;

    const result = await ModulePost.getMyTaken(req.userId, module, parseInt(page), parseInt(pageSize));
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
};

// ========== 确认完成（接单人标记任务完成） ==========
exports.completePost = async (req, res, next) => {
  try {
    const { module, id } = req.params;
    validateModule(module);

    const post = await ModulePost.findById(id);
    if (!post) {
      return res.status(404).json({ success: false, message: '帖子不存在' });
    }

    // 解析 extra
    const extra = typeof post.extra === 'string' ? JSON.parse(post.extra || '{}') : (post.extra || {});

    // 只有接单人可以确认完成
    if (!extra.taker || String(extra.taker.userId) !== String(req.userId)) {
      return res.status(403).json({ success: false, message: '只有接单人可以确认完成' });
    }

    if (post.status === 'resolved') {
      return res.status(400).json({ success: false, message: '该任务已完成' });
    }

    extra.taker.completedAt = new Date().toISOString();

    const updated = await ModulePost.findByIdAndUpdate(id, {
      $set: { status: 'resolved', extra },
    });
    res.json({ success: true, data: ModulePost.formatPost(updated), message: '任务已完成' });
  } catch (err) { next(err); }
};

// ========== 我收藏的 ==========
exports.getMyFavorites = async (req, res, next) => {
  try {
    const { module } = req.params;
    validateModule(module);
    const { page = 1, pageSize = 20 } = req.query;

    const result = await ModulePost.getMyFavorites(req.userId, module, parseInt(page), parseInt(pageSize));
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
};

// ========== 回复列表 ==========
exports.getReplies = async (req, res, next) => {
  try {
    const { module, id } = req.params;
    validateModule(module);
    const { page = 1, pageSize = 20 } = req.query;

    const result = await ModulePost.getReplies(id, parseInt(page), parseInt(pageSize));
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
};

// ========== 发表回复 ==========
exports.createReply = async (req, res, next) => {
  try {
    const { module, id } = req.params;
    validateModule(module);

    const post = await ModulePost.findById(id);
    if (!post) {
      return res.status(404).json({ success: false, message: '帖子不存在' });
    }

    const { content, parentId, replyToId, images } = req.body;
    if (!content || !content.trim()) {
      return res.status(400).json({ success: false, message: '回复内容不能为空' });
    }
    if (content.trim().length > 1000) {
      return res.status(400).json({ success: false, message: '回复不能超过1000字' });
    }

    let replyToNickName = '';
    if (replyToId) {
      const replyToUser = await User.findById(replyToId);
      replyToNickName = replyToUser ? (replyToUser.nickName || '') : '';
    }

    const reply = await ModulePost.createReply({
      postId: id,
      module,
      parentId: parentId || null,
      replyToId: replyToId || null,
      replyToNickName,
      userId: req.userId,
      userNickName: req.user.nickName || '',
      userAvatarUrl: req.user.avatarUrl || '',
      content: content.trim(),
      images: Array.isArray(images) ? images : [],
    });

    // 如果不是回复自己的帖子，发通知给帖主
    if (String(post.creator) !== String(req.userId)) {
      try {
        const snippet = content.trim().substring(0, 50);
        await Notification.create({
          recipient_id: post.creator,
          sender_id: req.userId,
          sender_nickName: req.user.nickName || '',
          sender_avatarUrl: req.user.avatarUrl || '',
          type: 'module_new_reply',
          title: '新的回复',
          content: `${req.user.nickName || '用户'} 回复了你的帖子《${post.title}》: ${snippet}${content.length > 50 ? '...' : ''}`,
          relatedPost_id: id,
          relatedReply_id: reply.id,
          priority: 'normal',
        });
      } catch (notifErr) {
        console.error('回复通知发送失败:', notifErr.message);
      }
    }

    res.status(201).json({ success: true, data: reply });
  } catch (err) { next(err); }
};

// ========== 删除回复 ==========
exports.deleteReply = async (req, res, next) => {
  try {
    const { module, id, replyId } = req.params;
    validateModule(module);

    const result = await ModulePost.deleteReply(replyId, req.userId);
    if (result === null) {
      return res.status(404).json({ success: false, message: '回复不存在' });
    }
    if (result === false) {
      return res.status(403).json({ success: false, message: '只能删除自己的回复' });
    }
    res.json({ success: true, message: '已删除' });
  } catch (err) { next(err); }
};

// ========== 帖子点赞/取消点赞（用户级去重，真实计数） ==========
exports.toggleLike = async (req, res, next) => {
  try {
    const { module, id } = req.params;
    validateModule(module);

    const post = await ModulePost.findById(id);
    if (!post) {
      return res.status(404).json({ success: false, message: '帖子不存在' });
    }

    const result = await ModulePost.toggleLike(req.userId, id);
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
};

// ========== 回复点赞（简单版：不做去重，直接+1） ==========
exports.likeReply = async (req, res, next) => {
  try {
    const { module, replyId } = req.params;
    validateModule(module);
    const pool = require('../config/db')();

    const [rows] = await pool.query('SELECT * FROM module_replies WHERE id = ? AND isDeleted = 0', [replyId]);
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: '回复不存在' });
    }

    await pool.query('UPDATE module_replies SET likeCount = likeCount + 1 WHERE id = ?', [replyId]);
    const [[{ likeCount }]] = await pool.query('SELECT likeCount FROM module_replies WHERE id = ?', [replyId]);
    res.json({ success: true, data: { liked: true, count: likeCount } });
  } catch (err) { next(err); }
};

// ========== 志愿者推荐/点赞（简单版，+1） ==========
exports.recommend = async (req, res, next) => {
  try {
    const { module, id } = req.params;
    validateModule(module);

    const pool = require('../config/db')();
    const post = await ModulePost.findById(id);
    if (!post) {
      return res.status(404).json({ success: false, message: '帖子不存在' });
    }

    // 使用 extra 字段存储 recommendCount
    const extra = typeof post.extra === 'string' ? JSON.parse(post.extra || '{}') : (post.extra || {});
    const count = (extra.recommendCount || 0) + 1;
    extra.recommendCount = count;
    await ModulePost.findByIdAndUpdate(id, { $set: { extra } });

    res.json({ success: true, data: { recommendCount: count }, message: '推荐成功' });
  } catch (err) { next(err); }
};

// ========== 首页模块统计 ==========
exports.getStats = async (req, res, next) => {
  try {
    const { school } = req.query;
    const stats = await ModulePost.getModuleStats(school);
    res.json({ success: true, data: stats });
  } catch (err) { next(err); }
};
