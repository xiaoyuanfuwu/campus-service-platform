/**
 * 校园图鉴控制器 — 分类 + 条目
 * 参考数据通过管理员后台维护，前端只读
 */
const { GuideCategory, GuideItem } = require('../models');

// ========== 获取所有分类（含每个分类的条目数） ==========
exports.getCategories = async (req, res, next) => {
  try {
    const categories = await GuideCategory.find({ is_active: 1 }).sort({ sort_order: 1, id: 1 });

    // 查询每个分类的条目数
    const result = await Promise.all(categories.map(async (cat) => {
      const count = await GuideItem.countDocuments({ category_key: cat.category_key, is_active: 1 });
      return {
        key: cat.category_key,
        name: cat.name,
        tag: cat.tag || '',
        desc: cat.description || '',
        color: cat.color || '',
        colorLight: cat.color_light || '',
        icon: cat.icon || '',
        count,
        url: `/subpkg/guide-${cat.category_key}/guide-${cat.category_key}`,
      };
    }));

    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};

// ========== 获取指定分类下的条目 ==========
exports.getCategoryItems = async (req, res, next) => {
  try {
    const { categoryKey } = req.params;
    const items = await GuideItem.find({ category_key: categoryKey, is_active: 1 })
      .sort({ sort_order: 1, id: 1 });

    res.json({ success: true, data: items });
  } catch (err) {
    next(err);
  }
};
