/**
 * 校园打卡图鉴控制器
 * 处理用户打卡签到、图鉴收集、进度查询
 */
const { GuideItem, GuideCheckin, User } = require('../models');
const getPool = require('../config/db');

// ========== 获取用户收集进度 ==========
exports.getUserProgress = async (req, res, next) => {
  try {
    const userId = req.userId;

    // 获取所有图鉴条目
    const allItems = await GuideItem.find({ is_active: 1 });
    const totalCount = allItems.length;

    // 获取用户已收集的图鉴ID
    const [collectedRows] = await getPool().query(
      'SELECT DISTINCT item_id FROM guide_checkins WHERE user_id = ? AND is_active = 1',
      [userId]
    );
    const collectedIds = collectedRows.map(r => r.item_id);
    const collectedCount = collectedIds.length;

    // 收集率
    const completionRate = totalCount > 0 ? Math.round((collectedCount / totalCount) * 100) : 0;

    res.json({
      success: true,
      data: {
        total: totalCount,
        collected: collectedCount,
        completionRate,
        collectedIds,
      }
    });
  } catch (err) {
    next(err);
  }
};

// ========== 获取用户已收集的图鉴详情 ==========
exports.getCollectedItems = async (req, res, next) => {
  try {
    const userId = req.userId;
    const { categoryKey, page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let whereSql = 'WHERE c.user_id = ? AND c.is_active = 1';
    let params = [userId];
    if (categoryKey) {
      whereSql += ' AND i.category_key = ?';
      params.push(categoryKey);
    }

    const [rows] = await getPool().query(
      `SELECT c.id as checkin_id, c.item_id, c.images, c.note, c.created_at as checkin_time,
              i.name, i.description, i.emoji, i.icon, i.category_key
       FROM guide_checkins c
       LEFT JOIN guide_items i ON c.item_id = i.id
       ${whereSql}
       ORDER BY c.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, parseInt(limit), offset]
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    next(err);
  }
};

// ========== 打卡签到 ==========
exports.checkin = async (req, res, next) => {
  try {
    const userId = req.userId;
    const { itemId, images, note, latitude, longitude } = req.body;

    if (!itemId) {
      return res.status(400).json({ success: false, message: '请选择图鉴' });
    }

    // 检查图鉴是否存在
    const item = await GuideItem.findById(itemId);
    if (!item) {
      return res.status(404).json({ success: false, message: '图鉴不存在' });
    }

    // 检查是否已经收集
    const [existing] = await getPool().query(
      'SELECT id FROM guide_checkins WHERE user_id = ? AND item_id = ? AND is_active = 1',
      [userId, itemId]
    );

    const isReCheckin = existing.length > 0;
    const imagesJson = images ? JSON.stringify(images) : null;

    if (isReCheckin) {
      // 重复打卡：追加图片和笔记
      await getPool().query(
        'UPDATE guide_checkins SET images = ?, note = ?, checkin_count = checkin_count + 1, updated_at = NOW() WHERE id = ?',
        [imagesJson, (note || ''), existing[0].id]
      );
    } else {
      // 新打卡
      await getPool().query(
        `INSERT INTO guide_checkins (user_id, item_id, images, note, latitude, longitude, checkin_count, is_active, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, 1, 1, NOW(), NOW())`,
        [userId, itemId, imagesJson, (note || ''), latitude || null, longitude || null]
      );
    }

    // 更新收集进度
    const [[{ collected }]] = await getPool().query(
      'SELECT COUNT(DISTINCT item_id) as collected FROM guide_checkins WHERE user_id = ? AND is_active = 1',
      [userId]
    );
    const [[{ total }]] = await getPool().query(
      'SELECT COUNT(*) as total FROM guide_items WHERE is_active = 1'
    );

    res.json({
      success: true,
      message: isReCheckin ? '打卡成功，已追加记录' : '恭喜收集到新图鉴！',
      data: {
        isNew: !isReCheckin,
        item,
        collected,
        total,
        completionRate: total > 0 ? Math.round((collected / total) * 100) : 0,
      }
    });
  } catch (err) {
    next(err);
  }
};

// ========== 获取打卡日历（本月打卡天数） ==========
exports.getCheckinCalendar = async (req, res, next) => {
  try {
    const userId = req.userId;
    const { year, month } = req.query;
    const y = year || new Date().getFullYear();
    const m = month || (new Date().getMonth() + 1);
    const startDate = `${y}-${String(m).padStart(2, '0')}-01`;
    const endDate = `${y}-${String(m).padStart(2, '0')}-31`;

    const [rows] = await getPool().query(
      `SELECT DATE(created_at) as date, COUNT(*) as count
       FROM guide_checkins
       WHERE user_id = ? AND is_active = 1 AND created_at >= ? AND created_at <= ?
       GROUP BY DATE(created_at)
       ORDER BY date ASC`,
      [userId, startDate, endDate]
    );

    res.json({ success: true, data: rows });
  } catch (err) {
    next(err);
  }
};

// ========== 获取打卡排行榜 ==========
exports.getLeaderboard = async (req, res, next) => {
  try {
    const { limit = 20 } = req.query;
    const [rows] = await getPool().query(
      `SELECT u.nickName, u.avatarUrl, COUNT(DISTINCT c.item_id) as score
       FROM guide_checkins c
       JOIN users u ON c.user_id = u.id
       WHERE c.is_active = 1
       GROUP BY c.user_id
       ORDER BY score DESC
       LIMIT ?`,
      [parseInt(limit)]
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    next(err);
  }
};

// ========== 删除打卡记录 ==========
exports.deleteCheckin = async (req, res, next) => {
  try {
    const userId = req.userId;
    const { itemId } = req.body;
    if (!itemId) {
      return res.status(400).json({ success: false, message: '缺少图鉴ID' });
    }
    await getPool().query(
      'UPDATE guide_checkins SET is_active = 0 WHERE user_id = ? AND item_id = ?',
      [userId, itemId]
    );
    res.json({ success: true, message: '已删除该打卡记录' });
  } catch (err) {
    next(err);
  }
};

// ========== 获取今日是否已打卡 ==========
exports.getTodayStatus = async (req, res, next) => {
  try {
    const userId = req.userId;
    const [rows] = await getPool().query(
      `SELECT c.item_id, i.name, i.emoji, c.created_at
       FROM guide_checkins c
       LEFT JOIN guide_items i ON c.item_id = i.id
       WHERE c.user_id = ? AND c.is_active = 1
       AND DATE(c.created_at) = CURDATE()
       ORDER BY c.created_at DESC
       LIMIT 10`,
      [userId]
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    next(err);
  }
};
