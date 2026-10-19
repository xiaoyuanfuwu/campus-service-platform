const jwt = require('jsonwebtoken');
const { User } = require('../models');

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  console.error('❌ JWT_SECRET 未设置，请在 .env 中配置');
  process.exit(1);
}

/**
 * JWT 认证中间件 - 必需登录
 */
const authenticate = async (req, res, next) => {
  try {
    let token;

    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith('Bearer')
    ) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: '请先登录',
      });
    }

    const decoded = jwt.verify(token, JWT_SECRET);

    const user = await User.findById(decoded.userId);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: '用户不存在',
      });
    }

    if (user.status === 'disabled' && user.banExpiresAt && new Date() > new Date(user.banExpiresAt)) {
      user.status = 'active';
      const INITIAL_CREDIT = parseInt(process.env.INITIAL_CREDIT) || 100;
      const RECOVERY_CREDIT = 5;
      const oldScore = user.creditScore || INITIAL_CREDIT;
      user.creditScore = Math.min(110, oldScore + RECOVERY_CREDIT);
      user.banExpiresAt = null;
      await user.save();
      const { Notification } = require('../models');
      await Notification.create({
        recipient: user._id,
        sender: null,
        senderSnapshot: { nickName: '系统', avatarUrl: '' },
        type: 'credit_change',
        title: '信用分恢复',
        content: `封禁到期，自动恢复 ${RECOVERY_CREDIT} 信用分`,
        priority: 'normal',
        extraData: { oldScore, newScore: user.creditScore, reason: '封禁到期自动恢复' },
      });
    }

    if (user.status !== 'active') {
      return res.status(403).json({
        success: false,
        message: '账号已被临时封禁，封禁到期后自动解封',
      });
    }

    req.user = user;
    req.userId = user._id;
    req.userIdCode = user.user_id_code;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: '登录已过期，请重新登录',
        code: 'TOKEN_EXPIRED',
      });
    }
    next(error);
  }
};

/**
 * 可选认证 - 不强制登录，但如果有 token 就解析
 */
const optionalAuth = async (req, res, next) => {
  try {
    let token;

    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith('Bearer')
    ) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (token) {
      const decoded = jwt.verify(token, JWT_SECRET);
      const user = await User.findById(decoded.userId);
      if (user && user.status === 'active') {
        req.user = user;
        req.userId = user._id;
        req.userIdCode = user.user_id_code;
      }
    }

    next();
  } catch {
    next();
  }
};

/**
 * 实名认证中间件 - 必须认证通过才能发布/评论/聊天/拼车
 * 用在 authenticate 之后
 *
 * 【2026-08-18】强制实名认证已关闭：直接放行，不再拦截。
 * 实名认证功能（提交/审批）保留，管理端仍可审核；
 * 如需恢复强制，把本函数改回原拦截逻辑即可。
 */
const requireVerified = async (req, res, next) => {
  // 强制实名认证已关闭 - 直接放行
  return next();
};

/**
 * 生成 JWT Token
 */
const generateToken = (userId) => {
  return jwt.sign({ userId }, JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
};

/**
 * 生成 Refresh Token
 */
const generateRefreshToken = (userId) => {
  return jwt.sign(
    { userId, type: 'refresh' },
    JWT_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d' }
  );
};

/**
 * 业务错误类
 */
class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = {
  authenticate,
  optionalAuth,
  requireVerified,
  generateToken,
  generateRefreshToken,
  AppError,
};
