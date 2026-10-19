/**
 * 兼职管理（Admin）— 兼职信息的 CRUD 控制器
 * 路由: /api/admin/parttime-jobs
 * 数据源: MySQL 表 parttime_jobs
 */
const pool = require('../config/db')();

exports.publicList = async (req, res, next) => {
  try {
    const { type, keyword } = req.query;
    let whereSql = "WHERE is_active = 1 AND status = 'approved'";
    const values = [];
    if (type && type !== 'all') { whereSql += ' AND type = ?'; values.push(type); }
    if (keyword) { whereSql += ' AND (title LIKE ? OR description LIKE ? OR tags LIKE ?)'; const kw = `%${keyword}%`; values.push(kw, kw, kw); }
    const [rows] = await pool.query(`SELECT * FROM parttime_jobs ${whereSql} ORDER BY sort_order ASC, id DESC`, values);
    res.json({ success: true, data: { list: rows.map(r => ({ ...r, description: r.description || '', image_url: r.image_url || '', time: r.time || '' })) } });
  } catch (err) { next(err); }
};

// ========== 列表 ==========
exports.list = async (req, res, next) => {
  try {
    const { page = 1, pageSize = 50, type, status, keyword } = req.query;

    let whereSql = 'WHERE 1=1';
    const values = [];
    if (type) { whereSql += ' AND type = ?'; values.push(type); }
    if (status) { whereSql += ' AND status = ?'; values.push(status); }
    if (keyword) {
      whereSql += ' AND (title LIKE ? OR description LIKE ? OR tags LIKE ?)';
      const kw = `%${keyword}%`;
      values.push(kw, kw, kw);
    }

    const pageNum = parseInt(page, 10) || 1;
    const sizeNum = parseInt(pageSize, 10) || 50;

    const [[{ total }]] = await pool.query(
      `SELECT COUNT(*) as total FROM parttime_jobs ${whereSql}`, values
    );

    const offset = (pageNum - 1) * sizeNum;
    const [rows] = await pool.query(
      `SELECT * FROM parttime_jobs ${whereSql} ORDER BY sort_order ASC, id DESC LIMIT ? OFFSET ?`,
      [...values, sizeNum, offset]
    );

    // 把字段映射成驼峰（前端期望的字段名）
    const list = rows.map(r => ({
      id: r.id,
      title: r.title,
      type: r.type,
      salary: r.salary || '',
      description: r.description || '',
      tags: r.tags || '',
      location: r.location || '',
      contact: r.contact || '',
      publisher_id: r.publisher_id,
      publisher_name: r.publisher_name || '',
      image_url: r.image_url || '',
      time: r.time || '',
      status: r.status || 'approved',
      recommend_count: r.recommend_count || 0,
      view_count: r.view_count || 0,
      sort_order: r.sort_order || 0,
      is_active: r.is_active == null ? 1 : r.is_active,
      createTime: r.createTime,
      updateTime: r.updateTime,
    }));

    res.json({
      success: true,
      data: { list, total, page: pageNum, pageSize: sizeNum },
    });
  } catch (err) { next(err); }
};

// ========== 创建 ==========
exports.create = async (req, res, next) => {
  try {
    const {
      title, type, salary, description, tags, location, contact,
      publisher_name, image_url, status, sort_order, is_active,
    } = req.body;

    if (!title || !String(title).trim()) {
      return res.status(400).json({ success: false, message: '标题不能为空' });
    }

    const allowedTypes = ['tutor', 'promotion', 'service', 'intern', 'other'];
    const safeType = allowedTypes.includes(type) ? type : 'other';
    const allowedStatus = ['pending', 'approved', 'rejected'];
    const safeStatus = allowedStatus.includes(status) ? status : 'approved';

    const [r] = await pool.query(
      `INSERT INTO parttime_jobs
        (title, type, salary, description, tags, location, contact,
         publisher_name, image_url, status, recommend_count, view_count, sort_order, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, ?, ?)`,
      [
        String(title).trim(),
        safeType,
        salary || '',
        description || '',
        tags || '',
        location || '',
        contact || '',
        publisher_name || '',
        image_url || '',
        safeStatus,
        parseInt(sort_order, 10) || 0,
        is_active === 0 ? 0 : 1,
      ]
    );

    const [[row]] = await pool.query('SELECT * FROM parttime_jobs WHERE id = ?', [r.insertId]);
    res.status(201).json({ success: true, data: row, message: '创建成功' });
  } catch (err) { next(err); }
};

// ========== 更新 ==========
exports.update = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!id) {
      return res.status(400).json({ success: false, message: '无效的 ID' });
    }

    const [rows] = await pool.query('SELECT * FROM parttime_jobs WHERE id = ?', [id]);
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: '兼职不存在' });
    }

    const allowedTypes = ['tutor', 'promotion', 'service', 'intern', 'other'];
    const allowedStatus = ['pending', 'approved', 'rejected'];

    const fields = [];
    const values = [];

    const setIfPresent = (key, col) => {
      if (req.body[key] === undefined) return;
      let val = req.body[key];
      if (key === 'type' && !allowedTypes.includes(val)) return;
      if (key === 'status' && !allowedStatus.includes(val)) return;
      if (key === 'sort_order' || key === 'is_active') {
        val = parseInt(val, 10) || 0;
      }
      fields.push(`${col} = ?`);
      values.push(val);
    };

    setIfPresent('title', 'title');
    setIfPresent('type', 'type');
    setIfPresent('salary', 'salary');
    setIfPresent('description', 'description');
    setIfPresent('tags', 'tags');
    setIfPresent('location', 'location');
    setIfPresent('contact', 'contact');
    setIfPresent('publisher_name', 'publisher_name');
    setIfPresent('image_url', 'image_url');
    setIfPresent('time', 'time');
    setIfPresent('status', 'status');
    setIfPresent('sort_order', 'sort_order');
    setIfPresent('is_active', 'is_active');

    if (fields.length === 0) {
      return res.status(400).json({ success: false, message: '没有要更新的字段' });
    }

    values.push(id);
    await pool.query(`UPDATE parttime_jobs SET ${fields.join(', ')} WHERE id = ?`, values);

    const [[row]] = await pool.query('SELECT * FROM parttime_jobs WHERE id = ?', [id]);
    res.json({ success: true, data: row, message: '保存成功' });
  } catch (err) { next(err); }
};

// ========== 删除 ==========
exports.remove = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!id) {
      return res.status(400).json({ success: false, message: '无效的 ID' });
    }
    const [rows] = await pool.query('SELECT * FROM parttime_jobs WHERE id = ?', [id]);
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: '兼职不存在' });
    }
    await pool.query('DELETE FROM parttime_jobs WHERE id = ?', [id]);
    res.json({ success: true, message: '已删除' });
  } catch (err) { next(err); }
};