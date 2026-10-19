/**
 * 每日统计定时任务
 * 每小时执行一次，统计当天数据并 UPSERT 到 daily_stats 表
 */
const getPool = require('../config/db');

async function updateDailyStats() {
  try {
    const pool = getPool();
    const today = new Date().toISOString().slice(0, 10);

    // 当天新增用户
    const [userRows] = await pool.query(
      'SELECT COUNT(*) as cnt FROM users WHERE DATE(createTime) = ?', [today]);
    const newUsers = userRows[0].cnt;

    // 总用户
    const [totalUserRows] = await pool.query('SELECT COUNT(*) as cnt FROM users');
    const totalUsers = totalUserRows[0].cnt;

    // 当天新增拼车
    const [carpoolRows] = await pool.query(
      "SELECT COUNT(*) as cnt FROM module_posts WHERE module = 'carpool' AND DATE(createTime) = ?", [today]);
    const newCarpools = carpoolRows[0].cnt;

    // 总拼车
    const [totalCarpoolRows] = await pool.query("SELECT COUNT(*) as cnt FROM module_posts WHERE module = 'carpool'");
    const totalCarpools = totalCarpoolRows[0].cnt;

    // 进行中拼车
    const [activeRows] = await pool.query(
      "SELECT COUNT(*) as cnt FROM module_posts WHERE module = 'carpool' AND status = 'active'");
    const activeCarpools = activeRows[0].cnt;

    // 当天加入次数
    const [joinRows] = await pool.query(
      'SELECT COUNT(*) as cnt FROM content_participants WHERE DATE(joinTime) = ?', [today]);
    const joinCount = joinRows[0].cnt;

    // 当天投诉
    const [complaintRows] = await pool.query(
      'SELECT COUNT(*) as cnt FROM complaints WHERE DATE(createTime) = ?', [today]);
    const newComplaints = complaintRows[0].cnt;

    // 待处理投诉
    const [pendingRows] = await pool.query(
      "SELECT COUNT(*) as cnt FROM complaints WHERE status = 'pending'");
    const pendingComplaints = pendingRows[0].cnt;

    // 当天评价
    const [reviewRows] = await pool.query(
      'SELECT COUNT(*) as cnt FROM reviews WHERE DATE(createTime) = ?', [today]);
    const newReviews = reviewRows[0].cnt;

    // 平均评分
    const [ratingRows] = await pool.query(
      'SELECT AVG(rating) as avgR FROM reviews');
    const avgRating = ratingRows[0].avgR || 0;

    // 当天反馈
    const [feedbackRows] = await pool.query(
      'SELECT COUNT(*) as cnt FROM feedbacks WHERE DATE(createTime) = ?', [today]);
    const newFeedbacks = feedbackRows[0].cnt;

    // UPSERT
    await pool.query(
      `INSERT INTO daily_stats (statDate, newUsers, totalUsers, newCarpools, totalCarpools,
        activeCarpools, joinCount, newComplaints, pendingComplaints, newReviews, avgRating, newFeedbacks)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
        newUsers = VALUES(newUsers), totalUsers = VALUES(totalUsers),
        newCarpools = VALUES(newCarpools), totalCarpools = VALUES(totalCarpools),
        activeCarpools = VALUES(activeCarpools), joinCount = VALUES(joinCount),
        newComplaints = VALUES(newComplaints), pendingComplaints = VALUES(pendingComplaints),
        newReviews = VALUES(newReviews), avgRating = VALUES(avgRating),
        newFeedbacks = VALUES(newFeedbacks)`,
      [today, newUsers, totalUsers, newCarpools, totalCarpools,
        activeCarpools, joinCount, newComplaints, pendingComplaints,
        newReviews, avgRating, newFeedbacks]
    );

    console.log(`📊 每日统计已更新: ${today} (用户${newUsers} 拼车${newCarpools} 加入${joinCount})`);
  } catch (err) {
    console.error('📊 每日统计失败:', err.message);
  }
}

/**
 * 回填历史数据（从 users/carpools 等表按天聚合）
 */
async function backfillDailyStats() {
  try {
    const pool = getPool();

    // 获取最早用户注册日期
    const [firstUser] = await pool.query('SELECT MIN(createTime) as minDate FROM users');
    if (!firstUser[0].minDate) return;

    const startDate = new Date(firstUser[0].minDate);
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date();
    endDate.setHours(23, 59, 59, 999);

    let current = new Date(startDate);
    let count = 0;

    while (current <= endDate) {
      const dateStr = current.toISOString().slice(0, 10);
      const nextDay = new Date(current);
      nextDay.setDate(nextDay.getDate() + 1);

      const [u] = await pool.query(
        'SELECT COUNT(*) as cnt FROM users WHERE createTime >= ? AND createTime < ?',
        [current, nextDay]);
      const [c] = await pool.query(
        "SELECT COUNT(*) as cnt FROM module_posts WHERE module = 'carpool' AND createTime >= ? AND createTime < ?",
        [current, nextDay]);
      const [j] = await pool.query(
        'SELECT COUNT(*) as cnt FROM content_participants WHERE joinTime >= ? AND joinTime < ?',
        [current, nextDay]);

      const [totalU] = await pool.query(
        'SELECT COUNT(*) as cnt FROM users WHERE createTime < ?', [nextDay]);
      const [totalC] = await pool.query(
        "SELECT COUNT(*) as cnt FROM module_posts WHERE module = 'carpool' AND createTime < ?", [nextDay]);

      await pool.query(
        `INSERT IGNORE INTO daily_stats (statDate, newUsers, totalUsers, newCarpools, totalCarpools,
          activeCarpools, joinCount, newComplaints, pendingComplaints, newReviews, avgRating, newFeedbacks)
         VALUES (?, ?, ?, ?, ?, 0, ?, 0, 0, 0, 0, 0)`,
        [dateStr, u[0].cnt, totalU[0].cnt, c[0].cnt, totalC[0].cnt, j[0].cnt]);

      count++;
      current.setDate(current.getDate() + 1);
    }

    console.log(`📊 历史数据回填完成: ${count} 天`);
  } catch (err) {
    console.error('📊 历史回填失败:', err.message);
  }
}

module.exports = { updateDailyStats, backfillDailyStats };
