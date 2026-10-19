const { MapPoi } = require('../models');
const getPool = require('../config/db');

/**
 * 获取所有地图地标
 * GET /api/map/pois
 * Query: category=campus|dorm (可选，不传则返回全部)
 */
exports.getPois = async (req, res, next) => {
  try {
    const { category } = req.query;
    const pool = getPool();

    let sql = 'SELECT id, name, u, v, category, sort_order, is_visible FROM map_pois WHERE is_visible = 1';
    const params = [];

    if (category) {
      sql += ' AND category = ?';
      params.push(category);
    }

    sql += ' ORDER BY category, sort_order, id';
    const [rows] = await pool.query(sql, params);

    const campus = rows.filter(r => r.category === 'campus').map(r => ({ u: r.u, v: r.v, name: r.name }));
    const dorm = rows.filter(r => r.category === 'dorm').map(r => ({ u: r.u, v: r.v, name: r.name }));

    res.json({
      success: true,
      data: { campus, dorm, all: rows },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 获取所有地标（管理后台用，包含隐藏项）
 * GET /api/map/admin/all
 */
exports.getAllPois = async (req, res, next) => {
  try {
    const pool = getPool();
    const [rows] = await pool.query(
      'SELECT id, name, u, v, category, sort_order, is_visible FROM map_pois ORDER BY category, sort_order, id'
    );
    res.json({ success: true, data: rows });
  } catch (error) {
    next(error);
  }
};

/**
 * 获取单个地标
 * GET /api/map/pois/:id
 */
exports.getPoi = async (req, res, next) => {
  try {
    const poi = await MapPoi.findById(req.params.id);
    if (!poi) return res.status(404).json({ success: false, message: '地标不存在' });
    res.json({ success: true, data: poi });
  } catch (error) {
    next(error);
  }
};

/**
 * 新增地标
 * POST /api/map/pois
 * Body: { name, u, v, category, sort_order? }
 */
exports.createPoi = async (req, res, next) => {
  try {
    const { name, u, v, category = 'campus', sort_order = 0 } = req.body;
    if (!name || u == null || v == null) {
      return res.status(400).json({ success: false, message: 'name, u, v 为必填项' });
    }
    const poi = await MapPoi.create({ name, u, v, category, sort_order, is_visible: 1 });
    res.status(201).json({ success: true, data: poi, message: '地标创建成功' });
  } catch (error) {
    next(error);
  }
};

/**
 * 更新地标坐标
 * PUT /api/map/pois/:id
 * Body: { name?, u?, v?, category?, sort_order?, is_visible? }
 */
exports.updatePoi = async (req, res, next) => {
  try {
    const { name, u, v, category, sort_order, is_visible } = req.body;
    const update = {};
    if (name !== undefined) update.name = name;
    if (u !== undefined) update.u = u;
    if (v !== undefined) update.v = v;
    if (category !== undefined) update.category = category;
    if (sort_order !== undefined) update.sort_order = sort_order;
    if (is_visible !== undefined) update.is_visible = is_visible;

    const poi = await MapPoi.findByIdAndUpdate(req.params.id, update, { new: true });
    if (!poi) return res.status(404).json({ success: false, message: '地标不存在' });
    res.json({ success: true, data: poi, message: '地标更新成功' });
  } catch (error) {
    next(error);
  }
};

/**
 * 批量更新地标坐标
 * PUT /api/map/pois/batch
 * Body: { pois: [{ id, u, v, name? }] }
 */
exports.batchUpdatePois = async (req, res, next) => {
  try {
    const { pois } = req.body;
    if (!Array.isArray(pois) || pois.length === 0) {
      return res.status(400).json({ success: false, message: 'pois 数组不能为空' });
    }

    const pool = getPool();
    let updated = 0;
    for (const p of pois) {
      if (p.id == null || p.u == null || p.v == null) continue;
      const [result] = await pool.query(
        'UPDATE map_pois SET u = ?, v = ?, name = COALESCE(?, name) WHERE id = ?',
        [p.u, p.v, p.name || null, p.id]
      );
      if (result.affectedRows > 0) updated++;
    }

    res.json({ success: true, message: `成功更新 ${updated} 个地标`, updated });
  } catch (error) {
    next(error);
  }
};

/**
 * 批量替换全部地标（先清空再写入）
 * PUT /api/map/pois/replace
 * Body: { campus: [{u,v,name}], dorm: [{u,v,name}] }
 */
exports.replaceAllPois = async (req, res, next) => {
  try {
    const { campus = [], dorm = [] } = req.body;
    const pool = getPool();

    await pool.query('START TRANSACTION');
    try {
      await pool.query('DELETE FROM map_pois');

      const all = [
        ...campus.map((p, i) => [p.name, p.u, p.v, 'campus', i + 1, 1]),
        ...dorm.map((p, i) => [p.name, p.u, p.v, 'dorm', i + 1, 1]),
      ];

      if (all.length > 0) {
        await pool.query(
          'INSERT INTO map_pois (name, u, v, category, sort_order, is_visible) VALUES ?',
          [all]
        );
      }

      await pool.query('COMMIT');
      res.json({ success: true, message: `已替换全部地标（校园 ${campus.length} 个，宿舍 ${dorm.length} 个）` });
    } catch (err) {
      await pool.query('ROLLBACK');
      throw err;
    }
  } catch (error) {
    next(error);
  }
};

/**
 * 删除地标
 * DELETE /api/map/pois/:id
 */
exports.deletePoi = async (req, res, next) => {
  try {
    const poi = await MapPoi.findByIdAndDelete(req.params.id);
    if (!poi) return res.status(404).json({ success: false, message: '地标不存在' });
    res.json({ success: true, message: '地标已删除' });
  } catch (error) {
    next(error);
  }
};
