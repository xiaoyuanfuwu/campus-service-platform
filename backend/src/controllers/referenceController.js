/**
 * 参考数据控制器 — 校园黄页 & 校园题库
 * 参考数据通过管理员后台维护，前端只读
 */
const { Yellowpage, Questionbank } = require('../models');

// ========== 校园黄页 ==========
exports.getYellowpageList = async (req, res, next) => {
  try {
    const { category, keyword, page = 1, pageSize = 200 } = req.query;
    const conditions = { is_active: 1 };
    if (category) conditions.category = category;
    if (keyword) {
      conditions.$or = [
        { name: { $regex: keyword, $options: 'i' } },
        { phone: { $regex: keyword } },
        { description: { $regex: keyword, $options: 'i' } },
      ];
    }
    const list = await Yellowpage.find(conditions)
      .sort({ sort_order: 1, id: 1 })
      .skip((parseInt(page) - 1) * parseInt(pageSize))
      .limit(parseInt(pageSize));
    const total = await Yellowpage.countDocuments(conditions);
    res.json({ success: true, data: { list, total } });
  } catch (err) {
    next(err);
  }
};

// ========== 校园题库 ==========
exports.getQuestionbankList = async (req, res, next) => {
  try {
    const { category, keyword, page = 1, pageSize = 100 } = req.query;
    const conditions = { is_active: 1 };
    if (category) conditions.category = category;
    if (keyword) {
      conditions.$or = [
        { name: { $regex: keyword, $options: 'i' } },
        { course: { $regex: keyword, $options: 'i' } },
      ];
    }
    const list = await Questionbank.find(conditions)
      .sort({ sort_order: 1, id: 1 })
      .skip((parseInt(page) - 1) * parseInt(pageSize))
      .limit(parseInt(pageSize));
    const total = await Questionbank.countDocuments(conditions);
    res.json({ success: true, data: { list, total } });
  } catch (err) {
    next(err);
  }
};
