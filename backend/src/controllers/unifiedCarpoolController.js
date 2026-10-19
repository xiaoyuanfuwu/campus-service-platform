const getPool = require('../config/db');
const { ModulePost, User, Notification } = require('../models');
const { AppError } = require('../middleware/auth');

const MODULE = 'carpool';
const json = (value, fallback = {}) => {
  if (!value) return fallback;
  if (typeof value === 'object') return value;
  try { return JSON.parse(value); } catch (_) { return fallback; }
};
const asInt = (value, fallback = 0) => Number.isFinite(Number(value)) ? Number(value) : fallback;
const pageData = (page, pageSize, total, list) => ({ list, total, page: Number(page), pageSize: Number(pageSize), totalPages: Math.ceil(total / pageSize) });

function formatCarpool(row, participants = []) {
  const item = ModulePost.formatPost(row);
  const extra = item.extra || {};
  item._module = MODULE;
  item._moduleName = '拼车';
  item._isCarpool = true;
  item.from = extra.from || '';
  item.to = extra.to || '';
  item.fromDetail = extra.fromDetail || '';
  item.toDetail = extra.toDetail || '';
  item.from_lat = extra.fromLat ?? null;
  item.from_lng = extra.fromLng ?? null;
  item.to_lat = extra.toLat ?? null;
  item.to_lng = extra.toLng ?? null;
  item.departureTime = extra.departureTime || null;
  item.deadlineTime = extra.deadlineTime || null;
  item.totalSeats = asInt(extra.totalSeats, 1);
  item.remainSeats = asInt(extra.remainSeats, item.totalSeats);
  item.vehicleInfo = extra.vehicle || { plateNumber: '', brand: '', color: '' };
  item.note = item.content || '';
  item.participants = participants.map(p => ({ user: { _id: p.user_id, id: p.user_id }, nickName: p.nickName, avatarUrl: p.avatarUrl, creditScore: p.creditScore, joinTime: p.joinTime, status: p.status, contact: p.contact, note: p.note }));
  return item;
}

async function getParticipants(contentIds) {
  if (!contentIds.length) return {};
  const pool = getPool();
  const [rows] = await pool.query(`SELECT * FROM content_participants WHERE content_id IN (${contentIds.map(() => '?').join(',')}) ORDER BY joinTime ASC`, contentIds);
  return rows.reduce((map, row) => ((map[row.content_id] ||= []).push(row), map), {});
}

async function findCarpool(id, lock = false, conn = null) {
  const db = conn || getPool();
  // 兼容：优先按统一内容 ID，其次按旧拼车 ID 映射（legacyCarpoolId）
  const [rows] = await db.query(
    `SELECT * FROM module_posts WHERE module = ? AND (id = ? OR legacyCarpoolId = ?)${lock ? ' FOR UPDATE' : ''} LIMIT 1`,
    [MODULE, id, id]
  );
  return rows[0] || null;
}

function ensureOwner(row, userId) {
  if (!row) throw new AppError('拼车信息不存在', 404);
  if (String(row.creator_id) !== String(userId)) throw new AppError('只能操作自己发布的拼车', 403);
}

exports.getList = async (req, res, next) => {
  try {
    const { type, status, from, to, keyword, sortBy = 'createTime', page = 1, pageSize = 10 } = req.query;
    const pool = getPool();
    // 惰性过期：超过出发时间的进行中拼车自动置为 expired（与旧行为一致）
    try {
      await pool.query(
        `UPDATE module_posts SET status = 'expired' WHERE module = ? AND status IN ('active','full') AND JSON_UNQUOTE(JSON_EXTRACT(extra, '$.departureTime')) < NOW()`,
        [MODULE]
      );
    } catch (_) { /* 过期更新失败不影响列表 */ }
    const where = ['module = ?', "status != 'cancelled'"];
    const values = [MODULE];
    if (status) { where.push('status = ?'); values.push(status); }
    else where.push("status IN ('active','full')");
    if (type) { where.push('type = ?'); values.push(type); }
    if (from) { where.push("JSON_UNQUOTE(JSON_EXTRACT(extra, '$.from')) LIKE ?"); values.push(`%${from}%`); }
    if (to) { where.push("JSON_UNQUOTE(JSON_EXTRACT(extra, '$.to')) LIKE ?"); values.push(`%${to}%`); }
    if (keyword) { where.push("(title LIKE ? OR content LIKE ? OR JSON_UNQUOTE(JSON_EXTRACT(extra, '$.from')) LIKE ? OR JSON_UNQUOTE(JSON_EXTRACT(extra, '$.to')) LIKE ?)"); values.push(...Array(4).fill(`%${keyword}%`)); }
    const orderMap = { departureTime: "JSON_UNQUOTE(JSON_EXTRACT(extra, '$.departureTime')) ASC", price: 'price ASC', remainSeats: "CAST(JSON_UNQUOTE(JSON_EXTRACT(extra, '$.remainSeats')) AS UNSIGNED) DESC", createTime: 'createTime DESC' };
    const orderBy = orderMap[sortBy] || orderMap.createTime;
    const size = Math.min(Math.max(asInt(pageSize, 10), 1), 100);
    const current = Math.max(asInt(page, 1), 1);
    const [[{ total }]] = await pool.query(`SELECT COUNT(*) total FROM module_posts WHERE ${where.join(' AND ')}`, values);
    const [rows] = await pool.query(`SELECT * FROM module_posts WHERE ${where.join(' AND ')} ORDER BY ${orderBy} LIMIT ? OFFSET ?`, [...values, size, (current - 1) * size]);
    const participantMap = await getParticipants(rows.map(r => r.id));
    const userId = req.userId ? String(req.userId) : null;
    const list = rows.map(r => {
      const item = formatCarpool(r, participantMap[r.id] || []);
      item.isCreator = userId ? String(r.creator_id) === userId : false;
      item.isJoined = userId ? item.participants.some(p => String(p.user.id) === userId && p.status === 'joined') : false;
      return item;
    });
    res.json({ success: true, data: pageData(current, size, total, list) });
  } catch (e) { next(e); }
};

exports.getDetail = async (req, res, next) => {
  try {
    const pool = getPool();
    const row = await findCarpool(req.params.id);
    if (!row) throw new AppError('拼车信息不存在', 404);
    await pool.query('UPDATE module_posts SET viewCount = viewCount + 1 WHERE id = ?', [row.id]);
    row.viewCount += 1;
    const participants = await getParticipants([row.id]);
    const item = formatCarpool(row, participants[row.id] || []);
    const uid = req.userId ? String(req.userId) : null;
    item.isCreator = uid ? String(row.creator_id) === uid : false;
    item.isJoined = uid ? item.participants.some(p => String(p.user.id) === uid && p.status === 'joined') : false;
    const [favoriteRows] = uid ? await pool.query('SELECT id FROM module_favorites WHERE user_id=? AND post_id=?', [uid, row.id]) : [[]];
    item.isFavorited = favoriteRows.length > 0;
    res.json({ success: true, data: item });
  } catch (e) { next(e); }
};

exports.create = async (req, res, next) => {
  try {
    const { from, to, fromDetail = '', toDetail = '', departureTime, totalSeats, type, contact, contactType = 'phone', note = '', tags = [], price = 0, priceNote = '', vehicleInfo = {}, deadlineTime = null, images = [] } = req.body;
    if (!from || !to || !departureTime || !totalSeats || !contact || !['find', 'offer'].includes(type)) throw new AppError('拼车信息不完整或类型不正确', 400);
    if (new Date(departureTime) < new Date()) throw new AppError('出发时间不能是过去', 400);
    const seats = asInt(totalSeats, 0); if (seats < 1) throw new AppError('总人数至少为1', 400);
    const user = await User.findById(req.userId);
    const extra = { from, to, fromDetail, toDetail, departureTime, deadlineTime, totalSeats: seats, remainSeats: seats, vehicle: { plateNumber: vehicleInfo.plateNumber || '', brand: vehicleInfo.brand || '', color: vehicleInfo.color || '' } };
    const pool = getPool();
    const [result] = await pool.query(`INSERT INTO module_posts (module,contentType,displayType,type,creator_id,creator_nickName,creator_avatarUrl,creator_userCode,creator_creditScore,creator_gender,creator_school,title,content,summary,price,priceNote,contact,contactType,images,tags,location,status,extra,showContactAfterJoin) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`, [MODULE,'template','carpool',type,req.userId,user.nickName || '',user.avatarUrl || '',user.user_id_code || '',user.creditScore || 100,user.gender || 'secret',user.school || '',`${from} → ${to}`,note,note,price,priceNote,contact,contactType,JSON.stringify(images),JSON.stringify(tags),`${from} ${to}`,'active',JSON.stringify(extra),1]);
    await pool.query('UPDATE users SET publishCount = publishCount + 1, tripCount = tripCount + 1 WHERE id = ?', [req.userId]);
    const row = await findCarpool(result.insertId);
    res.status(201).json({ success: true, message: '发布成功', data: formatCarpool(row) });
  } catch (e) { next(e); }
};

exports.update = async (req, res, next) => {
  try {
    const pool = getPool(); const row = await findCarpool(req.params.id); ensureOwner(row, req.userId);
    if (row.status !== 'active') throw new AppError('只能修改进行中的拼车', 400);
    const extra = json(row.extra); const fields = ['from','to','fromDetail','toDetail','departureTime','deadlineTime'];
    fields.forEach(k => { if (req.body[k] !== undefined) extra[k] = req.body[k]; });
    if (req.body.vehicleInfo !== undefined) extra.vehicle = { ...(extra.vehicle || {}), ...req.body.vehicleInfo };
    if (req.body.totalSeats !== undefined) { const joined = (await pool.query("SELECT COUNT(*) cnt FROM content_participants WHERE content_id=? AND status='joined'", [row.id]))[0][0].cnt; const seats = asInt(req.body.totalSeats); if (seats < joined) throw new AppError(`总人数不能小于已加入人数(${joined})`, 400); extra.totalSeats = seats; extra.remainSeats = seats - joined; }
    const values = { title: req.body.from || req.body.to ? `${extra.from} → ${extra.to}` : row.title, content: req.body.note ?? row.content, summary: req.body.note ?? row.summary, price: req.body.price ?? row.price, priceNote: req.body.priceNote ?? row.priceNote, contact: req.body.contact ?? row.contact, contactType: req.body.contactType ?? row.contactType, images: req.body.images !== undefined ? JSON.stringify(req.body.images) : row.images, tags: req.body.tags !== undefined ? JSON.stringify(req.body.tags) : row.tags, location: `${extra.from} ${extra.to}`, extra: JSON.stringify(extra), participateCount: asInt(extra.totalSeats) - asInt(extra.remainSeats) };
    await pool.query('UPDATE module_posts SET title=?,content=?,summary=?,price=?,priceNote=?,contact=?,contactType=?,images=?,tags=?,location=?,extra=?,participateCount=? WHERE id=?', [...Object.values(values), row.id]);
    res.json({ success: true, message: '更新成功', data: formatCarpool(await findCarpool(row.id)) });
  } catch (e) { next(e); }
};

exports.remove = async (req, res, next) => { try { const row = await findCarpool(req.params.id); ensureOwner(row, req.userId); if (['ended','cancelled','expired'].includes(row.status)) throw new AppError('该拼车已经结束或已取消',400); await getPool().query("UPDATE module_posts SET status='cancelled', cancelReason=? WHERE id=?", [req.body.reason || '发布者取消', row.id]); res.json({ success:true, message:'拼车已取消' }); } catch(e){ next(e); } };

exports.join = async (req, res, next) => {
  const pool = getPool(); let conn;
  try { conn = await pool.getConnection(); await conn.beginTransaction(); const row = await findCarpool(req.params.id, true, conn); if (!row) throw new AppError('拼车信息不存在',404); if (!['active','full'].includes(row.status)) throw new AppError('该拼车已无法加入',400); if (String(row.creator_id) === String(req.userId)) throw new AppError('不能加入自己发布的拼车',400); const extra = json(row.extra); if (asInt(extra.remainSeats) <= 0) throw new AppError('人数已满',400); const [exists] = await conn.query("SELECT id FROM content_participants WHERE content_id=? AND user_id=? AND status='joined'",[row.id,req.userId]); if (exists.length) throw new AppError('你已经加入了这个拼车',400); const user = await User.findById(req.userId); await conn.query("INSERT INTO content_participants (content_id,user_id,nickName,avatarUrl,creditScore,contact,note,status) VALUES (?,?,?,?,?,?,?,'joined') ON DUPLICATE KEY UPDATE nickName=VALUES(nickName),avatarUrl=VALUES(avatarUrl),creditScore=VALUES(creditScore),contact=VALUES(contact),note=VALUES(note),status='joined',joinTime=CURRENT_TIMESTAMP",[row.id,req.userId,user.nickName || '',user.avatarUrl || '',user.creditScore || 100,req.body.contact || user.phone || '',req.body.note || '']); extra.remainSeats = asInt(extra.remainSeats) - 1; const status = extra.remainSeats === 0 ? 'full' : 'active'; await conn.query('UPDATE module_posts SET extra=?, participateCount=participateCount+1,status=? WHERE id=?',[JSON.stringify(extra),status,row.id]); await conn.query('UPDATE users SET joinCount=joinCount+1,tripCount=tripCount+1 WHERE id=?',[req.userId]); await conn.commit(); res.json({success:true,message:'加入成功',data:{remainSeats:extra.remainSeats,status}}); } catch(e) { if(conn) await conn.rollback(); next(e); } finally { if(conn) conn.release(); }
};

exports.cancelJoin = async (req,res,next) => { const pool=getPool(); let conn; try { conn=await pool.getConnection(); await conn.beginTransaction(); const row=await findCarpool(req.params.id,true,conn); if(!row) throw new AppError('拼车信息不存在',404); const [changed]=await conn.query("UPDATE content_participants SET status='left' WHERE content_id=? AND user_id=? AND status='joined'",[row.id,req.userId]); if(!changed.affectedRows) throw new AppError('你未加入此拼车',400); const extra=json(row.extra); extra.remainSeats=asInt(extra.remainSeats)+1; await conn.query("UPDATE module_posts SET extra=?,participateCount=GREATEST(participateCount-1,0),status=IF(status='full','active',status) WHERE id=?",[JSON.stringify(extra),row.id]); await conn.commit(); await Notification.create({ recipient: row.creator_id, sender: req.userId, senderSnapshot: { nickName: (req.user && req.user.nickName) || '', avatarUrl: (req.user && req.user.avatarUrl) || '' }, type: 'participant_left', title: '有人退出了你的拼车', content: `有人退出了 ${extra.from || ''} → ${extra.to || ''} 的拼车`, relatedCarpool: row.legacyCarpoolId || row.id, priority: 'normal' }); res.json({success:true,message:'已取消加入',data:{remainSeats:extra.remainSeats,status:row.status==='full'?'active':row.status}}); } catch(e){if(conn) await conn.rollback();next(e);} finally {if(conn) conn.release();} };
exports.endCarpool = async (req,res,next) => { try { const row=await findCarpool(req.params.id); ensureOwner(row,req.userId); if(!['active','full'].includes(row.status)) throw new AppError('该拼车已结束',400); const pool=getPool(); await pool.query("UPDATE module_posts SET status='ended' WHERE id=?",[row.id]); const extra=json(row.extra); const route=`${extra.from || ''} → ${extra.to || ''}`; const [participants]=await pool.query("SELECT user_id FROM content_participants WHERE content_id = ? AND status = 'joined'",[row.id]); for (const p of participants) { await Notification.create({ recipient: p.user_id, sender: req.userId, senderSnapshot: { nickName: (req.user && req.user.nickName) || '', avatarUrl: (req.user && req.user.avatarUrl) || '' }, type: 'carpool_ended', title: '拼车已结束', content: `${(req.user && req.user.nickName) || ''} 已将 ${route} 的拼车标记为已结束，快去评价吧~`, relatedCarpool: row.legacyCarpoolId || row.id, priority: 'high' }); } res.json({success:true,message:'拼车已结束'}); } catch(e){next(e);} };
exports.favorite = async (req,res,next) => { try { const row=await findCarpool(req.params.id); if(!row) throw new AppError('拼车信息不存在',404); const [existing]=await getPool().query('SELECT id FROM module_favorites WHERE user_id=? AND post_id=?',[req.userId,row.id]); if(existing.length) throw new AppError('已收藏',400); await ModulePost.toggleFavorite(req.userId,row.id,MODULE); res.json({success:true,message:'收藏成功'}); } catch(e){next(e);} };
exports.unfavorite = async (req,res,next) => { try { const row=await findCarpool(req.params.id); if(!row) throw new AppError('拼车信息不存在',404); const [existing]=await getPool().query('SELECT id FROM module_favorites WHERE user_id=? AND post_id=?',[req.userId,row.id]); if(!existing.length) throw new AppError('未收藏',400); await ModulePost.toggleFavorite(req.userId,row.id,MODULE); res.json({success:true,message:'已取消收藏'}); } catch(e){next(e);} };
exports.getMyPublished = async (req,res,next) => { try { const {status,page=1,pageSize=10}=req.query; const pool=getPool(); const where=['module=?','creator_id=?']; const vals=[MODULE,req.userId]; if(status){where.push('status=?');vals.push(status);} const size=Math.min(Math.max(asInt(pageSize,10),1),100), current=Math.max(asInt(page,1),1); const [[{total}]]=await pool.query(`SELECT COUNT(*) total FROM module_posts WHERE ${where.join(' AND ')}`,vals); const [rows]=await pool.query(`SELECT * FROM module_posts WHERE ${where.join(' AND ')} ORDER BY createTime DESC LIMIT ? OFFSET ?`,[...vals,size,(current-1)*size]); const pm=await getParticipants(rows.map(x=>x.id));res.json({success:true,data:pageData(current,size,total,rows.map(x=>formatCarpool(x,pm[x.id]||[])))});}catch(e){next(e);} };
exports.getMyJoined = async (req,res,next) => { try { const {status,page=1,pageSize=10}=req.query; const pool=getPool();const size=Math.min(Math.max(asInt(pageSize,10),1),100),current=Math.max(asInt(page,1),1);let where="p.module=? AND cp.user_id=? AND cp.status='joined'",vals=[MODULE,req.userId];if(status){where+=' AND p.status=?';vals.push(status);}const [[{total}]]=await pool.query(`SELECT COUNT(*) total FROM module_posts p JOIN content_participants cp ON cp.content_id=p.id WHERE ${where}`,vals);const [rows]=await pool.query(`SELECT p.* FROM module_posts p JOIN content_participants cp ON cp.content_id=p.id WHERE ${where} ORDER BY p.createTime DESC LIMIT ? OFFSET ?`,[...vals,size,(current-1)*size]);const pm=await getParticipants(rows.map(x=>x.id));res.json({success:true,data:pageData(current,size,total,rows.map(x=>formatCarpool(x,pm[x.id]||[])))});}catch(e){next(e);} };
exports.getMyFavorites = async (req,res,next) => { try { const {page=1,pageSize=10}=req.query; const pool=getPool();const size=Math.min(Math.max(asInt(pageSize,10),1),100),current=Math.max(asInt(page,1),1);const [[{total}]]=await pool.query("SELECT COUNT(*) total FROM module_favorites f JOIN module_posts p ON p.id=f.post_id WHERE f.user_id=? AND p.module=?",[req.userId,MODULE]);const [rows]=await pool.query("SELECT p.*,f.createTime favoritedAt FROM module_favorites f JOIN module_posts p ON p.id=f.post_id WHERE f.user_id=? AND p.module=? ORDER BY f.createTime DESC LIMIT ? OFFSET ?",[req.userId,MODULE,size,(current-1)*size]);const pm=await getParticipants(rows.map(x=>x.id));res.json({success:true,data:pageData(current,size,total,rows.map(x=>formatCarpool(x,pm[x.id]||[])))});}catch(e){next(e);} };
