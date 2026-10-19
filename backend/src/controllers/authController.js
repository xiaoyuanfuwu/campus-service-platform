const { User } = require('../models');
const {
  generateToken,
  generateRefreshToken,
  AppError,
} = require('../middleware/auth');
const jwt = require('jsonwebtoken');
const axios = require('axios');
const { sendSmsCode } = require('../services/smsProvider');
const { getRandomNickname, getRandomAvatar, ensureRandomProfile } = require('../services/randomProfile');

// ==================== 验证码存储（内存 + DB 持久化） ====================
// 避免 PM2 重启导致验证码丢失
const getPool = require('../config/db');
const smsCodes = new Map();

// 启动时从 DB 加载未过期验证码
async function loadCodesFromDB() {
  try {
    const pool = getPool();
    const [rows] = await pool.query(
      'SELECT phone, code, expire_at, send_at FROM sms_codes WHERE expire_at > NOW()'
    );
    for (const row of rows) {
      smsCodes.set(row.phone, {
        code: row.code,
        expireAt: new Date(row.expire_at).getTime(),
        sendAt: new Date(row.send_at).getTime(),
      });
    }
    console.log(`📋 加载 ${rows.length} 条验证码`);
  } catch (e) {}
}
loadCodesFromDB();

// 生成 6 位随机验证码
function generateCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

// 清理过期验证码（内存 + DB）
async function cleanExpiredCodes() {
  const now = Date.now();
  for (const [phone, item] of smsCodes.entries()) {
    if (item.expireAt < now) smsCodes.delete(phone);
  }
  try {
    const pool = getPool();
    await pool.query('DELETE FROM sms_codes WHERE expire_at < NOW()');
  } catch (e) {}
}

// 保存验证码到 DB
async function saveCodeToDB(phone, code, expireAt, sendAt) {
  try {
    const pool = getPool();
    await pool.query(
      'INSERT INTO sms_codes (phone, code, expire_at, send_at) VALUES (?, ?, FROM_UNIXTIME(?), FROM_UNIXTIME(?)) ON DUPLICATE KEY UPDATE code=VALUES(code), expire_at=VALUES(expire_at), send_at=VALUES(send_at)',
      [phone, code, Math.floor(expireAt / 1000), Math.floor(sendAt / 1000)]
    );
  } catch (e) {}
}

// 从 DB 删除验证码
async function deleteCodeFromDB(phone) {
  try {
    const pool = getPool();
    await pool.query('DELETE FROM sms_codes WHERE phone = ?', [phone]);
  } catch (e) {}
}

/**
 * 记录设备信息到 users.device_info 字段（JSON 字符串）
 * 仅首次登录记录：users.device_info 已有值则跳过，之后不再更新
 * deviceInfo 支持对象（{platform,brand,model,system,wechatVersion,sdkVersion,language,screenWidth,screenHeight,networkType}）
 * 也兼容平铺字段（platform/brand/model/version）
 */
async function logUserDevice(userId, deviceInfo, req) {
  try {
    if (!userId) return;
    const pool = getPool();
    // 仅首次：已有 device_info 则跳过
    const [rows] = await pool.query('SELECT device_info FROM users WHERE id = ?', [userId]);
    if (!rows.length) return;
    if (rows[0].device_info) return;
    const d = deviceInfo || {};
    const ip = ((req.headers['x-forwarded-for'] || '').split(',')[0].trim()) || req.ip || '';
    const info = {
      platform: String(d.platform || 'wechat').slice(0, 20),
      brand: String(d.brand || '').slice(0, 50),
      model: String(d.model || '').slice(0, 100),
      system: String(d.system || '').slice(0, 50),
      wechatVersion: String(d.wechatVersion || d.version || '').slice(0, 20),
      sdkVersion: String(d.sdkVersion || '').slice(0, 20),
      language: String(d.language || '').slice(0, 20),
      screenWidth: parseInt(d.screenWidth) || 0,
      screenHeight: parseInt(d.screenHeight) || 0,
      networkType: String(d.networkType || '').slice(0, 20),
      loginIp: ip.slice(0, 45),
      loginAt: new Date(),
    };
    await pool.query('UPDATE users SET device_info = ? WHERE id = ?', [JSON.stringify(info), userId]);
  } catch (e) {
    console.warn('[logUserDevice] 记录设备信息失败:', e.message);
  }
}

/**
 * 从请求体中提取设备信息（对象优先，兼容平铺字段）
 */
function extractDeviceInfo(body) {
  const d = body.deviceInfo;
  if (d && typeof d === 'object') {
    return d;
  }
  return {
    platform: body.platform,
    brand: body.brand,
    model: body.model,
    wechatVersion: body.version,
  };
}

/**
 * 微信登录
 * POST /api/auth/wechat-login
 */
exports.wechatLogin = async (req, res, next) => {
  try {
    const { code, nickName, avatarUrl, gender, platform, brand, model, version } = req.body;

    if (!code) {
      throw new AppError('缺少微信登录 code', 400);
    }

    // 调用微信接口换取 openid
    let openid;
    try {
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
        throw new AppError(`微信登录失败: ${wechatRes.data.errmsg}`, 400);
      }

      openid = wechatRes.data.openid;
    } catch (err) {
      // 开发环境下，如果没有配置微信密钥，用 code 作为 openid
      if (process.env.NODE_ENV !== 'production') {
        openid = code;
      } else {
        throw err;
      }
    }

    // 查找或创建用户
    let user = await User.findOne({ openid });

    const updateUserInfo = (u) => {
      u.lastLoginAt = new Date();
      u.loginCount = (u.loginCount || 0) + 1;
      if (nickName) u.nickName = nickName;
      if (avatarUrl) u.avatarUrl = avatarUrl;
      if (gender) u.gender = gender;
      if (platform) {
        u.deviceInfo = {
          platform,
          brand: brand || (u.deviceInfo && u.deviceInfo.brand) || '',
          model: model || (u.deviceInfo && u.deviceInfo.model) || '',
          version: version || (u.deviceInfo && u.deviceInfo.version) || '',
        };
      }
      if (!u.user_id_code) {
        u.user_id_code = User.generateUserIdCode();
      }
    };

    if (!user) {
      // 新用户注册 — 先查一次，再创建，防止并发重复
      try {
        const randomNick = await getRandomNickname();
        const randomAvatar = await getRandomAvatar();
        user = await User.create({
          openid,
          nickName: nickName || randomNick || `用户${Date.now().toString(36).slice(-6)}`,
          avatarUrl: avatarUrl || randomAvatar || '',
          gender: gender || 'secret',
          deviceInfo: {
            platform: platform || 'wechat',
            brand: brand || '',
            model: model || '',
            version: version || '',
          },
          lastLoginAt: new Date(),
          loginCount: 1,
        });
      } catch (createErr) {
        // 并发场景：另一个请求抢先创建了同 openid 的用户 → 重新查询并走更新逻辑
        if (createErr.code === 'ER_DUP_ENTRY') {
          user = await User.findOne({ openid });
        }
        if (!user) {
          console.error('[wechatLogin] 注册失败且二次查询仍找不到用户:', createErr.message);
          throw createErr;
        }
        // 找到已存在的用户 → 按老用户更新
        updateUserInfo(user);
        // user_id_code 异步生成需 await
        if (user.user_id_code instanceof Promise) {
          user.user_id_code = await user.user_id_code;
        }
        await user.save();
      }
    } else {
      // 老用户 — 更新登录信息
      updateUserInfo(user);
      // 昵称/头像为空或仍是默认占位 → 自动补齐随机资料
      await ensureRandomProfile(user);
      if (user.user_id_code instanceof Promise) {
        user.user_id_code = await user.user_id_code;
      }
      await user.save();
    }

    // 生成 token
    const token = generateToken(user._id);
    const refreshToken = generateRefreshToken(user._id);

    // 记录设备信息
    await logUserDevice(user._id, extractDeviceInfo(req.body), req);

    res.json({
      success: true,
      message: user.loginCount === 1 ? '注册成功' : '登录成功',
      data: {
        token,
        refreshToken,
        isNewUser: user.loginCount === 1,
        user: user.toSafeObject(),
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 微信 H5 网页授权登录
 * POST /api/auth/wechat-h5-login
 *
 * 流程：
 *   1. 前端在微信内打开 H5 页面，引导用户访问微信授权 URL
 *   2. 用户同意后微信回调到前端页面，带上 code 参数
 *   3. 前端将 code 发给本接口
 *   4. 后端用 code 换取 access_token 和 openid
 *   5. 根据 openid 查找/创建用户，返回 JWT
 */
exports.wechatH5Login = async (req, res, next) => {
  try {
    const { code, nickName, avatarUrl, gender } = req.body;

    if (!code) {
      throw new AppError('缺少微信授权 code', 400);
    }

    // 调用微信网页授权接口换取 access_token 和 openid
    let openid, unionid, wechatUserInfo;
    try {
      // 第一步：用 code 换取 access_token
      const tokenRes = await axios.get(
        'https://api.weixin.qq.com/sns/oauth2/access_token',
        {
          params: {
            appid: process.env.WECHAT_H5_APPID || process.env.WECHAT_APPID,
            secret: process.env.WECHAT_SECRET,
            code,
            grant_type: 'authorization_code',
          },
        }
      );

      if (tokenRes.data.errcode) {
        throw new AppError(`微信授权失败: ${tokenRes.data.errmsg}`, 400);
      }

      openid = tokenRes.data.openid;
      unionid = tokenRes.data.unionid;
      const accessToken = tokenRes.data.access_token;

      // 第二步：拉取用户信息（昵称、头像等）
      const userInfoRes = await axios.get(
        'https://api.weixin.qq.com/sns/userinfo',
        {
          params: {
            access_token: accessToken,
            openid: openid,
            lang: 'zh_CN',
          },
        }
      );

      if (userInfoRes.data.errcode) {
        // 获取用户信息失败，但不影响登录
        console.warn('获取微信用户信息失败:', userInfoRes.data.errmsg);
      } else {
        wechatUserInfo = userInfoRes.data;
      }
    } catch (err) {
      if (process.env.NODE_ENV !== 'production') {
        // 开发环境：用 code 作为 openid 方便测试
        openid = `h5_${code}`;
      } else {
        throw err;
      }
    }

    // 查找或创建用户
    let user = await User.findOne({ openid });

    if (!user) {
      // 新用户注册
      const randomNick = await getRandomNickname();
      const randomAvatar = await getRandomAvatar();
      user = await User.create({
        openid,
        unionid: unionid || '',
        nickName: nickName || wechatUserInfo?.nickname || randomNick || `用户${Date.now().toString(36).slice(-6)}`,
        avatarUrl: avatarUrl || wechatUserInfo?.headimgurl || randomAvatar || '',
        gender: gender || (wechatUserInfo?.sex === 1 ? 'male' : wechatUserInfo?.sex === 2 ? 'female' : 'secret'),
        deviceInfo: {
          platform: 'h5',
          brand: '',
          model: '',
          version: '',
        },
        lastLoginAt: new Date(),
        loginCount: 1,
      });
    } else {
      // 更新登录信息
      user.lastLoginAt = new Date();
      user.loginCount = (user.loginCount || 0) + 1;
      if (nickName) user.nickName = nickName;
      if (avatarUrl) user.avatarUrl = avatarUrl;
      if (wechatUserInfo) {
        if (wechatUserInfo.nickname && !nickName) user.nickName = wechatUserInfo.nickname;
        if (wechatUserInfo.headimgurl && !avatarUrl) user.avatarUrl = wechatUserInfo.headimgurl;
      }
      if (!user.user_id_code) {
        user.user_id_code = await User.generateUserIdCode();
      }
      // 昵称/头像为空或仍是默认占位 → 自动补齐随机资料
      await ensureRandomProfile(user);
      await user.save();
    }

    const token = generateToken(user._id);
    const refreshToken = generateRefreshToken(user._id);

    res.json({
      success: true,
      message: user.loginCount === 1 ? '注册成功' : '登录成功',
      data: {
        token,
        refreshToken,
        isNewUser: user.loginCount === 1,
        user: user.toSafeObject(),
      },
    });
  } catch (error) {
    next(error);
  }
};
exports.phoneLogin = async (req, res, next) => {
  try {
    const { phone, password } = req.body;

    if (!phone || !password) {
      throw new AppError('手机号和密码不能为空', 400);
    }

    const user = await User.findOne({ phone });

    if (!user) {
      throw new AppError('手机号未注册', 401);
    }

    if (user.status !== 'active') {
      throw new AppError('账号已被禁用', 403);
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      throw new AppError('密码错误', 401);
    }

    // 更新登录信息
    user.lastLoginAt = new Date();
    user.loginCount = (user.loginCount || 0) + 1;
    if (!user.user_id_code) {
      user.user_id_code = await User.generateUserIdCode();
    }
    await user.save();

    const token = generateToken(user._id);
    const refreshToken = generateRefreshToken(user._id);

    // 记录设备信息
    await logUserDevice(user._id, extractDeviceInfo(req.body), req);

    res.json({
      success: true,
      message: '登录成功',
      data: {
        token,
        refreshToken,
        user: user.toSafeObject(),
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 手机号注册
 * POST /api/auth/register
 */
exports.register = async (req, res, next) => {
  try {
    const {
      phone,
      password,
      nickName,
      school,
      realName,
      studentId,
      department,
      grade,
      gender,
    } = req.body;

    if (!phone || !password) {
      throw new AppError('手机号和密码不能为空', 400);
    }

    if (password.length < 6) {
      throw new AppError('密码至少6位', 400);
    }

    // 检查手机号是否已注册
    const existingUser = await User.findOne({ phone });
    if (existingUser) {
      throw new AppError('该手机号已注册', 409);
    }

    const randomNick = await getRandomNickname();
    const randomAvatar = await getRandomAvatar();
    const user = await User.create({
      phone,
      password,
      nickName: nickName || randomNick || `用户${Date.now().toString(36).slice(-6)}`,
      avatarUrl: randomAvatar || '',
      school: school || process.env.DEFAULT_SCHOOL || '示例大学',
      realName: realName || '',
      studentId: studentId || '',
      department: department || '',
      grade: grade || '',
      gender: gender || 'secret',
      lastLoginAt: new Date(),
      loginCount: 1,
    });

    const token = generateToken(user._id);
    const refreshToken = generateRefreshToken(user._id);

    // 记录设备信息
    await logUserDevice(user._id, extractDeviceInfo(req.body), req);

    res.status(201).json({
      success: true,
      message: '注册成功',
      data: {
        token,
        refreshToken,
        user: user.toSafeObject(),
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 刷新 Token
 * POST /api/auth/refresh-token
 */
exports.refreshToken = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      throw new AppError('缺少 refreshToken', 400);
    }

    const decoded = jwt.verify(refreshToken, process.env.JWT_SECRET);

    if (decoded.type !== 'refresh') {
      throw new AppError('无效的 refreshToken', 401);
    }

    const user = await User.findById(decoded.userId);
    if (!user || user.status !== 'active') {
      throw new AppError('用户不存在或已禁用', 401);
    }

    const newToken = generateToken(user._id);
    const newRefreshToken = generateRefreshToken(user._id);

    res.json({
      success: true,
      message: 'Token 刷新成功',
      data: {
        token: newToken,
        refreshToken: newRefreshToken,
      },
    });
  } catch (error) {
    // refreshToken 无效（签名不匹配/过期）→ 返回 401 让前端重新登录
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
 * 退出登录
 * POST /api/auth/logout
 */
exports.logout = async (req, res, next) => {
  try {
    // 可以在这里做 token 黑名单等操作
    // 目前客户端删除 token 即可
    res.json({
      success: true,
      message: '退出成功',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 发送短信验证码
 * POST /api/auth/send-code
 */
exports.sendCode = async (req, res, next) => {
  try {
    const { phone } = req.body;

    if (!phone) {
      throw new AppError('手机号不能为空', 400);
    }

    if (!/^1\d{10}$/.test(phone)) {
      throw new AppError('请输入正确的手机号', 400);
    }

    await cleanExpiredCodes();

    // 频率限制：60 秒内不能重复发送
    const existing = smsCodes.get(phone);
    if (existing && existing.sendAt && Date.now() - existing.sendAt < 60000) {
      const wait = Math.ceil((60000 - (Date.now() - existing.sendAt)) / 1000);
      throw new AppError(`请${wait}秒后再试`, 429);
    }

    const code = generateCode();
    const expireAt = Date.now() + 5 * 60 * 1000; // 5 分钟有效
    const sendAt = Date.now();
    smsCodes.set(phone, { code, expireAt, sendAt });
    await saveCodeToDB(phone, code, expireAt, sendAt);

    // 发送短信验证码
    if (process.env.NODE_ENV === 'production' && process.env.SMS_PROVIDER && process.env.SMS_PROVIDER !== 'mock') {
      const smsResult = await sendSmsCode(phone, code);
      if (!smsResult.success) {
        throw new AppError(`验证码发送失败: ${smsResult.error || '未知错误'}`, 500);
      }
      res.json({
        success: true,
        message: '验证码已发送',
      });
    } else {
      // 开发环境或未配置短信服务：返回验证码方便测试
      const smsResult = await sendSmsCode(phone, code);
      res.json({
        success: true,
        message: '验证码已发送',
        data: { code }, // 仅开发环境返回，生产环境删除此行
      });
    }
  } catch (error) {
    next(error);
  }
};

/**
 * 验证码登录（未注册自动注册）
 * POST /api/auth/code-login
 */
exports.codeLogin = async (req, res, next) => {
  try {
    const { phone, code } = req.body;

    if (!phone || !code) {
      throw new AppError('手机号和验证码不能为空', 400);
    }

    await cleanExpiredCodes();

    // 校验验证码
    const stored = smsCodes.get(phone);
    if (!stored) {
      throw new AppError('请先获取验证码', 400);
    }
    if (stored.expireAt < Date.now()) {
      smsCodes.delete(phone);
      await deleteCodeFromDB(phone);
      throw new AppError('验证码已过期，请重新获取', 400);
    }
    if (stored.code !== code) {
      throw new AppError('验证码错误', 401);
    }

    // 验证通过，删除验证码
    smsCodes.delete(phone);
    await deleteCodeFromDB(phone);

    // 查找或创建用户
    let user = await User.findOne({ phone });
    let isNewUser = false;

    if (!user) {
      // 自动注册
      isNewUser = true;
      const randomNick = await getRandomNickname();
      const randomAvatar = await getRandomAvatar();
      user = await User.create({
        phone,
        nickName: randomNick || `用户${Date.now().toString(36).slice(-6)}`,
        avatarUrl: randomAvatar || '',
        school: process.env.DEFAULT_SCHOOL || '示例大学',
        gender: 'secret',
        lastLoginAt: new Date(),
        loginCount: 1,
      });
    } else {
      if (user.status !== 'active') {
        throw new AppError('账号已被禁用', 403);
      }
      user.lastLoginAt = new Date();
      user.loginCount = (user.loginCount || 0) + 1;
      await user.save();
    }

    const token = generateToken(user._id);
    const refreshToken = generateRefreshToken(user._id);

    // 记录设备信息
    await logUserDevice(user._id, extractDeviceInfo(req.body), req);

    res.json({
      success: true,
      message: isNewUser ? '注册并登录成功' : '登录成功',
      data: {
        token,
        refreshToken,
        isNewUser,
        user: user.toSafeObject(),
      },
    });
  } catch (error) {
    next(error);
  }
};
