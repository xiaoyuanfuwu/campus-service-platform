const getPool = require('../config/db');

/**
 * IP 风控配置
 */
const IP_LIMITS = {
  MAX_REGISTER_PER_IP: 5,
  MAX_REGISTER_PER_DAY: 3,
  MAX_LOGIN_FAIL_PER_IP: 20,
  MAX_REQUESTS_PER_MINUTE: 60,
  BLOCK_DURATION_HOURS: 24,
  HIGH_RISK_THRESHOLD: 70,
};

/**
 * 获取或创建 IP 记录
 */
const getIpRecord = async (ip) => {
  const pool = getPool();
  let [rows] = await pool.query('SELECT * FROM ip_records WHERE ip = ?', [ip]);
  if (rows.length === 0) {
    const [result] = await pool.query('INSERT INTO ip_records (ip, createTime) VALUES (?, NOW())', [ip]);
    [rows] = await pool.query('SELECT * FROM ip_records WHERE id = ?', [result.insertId]);
  }
  return rows[0];
};

/**
 * 检查 IP 是否被封锁
 */
const isBlocked = async (ip) => {
  const pool = getPool();
  const [rows] = await pool.query('SELECT * FROM ip_records WHERE ip = ? AND isBlocked = 1', [ip]);
  if (rows.length === 0) return false;

  const record = rows[0];
  const blockDuration = IP_LIMITS.BLOCK_DURATION_HOURS * 3600 * 1000;
  if (record.blockedAt && Date.now() - new Date(record.blockedAt).getTime() > blockDuration) {
    await pool.query('UPDATE ip_records SET isBlocked = 0, blockedAt = NULL, blockedReason = ? WHERE ip = ?', ['', ip]);
    return false;
  }

  return true;
};

/**
 * 记录注册行为，返回是否允许
 */
const canRegister = async (ip) => {
  const pool = getPool();
  const record = await getIpRecord(ip);

  if (record.registerCount >= IP_LIMITS.MAX_REGISTER_PER_IP) {
    await blockIp(ip, '同IP注册账号数超过限制');
    return { allowed: false, reason: '注册次数已达上限' };
  }

  const oneDayAgo = new Date(Date.now() - 24 * 3600 * 1000);
  if (new Date(record.createTime) > oneDayAgo && record.registerCount >= IP_LIMITS.MAX_REGISTER_PER_DAY) {
    return { allowed: false, reason: '今日注册次数已达上限，请明天再试' };
  }

  return { allowed: true };
};

/**
 * 记录注册成功
 */
const recordRegister = async (ip, userId) => {
  const pool = getPool();
  await pool.query(
    `INSERT INTO ip_records (ip, registerCount, loginCount, lastRequestAt, createTime)
     VALUES (?, 1, 1, NOW(), NOW())
     ON DUPLICATE KEY UPDATE registerCount = registerCount + 1, loginCount = loginCount + 1, lastRequestAt = NOW()`,
    [ip]
  );
};

/**
 * 记录登录失败
 */
const recordLoginFail = async (ip) => {
  const pool = getPool();
  await pool.query(
    `INSERT INTO ip_records (ip, requestCount, lastRequestAt, createTime)
     VALUES (?, 1, NOW(), NOW())
     ON DUPLICATE KEY UPDATE requestCount = requestCount + 1, lastRequestAt = NOW()`,
    [ip]
  );

  const [rows] = await pool.query('SELECT * FROM ip_records WHERE ip = ?', [ip]);
  const failCount = (rows[0]?.requestCount || 0);

  if (failCount >= IP_LIMITS.MAX_LOGIN_FAIL_PER_IP) {
    await blockIp(ip, '登录失败次数过多');
  }

  return failCount;
};

/**
 * 记录请求
 */
const recordRequest = async (ip) => {
  const pool = getPool();
  await pool.query(
    `INSERT INTO ip_records (ip, requestCount, lastRequestAt, createTime)
     VALUES (?, 1, NOW(), NOW())
     ON DUPLICATE KEY UPDATE requestCount = requestCount + 1, lastRequestAt = NOW()`,
    [ip]
  );
};

/**
 * 封锁 IP
 */
const blockIp = async (ip, reason) => {
  const pool = getPool();
  await pool.query(
    `INSERT INTO ip_records (ip, isBlocked, blockedAt, blockedReason, riskScore)
     VALUES (?, 1, NOW(), ?, 100)
     ON DUPLICATE KEY UPDATE isBlocked = 1, blockedAt = NOW(), blockedReason = ?, riskScore = 100`,
    [ip, reason, reason]
  );
};

/**
 * 解除 IP 封锁
 */
const unblockIp = async (ip) => {
  const pool = getPool();
  await pool.query(
    'UPDATE ip_records SET isBlocked = 0, blockedAt = NULL, blockedReason = ? WHERE ip = ?',
    ['', ip]
  );
};

/**
 * 更新风险评分
 */
const updateRiskScore = async (ip, delta) => {
  const pool = getPool();
  await pool.query(
    `INSERT INTO ip_records (ip, riskScore, lastRequestAt, createTime)
     VALUES (?, ?, NOW(), NOW())
     ON DUPLICATE KEY UPDATE riskScore = riskScore + ?, lastRequestAt = NOW()`,
    [ip, delta, delta]
  );

  const [rows] = await pool.query('SELECT riskScore FROM ip_records WHERE ip = ?', [ip]);
  if (rows.length > 0 && rows[0].riskScore >= IP_LIMITS.HIGH_RISK_THRESHOLD) {
    await blockIp(ip, `风险评分过高(${rows[0].riskScore})`);
  }
};

module.exports = {
  IP_LIMITS,
  getIpRecord,
  isBlocked,
  canRegister,
  recordRegister,
  recordLoginFail,
  recordRequest,
  blockIp,
  unblockIp,
  updateRiskScore,
};
