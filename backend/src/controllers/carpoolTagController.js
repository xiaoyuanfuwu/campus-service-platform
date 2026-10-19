const getPool = require('../config/db');
const { AppError } = require('../middleware/auth');

// 默认标签列表（首次启动时自动写入 DB）
const DEFAULT_TAGS = [
  { label: '安静聊天', sort_order: 100 },
  { label: '一路嗨歌', sort_order: 95 },
  { label: '不吸烟',   sort_order: 90 },
  { label: '可带宠物', sort_order: 85 },
  { label: '帮带东西', sort_order: 80 },
  { label: 'AA油费',   sort_order: 75 },
  { label: '老司机',   sort_order: 70 },
  { label: '新手上路', sort_order: 65 },
  { label: '女司机',   sort_order: 60 },
  { label: '夜路走得多', sort_order: 55 },
  { label: '准时出发', sort_order: 50 },
  { label: '可绕路接人', sort_order: 45 },
  { label: '只走高速', sort_order: 40 },
  { label: '学生优先', sort_order: 35 },
  { label: '可拼短途', sort_order: 30 },
  { label: '长途优先', sort_order: 25 },
];

// 启动时确保表里有默认标签
async function ensureSeed() {
  try {
    const pool = getPool();
    const [rows] = await pool.query('SELECT COUNT(*) as cnt FROM carpool_tag_options');
    if (rows[0].cnt > 0) return;
    for (const t of DEFAULT_TAGS) {
      try {
        await pool.query(
          'INSERT INTO carpool_tag_options (label, sort_order) VALUES (?, ?)',
          [t.label, t.sort_order]
        );
      } catch (e) {
        // 重复则跳过
        if (e.code !== 'ER_DUP_ENTRY') throw e;
      }
    }
    console.log(`✅ 拼车标签池已初始化 ${DEFAULT_TAGS.length} 个默认标签`);
  } catch (err) {
    console.error('[WARN] 拼车标签池初始化失败:', err.message);
  }
}
ensureSeed();

/**
 * 获取可用标签列表
 * GET /api/carpool-tags
 */
exports.getList = async (req, res, next) => {
  try {
    const pool = getPool();
    const [rows] = await pool.query(
      `SELECT id, label, sort_order
       FROM carpool_tag_options
       WHERE is_active = 1
       ORDER BY sort_order DESC, id ASC`
    );
    res.json({
      success: true,
      data: {
        tags: rows.map(r => r.label),
        // 返回管理员用的完整数据（无论谁请求，便于前端调试）
        full: rows,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 批量创建 / 更新标签（管理员）
 * POST /api/carpool-tags/batch
 * Body: { tags: [{ label, sort_order? }, ...] }
 */
exports.upsertBatch = async (req, res, next) => {
  try {
    const { tags } = req.body;
    if (!Array.isArray(tags) || tags.length === 0) {
      throw new AppError('请提供标签数组', 400);
    }
    const pool = getPool();
    const result = [];
    for (const t of tags) {
      const label = typeof t === 'string' ? t : t.label;
      const sortOrder = typeof t === 'object' ? (t.sort_order || 0) : 0;
      if (!label || typeof label !== 'string') continue;
      // INSERT ... ON DUPLICATE KEY UPDATE
      await pool.query(
        `INSERT INTO carpool_tag_options (label, sort_order, is_active)
         VALUES (?, ?, 1)
         ON DUPLICATE KEY UPDATE sort_order = VALUES(sort_order), is_active = 1`,
        [label.trim(), sortOrder]
      );
      result.push(label.trim());
    }
    res.json({
      success: true,
      message: `已更新 ${result.length} 个标签`,
      data: { tags: result },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 删除标签（软删除 -> is_active=0）
 * DELETE /api/carpool-tags/:id
 */
exports.remove = async (req, res, next) => {
  try {
    const pool = getPool();
    const [r] = await pool.query(
      'UPDATE carpool_tag_options SET is_active = 0 WHERE id = ?',
      [req.params.id]
    );
    if (r.affectedRows === 0) throw new AppError('标签不存在', 404);
    res.json({ success: true, message: '标签已删除' });
  } catch (error) {
    next(error);
  }
};
