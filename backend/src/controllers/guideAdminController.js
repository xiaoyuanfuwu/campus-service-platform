/**
 * 图鉴大全管理控制器 — guide_categories / guide_items 完整 CRUD
 * 供管理端"图鉴管理"页面使用，管理小程序图鉴大全的元素与分类
 */
const { GuideCategory, GuideItem } = require('../models');
const pool = require('../config/db')();

// ==================== 分类管理 ====================

/**
 * GET /api/admin/guide/categories
 */
exports.getCategories = async (req, res, next) => {
  try {
    const list = await GuideCategory.find({}).sort({ sort_order: 1, id: 1 });
    res.json({ success: true, data: { list } });
  } catch (err) { next(err); }
};

/**
 * POST /api/admin/guide/categories
 */
exports.createCategory = async (req, res, next) => {
  try {
    const { category_key, name, tag, description, color, color_light, icon, sort_order, is_active } = req.body;
    if (!category_key || !name) {
      return res.status(400).json({ success: false, message: '分类标识和名称不能为空' });
    }
    const existing = await GuideCategory.findOne({ category_key });
    if (existing) {
      return res.status(409).json({ success: false, message: '分类标识已存在' });
    }
    const cat = await GuideCategory.create({
      category_key,
      name,
      tag: tag || '',
      description: description || '',
      color: color || '#7C5CFF',
      color_light: color_light || '',
      icon: icon || '',
      sort_order: parseInt(sort_order, 10) || 0,
      is_active: (is_active === '0' || is_active === false) ? 0 : 1,
    });
    res.json({ success: true, data: cat, message: '分类已创建' });
  } catch (err) { next(err); }
};

/**
 * PUT /api/admin/guide/categories/:id
 */
exports.updateCategory = async (req, res, next) => {
  try {
    const { id } = req.params;
    const cat = await GuideCategory.findById(id);
    if (!cat) return res.status(404).json({ success: false, message: '分类不存在' });

    const updates = {};
    const map = {
      name: 'name', tag: 'tag', description: 'description', color: 'color',
      color_light: 'color_light', icon: 'icon', sort_order: 'sort_order',
    };
    for (const [k, col] of Object.entries(map)) {
      if (req.body[k] !== undefined) updates[col] = req.body[k];
    }
    if (req.body.is_active !== undefined) {
      updates.is_active = (req.body.is_active === '0' || req.body.is_active === false) ? 0 : 1;
    }

    const updated = await GuideCategory.findByIdAndUpdate(id, updates);
    res.json({ success: true, data: updated, message: '已更新' });
  } catch (err) { next(err); }
};

/**
 * DELETE /api/admin/guide/categories/:id
 */
exports.deleteCategory = async (req, res, next) => {
  try {
    const { id } = req.params;
    const cat = await GuideCategory.findById(id);
    if (!cat) return res.status(404).json({ success: false, message: '分类不存在' });

    const [rows] = await pool.query(
      'SELECT COUNT(*) AS c FROM guide_items WHERE category_key = ?', [cat.category_key]
    );
    if (rows[0].c > 0) {
      return res.status(400).json({ success: false, message: `该分类下还有 ${rows[0].c} 个元素，请先处理` });
    }

    await GuideCategory.findByIdAndDelete(id);
    res.json({ success: true, message: '分类已删除' });
  } catch (err) { next(err); }
};

// ==================== 元素管理 ====================

/**
 * POST /api/admin/guide/items
 */
exports.createItem = async (req, res, next) => {
  try {
    const { name, category_key, description, emoji, icon, sort_order, is_active, status } = req.body;
    if (!name) return res.status(400).json({ success: false, message: '名称不能为空' });
    if (!category_key) return res.status(400).json({ success: false, message: '请选择分类' });

    const item = await GuideItem.create({
      name,
      category_key,
      description: description || '',
      emoji: emoji || '',
      icon: icon || '',
      sort_order: parseInt(sort_order, 10) || 0,
      is_active: (is_active === '0' || is_active === false) ? 0 : 1,
      status: status || 'approved',
      images: [],
    });
    res.json({ success: true, data: item, message: '元素已创建' });
  } catch (err) { next(err); }
};

/**
 * PUT /api/admin/guide/items/:id
 */
exports.updateItem = async (req, res, next) => {
  try {
    const { id } = req.params;
    const item = await GuideItem.findById(id);
    if (!item) return res.status(404).json({ success: false, message: '元素不存在' });

    const updates = {};
    const map = {
      name: 'name', category_key: 'category_key', description: 'description',
      emoji: 'emoji', icon: 'icon', sort_order: 'sort_order',
    };
    for (const [k, col] of Object.entries(map)) {
      if (req.body[k] !== undefined) updates[col] = req.body[k];
    }
    if (req.body.is_active !== undefined) {
      updates.is_active = (req.body.is_active === '0' || req.body.is_active === false) ? 0 : 1;
    }
    if (req.body.status !== undefined) updates.status = req.body.status;

    const updated = await GuideItem.findByIdAndUpdate(id, updates);
    res.json({ success: true, data: updated, message: '已更新' });
  } catch (err) { next(err); }
};

/**
 * DELETE /api/admin/guide/items/:id
 */
exports.deleteItem = async (req, res, next) => {
  try {
    const { id } = req.params;
    const item = await GuideItem.findById(id);
    if (!item) return res.status(404).json({ success: false, message: '元素不存在' });

    await GuideItem.findByIdAndDelete(id);
    res.json({ success: true, message: '元素已删除' });
  } catch (err) { next(err); }
};

/**
 * PUT /api/admin/guide/items/:id/toggle
 */
exports.toggleItemActive = async (req, res, next) => {
  try {
    const { id } = req.params;
    const item = await GuideItem.findById(id);
    if (!item) return res.status(404).json({ success: false, message: '元素不存在' });

    const newVal = item.is_active === 1 ? 0 : 1;
    const updated = await GuideItem.findByIdAndUpdate(id, { is_active: newVal });
    res.json({ success: true, data: updated, message: newVal === 1 ? '已上架' : '已下架' });
  } catch (err) { next(err); }
};
