/**
 * 每日统计服务
 * 用于定时任务自动生成每日统计快照 (MySQL版本)
 */

const getPool = require('../config/db');
const { DailyStat } = require('../models');

/**
 * 生成今日统计快照
 */
const generateSnapshot = async (dateStr) => {
  const pool = getPool();
  const today = dateStr ? new Date(dateStr) : new Date();
  const dateString = today.toISOString().slice(0, 10);
  const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const endOfDay = new Date(startOfDay.getTime() + 24 * 3600 * 1000);

  const [
    [nu], [tu], [nc], [tc], [cc], [can],
    [jc], [nr], [ar], [ncomp], [rcomp], [nfb],
    [bu], [bi], [am]
  ] = await Promise.all([
    pool.query('SELECT COUNT(*) as cnt FROM users WHERE createTime >= ? AND createTime < ?', [startOfDay, endOfDay]),
    pool.query('SELECT COUNT(*) as cnt FROM users'),
    pool.query("SELECT COUNT(*) as cnt FROM module_posts WHERE module = 'carpool' AND createTime >= ? AND createTime < ?", [startOfDay, endOfDay]),
    pool.query("SELECT COUNT(*) as cnt FROM module_posts WHERE module = 'carpool'"),
    pool.query("SELECT COUNT(*) as cnt FROM module_posts WHERE module = 'carpool' AND status = 'ended' AND updateTime >= ? AND updateTime < ?", [startOfDay, endOfDay]),
    pool.query("SELECT COUNT(*) as cnt FROM module_posts WHERE module = 'carpool' AND status = 'cancelled' AND updateTime >= ? AND updateTime < ?", [startOfDay, endOfDay]),
    pool.query("SELECT COUNT(*) as cnt FROM content_participants WHERE status = 'joined' AND joinTime >= ? AND joinTime < ?", [startOfDay, endOfDay]),
    pool.query('SELECT COUNT(*) as cnt FROM reviews WHERE createTime >= ? AND createTime < ?', [startOfDay, endOfDay]),
    pool.query('SELECT AVG(rating) as avg FROM reviews WHERE createTime >= ? AND createTime < ?', [startOfDay, endOfDay]),
    pool.query('SELECT COUNT(*) as cnt FROM complaints WHERE createTime >= ? AND createTime < ?', [startOfDay, endOfDay]),
    pool.query("SELECT COUNT(*) as cnt FROM complaints WHERE status = 'resolved' AND updateTime >= ? AND updateTime < ?", [startOfDay, endOfDay]),
    pool.query('SELECT COUNT(*) as cnt FROM feedbacks WHERE createTime >= ? AND createTime < ?', [startOfDay, endOfDay]),
    pool.query("SELECT COUNT(*) as cnt FROM users WHERE status IN ('banned','disabled') AND updateTime >= ? AND updateTime < ?", [startOfDay, endOfDay]),
    pool.query('SELECT COUNT(*) as cnt FROM ip_records WHERE isBlocked = 1'),
    pool.query("SELECT AVG(m.price) as totalAmount FROM module_posts m INNER JOIN content_participants cp ON cp.content_id = m.id WHERE m.module = 'carpool' AND cp.status = 'joined' AND cp.joinTime >= ? AND cp.joinTime < ?", [startOfDay, endOfDay]),
  ]);

  const joinCount = jc[0].cnt;
  const totalAmount = am[0].totalAmount || 0;

  const snapshot = await DailyStat.findOneAndUpdate(
    { date: dateString },
    { $set: {
      newUsers: nu[0].cnt,
      activeUsers: 0,
      totalUsers: tu[0].cnt,
      newCarpools: nc[0].cnt,
      completedCarpools: cc[0].cnt,
      cancelledCarpools: can[0].cnt,
      totalCarpools: tc[0].cnt,
      joinCount,
      totalAmount,
      avgPrice: joinCount > 0 ? Math.round((totalAmount / joinCount) * 100) / 100 : 0,
      newReviews: nr[0].cnt,
      avgRating: ar[0].avg ? Math.round(ar[0].avg * 100) / 100 : 0,
      newComplaints: ncomp[0].cnt,
      resolvedComplaints: rcomp[0].cnt,
      newFeedback: nfb[0].cnt,
      bannedUsers: bu[0].cnt,
      blockedIps: bi[0].cnt,
    }},
    { upsert: true, new: true }
  );

  return snapshot;
};

/**
 * 补充历史快照（初始化时用）
 */
const backfillSnapshots = async (days = 30) => {
  const results = [];
  for (let i = days; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().slice(0, 10);

    const existing = await DailyStat.findOne({ date: dateStr });
    if (!existing) {
      const snapshot = await generateSnapshot(dateStr);
      results.push(snapshot);
    }
  }
  return results;
};

/**
 * 清理过期热门路线数据
 */
const resetHotRoutePeriods = async () => {
  const pool = getPool();
  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(weekStart.getDate() - 7);
  const monthStart = new Date(now);
  monthStart.setDate(monthStart.getDate() - 30);

  // Update week counts
  await pool.query(
    `UPDATE hot_routes h
     SET weekCount = (SELECT COUNT(*) FROM module_posts m 
                      WHERE m.module = 'carpool'
                      AND JSON_UNQUOTE(JSON_EXTRACT(m.extra, '$.from')) = h.from_place
                      AND JSON_UNQUOTE(JSON_EXTRACT(m.extra, '$.to')) = h.to_place
                      AND m.createTime >= ?)`,
    [weekStart]
  );

  // Update month counts
  await pool.query(
    `UPDATE hot_routes h
     SET monthCount = (SELECT COUNT(*) FROM module_posts m 
                       WHERE m.module = 'carpool'
                       AND JSON_UNQUOTE(JSON_EXTRACT(m.extra, '$.from')) = h.from_place
                       AND JSON_UNQUOTE(JSON_EXTRACT(m.extra, '$.to')) = h.to_place
                       AND m.createTime >= ?)`,
    [monthStart]
  );
};

module.exports = {
  generateSnapshot,
  backfillSnapshots,
  resetHotRoutePeriods,
};
