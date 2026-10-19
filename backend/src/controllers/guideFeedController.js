/**
 * 图鉴广场管理控制器
 * 广场信息流 CRUD + 公开只读接口
 */
const GuideFeed = require('../models/GuideFeed');
const GuideItem = require('../models/GuideItem');

// ========== 公开接口 — 广场信息流 ==========

/**
 * GET /api/guide/feed
 * 前端 loadFeed 调用 — 分页、分类筛选、搜索
 */
exports.getFeedList = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const pageSize = Math.min(50, Math.max(1, parseInt(req.query.pageSize) || 12));
    const offset = (page - 1) * pageSize;

    const categoryKey = req.query.categoryKey || '';
    const keyword = (req.query.keyword || '').trim();

    const conditions = { is_active: 1 };
    if (categoryKey) conditions.category_key = categoryKey;
    if (keyword) {
      conditions.$or = [
        { title: { $regex: keyword } },
        { description: { $regex: keyword } },
      ];
    }

    const [list, total] = await Promise.all([
      GuideFeed.find(conditions)
        .sort({ sort_order: -1, id: -1 })
        .limit(pageSize)
        .skip(offset)
        .exec(),
      GuideFeed.countDocuments(conditions),
    ]);

    res.json({
      success: true,
      data: {
        list,
        pagination: {
          page,
          pageSize,
          total,
          totalPages: Math.ceil(total / pageSize),
        },
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/guide/all
 * 前端 allList 调用 — 全量条目（仅 active）
 * 数据源：guide_items（图鉴条目主表）
 * Query: category / categoryKey / keyword
 */
exports.getAllFeed = async (req, res, next) => {
  try {
    const categoryKey = (req.query.category || req.query.categoryKey || '').trim();
    const keyword = (req.query.keyword || '').trim();
    const conditions = { is_active: 1 };
    if (categoryKey && categoryKey !== 'all') conditions.category_key = categoryKey;
    if (keyword) {
      conditions.$or = [
        { name: { $regex: keyword } },
        { description: { $regex: keyword } },
      ];
    }

    const list = await GuideItem.find(conditions)
      .sort({ sort_order: 1, id: 1 })
      .exec();

    res.json({ success: true, data: { list } });
  } catch (err) {
    next(err);
  }
};

// ========== 管理端接口 — CRUD ==========

/**
 * GET /api/admin/guide/feed
 * 管理端列表（含所有状态，支持分页/分类/搜索）
 */
exports.adminGetFeedList = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const pageSize = Math.min(100, Math.max(1, parseInt(req.query.pageSize) || 20));
    const offset = (page - 1) * pageSize;

    const categoryKey = req.query.categoryKey || '';
    const keyword = (req.query.keyword || '').trim();
    const status = req.query.status; // '1' | '0' | ''

    const conditions = {};
    if (categoryKey) conditions.category_key = categoryKey;
    if (status === '0' || status === '1') conditions.is_active = parseInt(status, 10);
    if (keyword) {
      conditions.$or = [
        { title: { $regex: keyword } },
        { description: { $regex: keyword } },
      ];
    }

    const [list, total] = await Promise.all([
      GuideFeed.find(conditions)
        .sort({ sort_order: -1, id: -1 })
        .limit(pageSize)
        .skip(offset)
        .exec(),
      GuideFeed.countDocuments(conditions),
    ]);

    res.json({
      success: true,
      data: {
        list,
        pagination: {
          page,
          pageSize,
          total,
          totalPages: Math.ceil(total / pageSize),
        },
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/admin/guide/feed
 * 创建广场条目（multipart/form-data，可选 file 字段上传图片）
 */
exports.createFeed = async (req, res, next) => {
  try {
    const { title, description, categoryKey, isActive, sortOrder } = req.body;

    const data = {
      title: title || null,
      description: description || null,
      category_key: categoryKey || '',
      sort_order: parseInt(sortOrder) || 0,
      is_active: isActive === '0' || isActive === 'false' ? 0 : 1,
      images: [],
    };

    // 处理上传的图片
    if (req.files && req.files.length > 0) {
      data.images = req.files.map(f => `/uploads/${f.filename}`);
    } else if (req.file) {
      data.images = [`/uploads/${req.file.filename}`];
    }

    // 兼容前端直接传 images JSON 字符串
    const imagesRaw = req.body.images;
    if (!data.images.length && imagesRaw) {
      try {
        const parsed = typeof imagesRaw === 'string' ? JSON.parse(imagesRaw) : imagesRaw;
        if (Array.isArray(parsed)) data.images = parsed;
      } catch (_) { /* ignore */ }
    }

    const item = await GuideFeed.create(data);
    res.json({ success: true, data: item, message: '创建成功' });
  } catch (err) {
    next(err);
  }
};

/**
 * PUT /api/admin/guide/feed/:id
 * 更新广场条目
 */
exports.updateFeed = async (req, res, next) => {
  try {
    const { id } = req.params;
    const existing = await GuideFeed.findById(id);
    if (!existing) {
      return res.status(404).json({ success: false, message: '条目不存在' });
    }

    const updates = {};
    const fields = ['title', 'description', 'categoryKey', 'isActive', 'sortOrder'];
    const map = {
      title: 'title',
      description: 'description',
      categoryKey: 'category_key',
      sortOrder: 'sort_order',
    };

    for (const field of fields) {
      if (req.body[field] !== undefined) {
        updates[map[field] || field] = req.body[field];
      }
    }

    // 处理新增上传的图片（追加到现有 images）
    if (req.files && req.files.length > 0) {
      const currentImages = Array.isArray(existing.images) ? existing.images : [];
      const newImages = req.files.map(f => `/uploads/${f.filename}`);
      updates.images = [...currentImages, ...newImages];
    }

    // 兼容前端直接传 images JSON 字符串
    if (req.body.images !== undefined) {
      try {
        const parsed = typeof req.body.images === 'string' ? JSON.parse(req.body.images) : req.body.images;
        if (Array.isArray(parsed)) updates.images = parsed;
      } catch (_) { /* ignore */ }
    }

    // 转换 isActive
    if (updates.is_active !== undefined) {
      updates.is_active = updates.is_active === '0' || updates.is_active === 'false' ? 0 : 1;
    }

    const updated = await GuideFeed.findByIdAndUpdate(id, updates);

    res.json({ success: true, data: updated, message: '更新成功' });
  } catch (err) {
    next(err);
  }
};

/**
 * DELETE /api/admin/guide/feed/:id
 * 删除广场条目
 */
exports.deleteFeed = async (req, res, next) => {
  try {
    const { id } = req.params;
    const existing = await GuideFeed.findById(id);
    if (!existing) {
      return res.status(404).json({ success: false, message: '条目不存在' });
    }

    await GuideFeed.findByIdAndDelete(id);
    res.json({ success: true, message: '删除成功' });
  } catch (err) {
    next(err);
  }
};

/**
 * PUT /api/admin/guide/feed/:id/toggle
 * 上下架广场条目
 */
exports.toggleFeedStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const existing = await GuideFeed.findById(id);
    if (!existing) {
      return res.status(404).json({ success: false, message: '条目不存在' });
    }

    const newStatus = existing.is_active === 1 ? 0 : 1;
    const updated = await GuideFeed.findByIdAndUpdate(id, { is_active: newStatus });

    res.json({
      success: true,
      data: updated,
      message: newStatus === 1 ? '已上架' : '已下架',
    });
  } catch (err) {
    next(err);
  }
};
