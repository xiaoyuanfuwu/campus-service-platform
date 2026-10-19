/**
 * 隐私安全中间件
 */

/**
 * 手机号脱敏
 * 13812345678 → 138****5678
 */
const maskPhone = (phone) => {
  if (!phone || phone.length < 7) return phone;
  return phone.slice(0, 3) + '****' + phone.slice(-4);
};

/**
 * 姓名脱敏
 * 张小明 → 张**
 * 王建国 → 王**
 */
const maskName = (name) => {
  if (!name || name.length <= 1) return name;
  return name[0] + '*'.repeat(name.length - 1);
};

/**
 * 学号脱敏
 * 20230101001 → 2023****001
 */
const maskStudentId = (id) => {
  if (!id || id.length <= 6) return id;
  return id.slice(0, 4) + '****' + id.slice(-3);
};

/**
 * 车牌号脱敏
 * 冀D·88888 → 冀D·8***8
 */
const maskPlateNumber = (plate) => {
  if (!plate || plate.length <= 3) return plate;
  const parts = plate.split('·');
  if (parts.length === 2) {
    const num = parts[1];
    return parts[0] + '·' + num[0] + '***' + num[num.length - 1];
  }
  return plate[0] + '***' + plate[plate.length - 1];
};

/**
 * IP 脱敏
 * 192.168.1.100 → 192.168.*.*
 */
const maskIp = (ip) => {
  if (!ip) return ip;
  const parts = ip.split('.');
  if (parts.length === 4) {
    return parts[0] + '.' + parts[1] + '.*.*';
  }
  return ip;
};

/**
 * 对用户对象进行脱敏（公开资料）
 */
const desensitizeUser = (user, level = 'public') => {
  const obj = typeof user.toObject === 'function' ? user.toObject() : { ...user };

  if (level === 'public') {
    // 公开级别：隐藏敏感字段
    delete obj.phone;
    delete obj.password;
    delete obj.openid;
    delete obj.wechatInfo;
    delete obj.lastLoginIp;
    delete obj.deviceInfo;
    if (obj.realName) obj.realName = maskName(obj.realName);
    if (obj.studentId) obj.studentId = maskStudentId(obj.studentId);
  } else if (level === 'basic') {
    // 基础级别：脱敏但不隐藏
    if (obj.phone) obj.phone = maskPhone(obj.phone);
    if (obj.realName) obj.realName = maskName(obj.realName);
    if (obj.studentId) obj.studentId = maskStudentId(obj.studentId);
    delete obj.password;
    delete obj.wechatInfo;
    delete obj.openid;
  }

  return obj;
};

/**
 * 对拼车对象进行脱敏
 */
const desensitizeCarpool = (carpool, isParticipant = false) => {
  const obj = typeof carpool.toObject === 'function' ? carpool.toObject() : { ...carpool };

  // 非参与者不展示完整联系方式
  if (!isParticipant) {
    if (obj.contact) {
      obj.contact = maskPhone(obj.contact);
    }
    if (obj.vehicleInfo?.plateNumber) {
      obj.vehicleInfo.plateNumber = maskPlateNumber(obj.vehicleInfo.plateNumber);
    }
    // 参与者联系方式也脱敏
    if (obj.participants) {
      obj.participants = obj.participants.map((p) => ({
        ...p,
        contact: p.contact ? maskPhone(p.contact) : '',
      }));
    }
  }

  return obj;
};

/**
 * 请求体敏感词扫描中间件
 */
const scanRequestBody = (fields = ['content', 'title', 'note', 'bio']) => {
  return async (req, res, next) => {
    try {
      const sensitiveFilter = require('../services/sensitiveFilter');

      for (const field of fields) {
        if (req.body[field] && typeof req.body[field] === 'string') {
          const result = await sensitiveFilter.filter(req.body[field]);

          if (!result.passed) {
            return res.status(400).json({
              success: false,
              message: '内容包含敏感词，请修改后重试',
              hits: result.hits,
            });
          }

          // 自动替换
          if (result.level === 'replace') {
            req.body[field] = result.filteredText;
          }
        }
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * 请求频率限制（按用户）
 */
const userRateLimit = (maxRequests, windowMs) => {
  const userRequestMap = new Map();

  // 定期清理
  setInterval(() => {
    const now = Date.now();
    for (const [key, data] of userRequestMap.entries()) {
      if (now - data.windowStart > windowMs) {
        userRequestMap.delete(key);
      }
    }
  }, windowMs);

  return (req, res, next) => {
    const key = req.userId?.toString() || req.ip;
    if (!key) return next();

    const now = Date.now();
    const record = userRequestMap.get(key);

    if (!record || now - record.windowStart > windowMs) {
      userRequestMap.set(key, { count: 1, windowStart: now });
      return next();
    }

    record.count++;
    if (record.count > maxRequests) {
      return res.status(429).json({
        success: false,
        message: '操作过于频繁，请稍后再试',
      });
    }

    next();
  };
};

module.exports = {
  maskPhone,
  maskName,
  maskStudentId,
  maskPlateNumber,
  maskIp,
  desensitizeUser,
  desensitizeCarpool,
  scanRequestBody,
  userRateLimit,
};
