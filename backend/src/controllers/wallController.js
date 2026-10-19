/**
 * 校园互助墙统一内容接口
 * GET /api/wall?limit=50&modules=carpool,forum
 * 拼车/模板读 module_posts，校园墙读独立 forum_posts（已审核通过才展示）
 */
const { ModulePost } = require('../models');
const getPool = require('../config/db');
const forumController = require('./forumController');

// 等级阈值：index+1 = 等级（0 条默认 1 级）
// LV1  默认（<2）
// LV2  累计 ≥ 2
// LV3  累计 ≥ 5
// LV4  累计 ≥ 10
// LV5  累计 ≥ 20
// LV6  累计 ≥ 50
// LV7  累计 ≥ 100
// LV8  累计 ≥ 200
// LV9  累计 ≥ 500
// LV10 累计 ≥ 1000
const LEVEL_THRESHOLDS = [0, 2, 5, 10, 20, 50, 100, 200, 500, 1000];

function calcLevel(count) {
  let level = 1;
  for (let i = 0; i < LEVEL_THRESHOLDS.length; i++) {
    if (count >= LEVEL_THRESHOLDS[i]) level = i + 1;
  }
  return level;
}

const WALL_MODULES = ['carpool', 'express', 'task', 'lost', 'forum', 'secondhand', 'rental', 'substitute', 'print', 'yellowpage', 'bulletin', 'charity'];
const MODULE_LABELS = { carpool: '拼车', express: '快递待取', task: '大厅任务', lost: '失物招领', forum: '校园墙', secondhand: '二手市集', rental: '物品短租', substitute: '交换人生', print: '打印跑腿', yellowpage: '校园黄页', bulletin: '公告板', charity: '爱心公益' };
const asBool = v => v === 1 || v === true;

function formatWallItem(row) {
  const item = ModulePost.formatPost(row);
  item._module = item.module;
  item._moduleName = MODULE_LABELS[item.module] || item.module;
  item.contentType = item.contentType || (item.module === 'forum' ? 'forum' : 'template');
  item.displayType = item.displayType || 'standard';
  item._sortTime = item.createTime || item.updateTime || '';
  item.isUrgent = asBool(item.isUrgent);
  item.showContactAfterJoin = asBool(item.showContactAfterJoin);
  item.isReported = asBool(item.isReported);
  if (item.module === 'carpool') {
    const ext = item.extra || {};
    item._isCarpool = true;
    item.from = ext.from || '';
    item.to = ext.to || '';
    item.departureTime = ext.departureTime || null;
    item.deadlineTime = ext.deadlineTime || null;
    item.totalSeats = Number(ext.totalSeats || 1);
    item.remainSeats = Number(ext.remainSeats ?? item.totalSeats);
    item.vehicleInfo = ext.vehicle || { plateNumber: '', brand: '', color: '' };
    item.note = item.content || '';
  }
  return item;
}

exports.getWall = async (req, res, next) => {
  try {
    const limit = Math.min(Math.max(parseInt(req.query.limit) || 50, 1), 100);
    const requested = req.query.modules ? String(req.query.modules).split(',').map(x => x.trim()).filter(Boolean) : WALL_MODULES;
    const modules = requested.filter(x => WALL_MODULES.includes(x));
    if (!modules.length) return res.json({ success: true, data: { list: [], total: 0, limit } });

    const pool = getPool();
    let items = [];

    // 1) 校园墙：独立 forum_posts（仅已审核通过）
    if (modules.includes('forum')) {
      const [forumRows] = await pool.query(
        "SELECT * FROM forum_posts WHERE auditStatus = 'approved' AND status != 'cancelled' ORDER BY isTop DESC, displayOrder DESC, createTime DESC LIMIT ?",
        [limit]
      );
      items.push(...forumRows.map(r => {
        const item = forumController.formatPost(r);
        item._sortTime = item.createTime || item.updateTime || '';
        return item;
      }));
    }

    // 2) 其余模块：module_posts（拼车 + 模板）
    const postModules = modules.filter(m => m !== 'forum');
    if (postModules.length > 0) {
      const placeholders = postModules.map(() => '?').join(',');
      const [rows] = await pool.query(
        `SELECT * FROM module_posts WHERE module IN (${placeholders}) AND auditStatus = 'approved' AND status != 'cancelled' ORDER BY isTop DESC, displayOrder DESC, createTime DESC LIMIT ?`,
        [...postModules, limit]
      );
      items.push(...rows.map(formatWallItem));
    }

    // 3) 注入点赞/收藏状态
    if (req.userId && items.length) {
      const postIds = items.map(x => x.id);
      const forumIds = items.filter(x => x.module === 'forum').map(x => x.id);
      const moduleIds = items.filter(x => x.module !== 'forum').map(x => x.id);
      const likeMap = {}, favMap = {};
      if (moduleIds.length) {
        const [l] = await pool.query(`SELECT post_id FROM module_likes WHERE user_id = ? AND post_id IN (${moduleIds.map(() => '?').join(',')})`, [req.userId, ...moduleIds]);
        const [f] = await pool.query(`SELECT post_id FROM module_favorites WHERE user_id = ? AND post_id IN (${moduleIds.map(() => '?').join(',')})`, [req.userId, ...moduleIds]);
        l.forEach(r => { likeMap['m' + r.post_id] = true; });
        f.forEach(r => { favMap['m' + r.post_id] = true; });
      }
      if (forumIds.length) {
        const [l] = await pool.query(`SELECT post_id FROM forum_likes WHERE user_id = ? AND post_id IN (${forumIds.map(() => '?').join(',')})`, [req.userId, ...forumIds]);
        const [f] = await pool.query(`SELECT post_id FROM forum_favorites WHERE user_id = ? AND post_id IN (${forumIds.map(() => '?').join(',')})`, [req.userId, ...forumIds]);
        l.forEach(r => { likeMap['f' + r.post_id] = true; });
        f.forEach(r => { favMap['f' + r.post_id] = true; });
      }
      items.forEach(item => {
        const key = (item.module === 'forum' ? 'f' : 'm') + item.id;
        item.isLiked = !!likeMap[key];
        item.isFavorited = !!favMap[key];
      });
    }

    // 4) 按发布时间倒序，统一取前 limit
    items.sort((a, b) => new Date(b.createTime || 0) - new Date(a.createTime || 0));
    const list = items.slice(0, limit);

    // 5) 批量计算用户等级
    if (list.length) {
      const creatorIds = [...new Set(
        list.map(item => item.creator && item.creator.id).filter(Boolean)
      )];
      if (creatorIds.length) {
        const ph = creatorIds.map(() => '?').join(',');
        const [mRows] = await pool.query(
          `SELECT creator_id, COUNT(*) as c FROM module_posts WHERE creator_id IN (${ph}) GROUP BY creator_id`,
          creatorIds
        );
        const [fRows] = await pool.query(
          `SELECT creator_id, COUNT(*) as c FROM forum_posts WHERE creator_id IN (${ph}) GROUP BY creator_id`,
          creatorIds
        );
        const countMap = {};
        mRows.forEach(r => { countMap[r.creator_id] = (countMap[r.creator_id] || 0) + r.c; });
        fRows.forEach(r => { countMap[r.creator_id] = (countMap[r.creator_id] || 0) + r.c; });
        list.forEach(item => {
          if (item.creator && item.creator.id) {
            const total = countMap[item.creator.id] || 0;
            item._level = calcLevel(total);
            item.creator.level = item._level;
          }
        });
      }
    }

    res.json({ success: true, data: { list, total: list.length, limit } });
  } catch (err) { next(err); }
};
