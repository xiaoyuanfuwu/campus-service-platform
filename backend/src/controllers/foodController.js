/**
 * 食堂控制器 — 公用 API（前端小程序调用）
 */
const { Canteen, CanteenStall, StallReview } = require('../models');

// 评分等级
const RATING_LABELS = {
  5: '夯', 4: '顶级', 3: '人上人', 2: 'NPC', 1: '拉完了'
};

// ========== 获取食堂列表 ==========
exports.getCanteens = async (req, res, next) => {
  try {
    const list = await Canteen.find({ is_active: 1 }).sort({ sort_order: 1, id: 1 });
    res.json({ success: true, data: list });
  } catch (err) { next(err); }
};

// ========== 获取档口列表 ==========
exports.getStalls = async (req, res, next) => {
  try {
    const { canteen_id, category, keyword, page = 1, pageSize = 50 } = req.query;
    const cond = { is_active: 1 };
    if (canteen_id) cond.canteen_id = parseInt(canteen_id);
    if (category) cond.category = category;
    if (keyword) {
      cond.$or = [
        { name: { $regex: keyword, $options: 'i' } },
        { description: { $regex: keyword, $options: 'i' } },
      ];
    }
    const list = await CanteenStall.find(cond)
      .sort({ sort_order: 1, id: 1 })
      .skip((page - 1) * pageSize)
      .limit(parseInt(pageSize));
    const total = await CanteenStall.countDocuments(cond);
    // 附上评分等级文字
    const enriched = list.map(s => ({
      ...s,
      ratingLabel: RATING_LABELS[Math.round(s.rating || 0)],
    }));
    res.json({ success: true, data: { list: enriched, total } });
  } catch (err) { next(err); }
};

// ========== 获取档口详情 ==========
exports.getStallDetail = async (req, res, next) => {
  try {
    const stall = await CanteenStall.findById(req.params.id);
    if (!stall) return res.status(404).json({ success: false, message: '档口不存在' });
    res.json({ success: true, data: { ...stall, ratingLabel: RATING_LABELS[Math.round(stall.rating || 0)] } });
  } catch (err) { next(err); }
};

// ========== 提交评价 ==========
exports.submitReview = async (req, res, next) => {
  try {
    const userId = req.userId;
    const stallId = req.params.id;
    const { rating, content } = req.body;

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ success: false, message: '评分必须在1-5之间' });
    }

    // 检查档口存在
    const stall = await CanteenStall.findById(stallId);
    if (!stall) return res.status(404).json({ success: false, message: '档口不存在' });

    // upsert 评价（每个用户对每个档口只能评价一次）
    const existing = await StallReview.findOne({ stall_id: stallId, user_id: userId });
    if (existing) {
      await StallReview.findByIdAndUpdate(existing.id, { $set: { rating, content } });
    } else {
      await StallReview.create({ stall_id: stallId, user_id: userId, rating, content });
    }

    // 重新计算档口评分
    const pool = require('../config/db')();
    const [[{ avg }]] = await pool.query('SELECT ROUND(AVG(rating),1) AS avg FROM stall_reviews WHERE stall_id = ?', [stallId]);
    const [[{ cnt }]] = await pool.query('SELECT COUNT(*) AS cnt FROM stall_reviews WHERE stall_id = ?', [stallId]);
    await CanteenStall.findByIdAndUpdate(stallId, { $set: { rating: avg || 0, rating_count: cnt } });

    res.json({
      success: true,
      message: `评价成功！当前评分：${avg} · ${RATING_LABELS[Math.round(avg)] || ''}`,
      data: { rating: avg, rating_count: cnt, ratingLabel: RATING_LABELS[Math.round(avg)] }
    });
  } catch (err) { next(err); }
};

// ========== 获取用户对档口的评价 ==========
exports.getMyReview = async (req, res, next) => {
  try {
    const review = await StallReview.findOne({ stall_id: req.params.id, user_id: req.userId });
    res.json({ success: true, data: review || null });
  } catch (err) { next(err); }
};
