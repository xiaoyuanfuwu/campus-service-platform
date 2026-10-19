const TreeholePost = require('../models/TreeholePost');
const { AppError } = require('../middleware/auth');

/**
 * 树洞列表
 * GET /api/treehole?page=1&pageSize=20&sort=latest&category=find&mine=1
 * - mine=1：只返回当前登录用户自己的所有状态帖（待审/已通过/已驳回），未登录返回 401
 * - mine!=1：返回 status>=1 的公开帖（最新/最热）
 */
exports.getList = async (req, res, next) => {
  try {
    const { page = 1, pageSize = 20, sort = 'latest', category, mine } = req.query;
    const isMine = (mine === '1' || mine === 'true');

    // 强校验：mine 模式必须登录
    if (isMine && !req.userId) {
      throw new AppError('请先登录', 401);
    }

    const result = await TreeholePost.getList({
      page,
      pageSize,
      sort,
      category: category || undefined,
      // mine 模式：只看自己，且看所有状态（不限制 status>=1）
      userId: isMine ? req.userId : null,
      // 仅在公共列表时过滤 status
      onlyPublished: !isMine,
    });

    // 给每条帖子打 isMine 标记（前端用来决定是否显示删除按钮）
    if (req.userId) {
      const currentUid = Number(req.userId);
      result.list.forEach(p => {
        p.isMine = Number(p.user_id) === currentUid;
      });
    } else {
      result.list.forEach(p => { p.isMine = false; });
    }

    // 如果已登录，附加点赞状态
    if (req.userId && result.list.length > 0) {
      const ids = result.list.map(p => p.id);
      const likedMap = await TreeholePost.checkLiked(req.userId, ids);
      result.list.forEach(p => { p.liked = !!likedMap[p.id]; });
    } else {
      result.list.forEach(p => { p.liked = false; });
    }

    res.json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
};

/**
 * 单帖详情
 * GET /api/treehole/:id
 */
exports.getDetail = async (req, res, next) => {
  try {
    const { id } = req.params;
    const post = await TreeholePost.getDetail(id, req.userId);
    if (!post) throw new AppError('帖子不存在或已删除', 404);
    res.json({ success: true, data: post });
  } catch (error) {
    next(error);
  }
};

/**
 * 发新树洞
 * POST /api/treehole
 * body: { content, category, avatar, nickName, location, images }
 */
exports.create = async (req, res, next) => {
  try {
    const {
      content,
      category = 'share',
      avatar,
      nickName,
      location = '',
      images = [],
    } = req.body;

    if (!content || !content.trim()) {
      throw new AppError('请说点什么再投递', 400);
    }
    if (content.length > 500) {
      throw new AppError('内容不能超过 500 字', 400);
    }

    // 检查用户是否被封禁
    if (req.userId) {
      const { getPool } = require('../models/mysql');
      const [[user]] = await getPool().query(
        `SELECT banned FROM users WHERE id = ?`, [req.userId]
      );
      if (user && user.banned) {
        throw new AppError('你的账号已被封禁，无法发布帖子。如有疑问请联系管理员。', 403);
      }
    }

    // 校验分类
    const validCategories = ['find', 'complain', 'help', 'share'];
    if (!validCategories.includes(category)) {
      throw new AppError('分类不合法', 400);
    }

    // 自定义昵称：去掉前后空格、限制 12 字
    let safeNickName = (nickName || '').trim().slice(0, 12);

    // 地点：限制 20 字
    let safeLocation = (location || '').trim().slice(0, 20);

    const post = await TreeholePost.createPost({
      userId: req.userId,
      userIdCode: req.userIdCode || null,    // 6 位数标识，方便举报/查找
      nickName: safeNickName || '匿名朋友',
      avatar: avatar || '🐣',
      content: content.trim(),
      category,
      location: safeLocation,
      images: Array.isArray(images) ? images : [],
    });

    res.status(201).json({
      success: true,
      message: '已投递，等待审核',
      data: post,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 切换点赞
 * POST   /api/treehole/:id/like   -> 点赞
 * DELETE /api/treehole/:id/like   -> 取消点赞
 */
exports.toggleLike = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await TreeholePost.toggleLike(req.userId, id);
    res.json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
};

/**
 * 转发 +1
 * POST /api/treehole/:id/share
 * 转发不需要登录也可，但记录 userId（如果有）
 */
exports.incrementShare = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await TreeholePost.incrementShare(req.userId, id);
    if (!result) throw new AppError('帖子不存在或已删除', 404);
    res.json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
};

/**
 * 删除帖子（仅作者本人）
 * DELETE /api/treehole/:id
 */
exports.deletePost = async (req, res, next) => {
  try {
    if (!req.userId) throw new AppError('请先登录', 401);
    const { id } = req.params;
    const result = await TreeholePost.softDelete(req.userId, id);
    if (!result.ok) {
      const code = result.reason.includes('不存在') ? 404 : 403;
      throw new AppError(result.reason, code);
    }
    res.json({ success: true, message: '已删除' });
  } catch (error) {
    next(error);
  }
};

/**
 * 评论
 * POST /api/treehole/:id/comment
 * body: { content, nickName, avatar }
 */
// 为每个用户生成唯一的匿名评论身份（确定性，同一用户总是同一名字+头像）
const COMMENT_IDS = [
  { e: '🐣', a: '温温的' },{ e: '🐱', a: '懒懒的' },{ e: '🐶', a: '热心的' },{ e: '🐼', a: '软软的' },
  { e: '🦊', a: '机灵的' },{ e: '🐰', a: '乖乖的' },{ e: '🐨', a: '呆呆的' },{ e: '🐸', a: '呱呱的' },
  { e: '🐙', a: '摇摆的' },{ e: '🦄', a: '闪光的' },{ e: '🐳', a: '深沉的' },{ e: '🦋', a: '飘然的' },
  { e: '🐌', a: '慢慢的' },{ e: '🐝', a: '忙碌的' },{ e: '🐞', a: '点点'   },{ e: '🦉', a: '夜猫'   },
  { e: '🐧', a: '摇摆的' },{ e: '🐹', a: '圆圆的' },{ e: '🐮', a: '憨憨的' },{ e: '🐷', a: '吃吃的' },
];
function commentIdentity(userId, userIdCode) {
  const num = Math.abs(Number(userId) || 0);
  const id = COMMENT_IDS[num % COMMENT_IDS.length];
  const suffix = userIdCode ? ('#' + String(userIdCode).slice(-4)) : '';
  return { nickName: id.a + id.e + suffix, avatar: id.e };
}

exports.createComment = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { content } = req.body;

    if (!content || !content.trim()) {
      throw new AppError('请输入评论内容', 400);
    }
    if (content.length > 200) {
      throw new AppError('评论不能超过 200 字', 400);
    }

    // 检查用户是否被封禁
    if (req.userId) {
      const { getPool } = require('../models/mysql');
      const [[user]] = await getPool().query(
        `SELECT banned FROM users WHERE id = ?`, [req.userId]
      );
      if (user && user.banned) {
        throw new AppError('你的账号已被封禁，无法发表评论。如有疑问请联系管理员。', 403);
      }
    }

    // 后端强制生成唯一匿名身份，忽略前端传来的 nickName/avatar（以前写死"我"导致无法区分）
    const identity = commentIdentity(req.userId, req.userIdCode);

    const result = await TreeholePost.createComment({
      postId: id,
      userId: req.userId,
      userIdCode: req.userIdCode || null,
      nickName: identity.nickName,
      avatar: identity.avatar,
      content: content.trim(),
    });

    res.status(201).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

/**
 * 评论列表
 * GET /api/treehole/:id/comments?page=1&pageSize=30
 */
exports.getComments = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { page = 1, pageSize = 30 } = req.query;
    const result = await TreeholePost.getComments(id, { page, pageSize });
    res.json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
};

/**
 * 删除评论（仅作者本人）
 * DELETE /api/treehole/:postId/comment/:commentId
 */
exports.deleteComment = async (req, res, next) => {
  try {
    const { commentId } = req.params;
    const result = await TreeholePost.deleteComment(commentId, req.userId);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};
