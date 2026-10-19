const Remark = require('../models/Remark');
const { AppError } = require('../middleware/auth');

/**
 * 获取单个备注
 * GET /api/remarks?targetType=user&targetId=123
 */
exports.getRemark = async (req, res, next) => {
  try {
    const { targetType = 'user', targetId } = req.query;
    if (!targetId) {
      throw new AppError('缺少 targetId 参数', 400);
    }

    const remark = await Remark.findOne({
      user: req.userId,
      target_type: targetType,
      target_id: String(targetId),
    });

    res.json({
      success: true,
      data: { remark: remark ? remark.remark : '' },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 批量获取备注
 * POST /api/remarks/batch
 * body: { items: [{ targetType: 'user', targetId: '123' }, ...] }
 */
exports.batchGetRemarks = async (req, res, next) => {
  try {
    const { items } = req.body;
    if (!Array.isArray(items) || items.length === 0) {
      return res.json({ success: true, data: {} });
    }

    // 构建 OR 条件查询
    const conditions = items.map(item => ({
      user: req.userId,
      target_type: item.targetType || 'user',
      target_id: String(item.targetId),
    }));

    const remarks = await Remark.find({ $or: conditions }).lean();

    // 转为 map: "user_123" -> "备注名"
    const map = {};
    remarks.forEach(r => {
      const key = `${r.target_type}_${r.target_id}`;
      map[key] = r.remark;
    });

    res.json({ success: true, data: map });
  } catch (error) {
    next(error);
  }
};

/**
 * 设置/更新备注
 * PUT /api/remarks
 * body: { targetType: 'user', targetId: '123', remark: '张三' }
 */
exports.setRemark = async (req, res, next) => {
  try {
    const { targetType = 'user', targetId, remark } = req.body;
    if (!targetId) {
      throw new AppError('缺少 targetId 参数', 400);
    }
    if (remark === undefined || remark === null) {
      throw new AppError('缺少 remark 参数', 400);
    }

    const remarkStr = String(remark).trim().slice(0, 50); // 限制50字符
    const tid = String(targetId);

    // 查找已有记录
    const existing = await Remark.findOne({
      user: req.userId,
      target_type: targetType,
      target_id: tid,
    });

    if (remarkStr === '') {
      // 空备注 → 删除记录
      if (existing) {
        await Remark.findOneAndDelete({
          user: req.userId,
          target_type: targetType,
          target_id: tid,
        });
      }
      return res.json({ success: true, message: '备注已清除', data: { remark: '' } });
    }

    if (existing) {
      // 更新
      await Remark.findOneAndUpdate(
        { user: req.userId, target_type: targetType, target_id: tid },
        { remark: remarkStr },
        { new: true }
      );
    } else {
      // 新建
      await Remark.create({
        user: req.userId,
        target_type: targetType,
        target_id: tid,
        remark: remarkStr,
      });
    }

    res.json({ success: true, message: '备注已保存', data: { remark: remarkStr } });
  } catch (error) {
    next(error);
  }
};
