// ============================================================
// 随机昵称 / 随机头像 服务
// 新用户注册时自动分配昵称与头像（免填写资料）
// 数据来源：random_nicknames / random_avatars 表（schema-random-profile.sql）
// ============================================================
const getPool = require('../config/db');

/**
 * 随机取一个昵称（优先取未用过的 used_count=0，保证不重名；
 * 池子耗尽后才退化取 used_count 最少的）
 * @returns {Promise<string|null>}
 */
async function getRandomNickname() {
  const pool = getPool();
  try {
    let [rows] = await pool.query(
      'SELECT id, nickname FROM random_nicknames WHERE used_count = 0 ORDER BY RAND() LIMIT 1'
    );
    if (rows.length === 0) {
      // 全部用过：退化取 used_count 最少的
      [rows] = await pool.query(
        'SELECT id, nickname FROM random_nicknames ORDER BY used_count ASC, RAND() LIMIT 1'
      );
    }
    if (rows.length === 0) return null;
    await pool.query(
      'UPDATE random_nicknames SET used_count = used_count + 1 WHERE id = ?',
      [rows[0].id]
    );
    return rows[0].nickname;
  } catch (e) {
    console.error('[randomProfile] 获取随机昵称失败:', e.message);
    return null;
  }
}

/**
 * 随机取一个头像 URL
 * @returns {Promise<string|null>}
 */
async function getRandomAvatar() {
  const pool = getPool();
  try {
    const [rows] = await pool.query(
      'SELECT id, url FROM random_avatars ORDER BY used_count ASC, RAND() LIMIT 1'
    );
    if (rows.length === 0) return null;
    await pool.query(
      'UPDATE random_avatars SET used_count = used_count + 1 WHERE id = ?',
      [rows[0].id]
    );
    return rows[0].url;
  } catch (e) {
    console.error('[randomProfile] 获取随机头像失败:', e.message);
    return null;
  }
}

// 默认昵称正则：用户 + 6位时间戳base36（如 用户m3x8k2）
const DEFAULT_NICK_RE = /^用户[0-9a-z]{6}$/;

/**
 * 给用户补齐随机资料（不覆盖用户已主动设置的昵称/头像）
 * @param {object} user User 实例（含 .save()）
 * @returns {Promise<boolean>} 是否有变更
 */
async function ensureRandomProfile(user) {
  let changed = false;

  // 昵称为空 或 还是默认占位昵称 → 分配随机昵称
  const nick = user.nickName || '';
  if (!nick || DEFAULT_NICK_RE.test(nick)) {
    const randomNick = await getRandomNickname();
    if (randomNick) {
      user.nickName = randomNick;
      changed = true;
    }
  }

  // 头像为空 → 分配随机头像
  if (!user.avatarUrl) {
    const randomAvatar = await getRandomAvatar();
    if (randomAvatar) {
      user.avatarUrl = randomAvatar;
      changed = true;
    }
  }

  return changed;
}

module.exports = {
  getRandomNickname,
  getRandomAvatar,
  ensureRandomProfile,
};
