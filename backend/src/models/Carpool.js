const { createModel, getPool, buildWhere, buildSort } = require('./mysql');

const tableName = 'carpools';

const fieldMap = {
  'from': 'from_place',
  'to': 'to_place',
  'creator': 'creator_id',
  'creatorSnapshot.nickName': 'creator_nickName',
  'creatorSnapshot.avatarUrl': 'creator_avatarUrl',
  'creatorSnapshot.creditScore': 'creator_creditScore',
  'creatorSnapshot.gender': 'creator_gender',
  'creatorSnapshot.school': 'creator_school',
  'vehicleInfo.plateNumber': 'vehicle_plateNumber',
  'vehicleInfo.brand': 'vehicle_brand',
  'vehicleInfo.color': 'vehicle_color',
};

const schemaHints = {
  primaryKey: 'id',
  jsonFields: ['tags', 'images'],
  booleanFields: ['isUrgent', 'isFeatured', 'showContactAfterJoin'],
};

const baseModel = createModel(tableName, schemaHints, fieldMap);

// ========== Participants handling ==========

async function fetchParticipants(carpoolIds) {
  if (!carpoolIds || carpoolIds.length === 0) return {};
  const pool = getPool();
  const [rows] = await pool.query(
    'SELECT * FROM carpool_participants WHERE carpool_id IN (' + carpoolIds.map(() => '?').join(',') + ') ORDER BY joinTime ASC',
    carpoolIds
  );

  const map = {};
  for (const row of rows) {
    const p = {
      user: { _id: row.user_id, id: row.user_id, toString: function() { return String(row.user_id); } },
      nickName: row.nickName,
      avatarUrl: row.avatarUrl,
      creditScore: row.creditScore,
      joinTime: row.joinTime,
      status: row.status,
      contact: row.contact || '',
      note: row.note || '',
    };
    if (!map[row.carpool_id]) map[row.carpool_id] = [];
    map[row.carpool_id].push(p);
  }
  return map;
}

function attachNested(carpool) {
  if (!carpool) return carpool;
  carpool.creatorSnapshot = {
    nickName: carpool.creator_nickName,
    avatarUrl: carpool.creator_avatarUrl,
    creditScore: carpool.creator_creditScore,
    gender: carpool.creator_gender,
    school: carpool.creator_school,
  };
  carpool.vehicleInfo = {
    plateNumber: carpool.vehicle_plateNumber || '',
    brand: carpool.vehicle_brand || '',
    color: carpool.vehicle_color || '',
  };
  return carpool;
}

// Parse conditions for participant queries
function extractParticipantConditions(conditions) {
  const participantCond = {};
  const mainCond = {};
  for (const [key, val] of Object.entries(conditions)) {
    if (key.startsWith('participants.')) {
      const subKey = key.replace('participants.', '');
      if (subKey === 'user') {
        participantCond.user_id = val;
      } else {
        participantCond[subKey] = val;
      }
    } else if (key === 'participants') {
      if (val && val.$elemMatch) {
        participantCond.user_id = val.$elemMatch.user;
        participantCond.status = val.$elemMatch.status || 'joined';
      }
    } else {
      mainCond[key] = val;
    }
  }
  return { participantCond, mainCond };
}

// Override find to support participant conditions
const origFind = baseModel.find;
baseModel.find = function(conditions = {}) {
  // Handle $or with participant conditions
  if (conditions.$or) {
    const pool = getPool();
    const hasPartCond = conditions.$or.some(c => c.participants || Object.keys(c).some(k => k.startsWith('participants.')));
    
    if (hasPartCond) {
      // Build combined query with participant subqueries
      const qb = new (origFind()._constructor || origFind().__proto__.constructor)();
      // Instead, just build the SQL directly
      const mainOrConds = [];
      const partOrConds = [];
      
      for (const cond of conditions.$or) {
        const { participantCond, mainCond } = extractParticipantConditions(cond);
        if (Object.keys(participantCond).length > 0) {
          partOrConds.push(participantCond);
        }
        if (Object.keys(mainCond).length > 0) {
          mainOrConds.push(mainCond);
        }
      }
      
      // Build the SQL
      const orParts = [];
      const allVals = [];
      
      // Main conditions as OR
      for (const mc of mainOrConds) {
        const w = buildWhere(mc, '', fieldMap);
        orParts.push(w.sql);
        allVals.push(...w.values);
      }
      
      // Participant conditions as OR with subquery
      for (const pc of partOrConds) {
        let partWhere = [];
        let partVals = [];
        for (const [k, v] of Object.entries(pc)) {
          partWhere.push(`\`${k}\` = ?`);
          partVals.push(v);
        }
        const subquery = `SELECT DISTINCT carpool_id FROM carpool_participants WHERE ${partWhere.join(' AND ')}`;
        orParts.push(`id IN (${subquery})`);
        allVals.push(...partVals);
      }
      
      let whereSql = orParts.length > 0 ? orParts.join(' OR ') : '1=1';
      
      // Apply additional non-$or conditions
      const nonOrCond = { ...conditions };
      delete nonOrCond.$or;
      if (Object.keys(nonOrCond).length > 0) {
        const extraWhere = buildWhere(nonOrCond, '', fieldMap);
        if (extraWhere.sql !== '1=1') {
          whereSql = `(${whereSql}) AND ${extraWhere.sql}`;
          allVals.push(...extraWhere.values);
        }
      }
      
      let sql = `SELECT * FROM \`${tableName}\` WHERE ${whereSql}`;
      
      // Get the sort/limit from the query builder that would be returned
      const qb2 = origFind({});
      // We'll handle sort/limit in the exec override
      qb2._customSql = sql;
      qb2._customVals = allVals;
      const origExec2 = qb2.exec.bind(qb2);
      
      qb2.exec = async function() {
        let finalSql = this._customSql;
        let finalVals = [...this._customVals];
        
        if (this._sortObj) {
          const parts = [];
          for (const [key, dir] of Object.entries(this._sortObj)) {
            const col = (fieldMap && fieldMap[key]) || key;
            parts.push(`\`${col}\` ${dir === -1 ? 'DESC' : 'ASC'}`);
          }
          if (parts.length > 0) finalSql += ' ORDER BY ' + parts.join(', ');
        }
        
        if (this._limitVal !== null) {
          finalSql += ` LIMIT ? OFFSET ?`;
          finalVals.push(this._limitVal, this._skipVal);
        }
        
        const [rows] = await pool.query(finalSql, finalVals);
        let carpools = rows.map(r => baseModel.rowToObject(r));
        
        if (carpools.length > 0) {
          const ids = carpools.map(c => c.id);
          const participantsMap = await fetchParticipants(ids);
          for (const c of carpools) {
            c.participants = participantsMap[c.id] || [];
            attachNested(c);
            // 填充 creator
            c.creator = {
              _id: c.creator_id, id: c.creator_id,
              nickName: c.creator_nickName || '未知用户',
              avatarUrl: c.creator_avatarUrl || '',
              creditScore: c.creator_creditScore || 100,
              gender: c.creator_gender || 'secret',
              school: c.creator_school || '',
              toString: function() { return String(this._id); }
            };
          }
        }
        return carpools;
      };
      
      return qb2;
    }
  }
  
  // Normal path (no $or with participant conditions)
  const { participantCond, mainCond } = extractParticipantConditions(conditions);
  
  const qb = origFind(mainCond);
  const origExec = qb.exec.bind(qb);
  
  qb._hasParticipantFilter = Object.keys(participantCond).length > 0;
  qb._participantCond = participantCond;

  // 存储原始 populate
  const origPopulate = qb.populate.bind(qb);
  qb._carpoolPopulates = [];
  qb.populate = function(path, select) {
    qb._carpoolPopulates.push({ path, select });
    return this;
  };

  qb.exec = async function() {
    let carpools;
    
    if (this._hasParticipantFilter) {
      const pool = getPool();
      const pc = this._participantCond;
      let partWhere = [];
      let partVals = [];
      for (const [k, v] of Object.entries(pc)) {
        partWhere.push(`\`${k}\` = ?`);
        partVals.push(v);
      }
      
      const where = buildWhere(mainCond, '', fieldMap);
      const subquery = `SELECT DISTINCT carpool_id FROM carpool_participants WHERE ${partWhere.join(' AND ')}`;
      
      let sql = `SELECT * FROM \`${tableName}\` WHERE id IN (${subquery})`;
      if (where.sql !== '1=1') {
        sql += ` AND ${where.sql}`;
      }
      
      const allVals = [...partVals, ...where.values];
      
      if (this._sortObj) {
        const parts = [];
        for (const [key, dir] of Object.entries(this._sortObj)) {
          const col = (fieldMap && fieldMap[key]) || key;
          parts.push(`\`${col}\` ${dir === -1 ? 'DESC' : 'ASC'}`);
        }
        if (parts.length > 0) sql += ' ORDER BY ' + parts.join(', ');
      }
      
      if (this._limitVal !== null) {
        sql += ` LIMIT ? OFFSET ?`;
        allVals.push(this._limitVal, this._skipVal);
      }
      
      const [rows] = await pool.query(sql, allVals);
      carpools = rows.map(r => baseModel.rowToObject(r));
    } else {
      carpools = await origExec();
    }

    if (carpools.length > 0) {
      const ids = carpools.map(c => c.id);
      const participantsMap = await fetchParticipants(ids);
      
      // 如果 populate 了 creator，从 DB 查完整用户信息
      const hasCreatorPopulate = (qb._carpoolPopulates || []).some(f => f.path === 'creator');
      let creatorMap = {};
      if (hasCreatorPopulate) {
        const pool = getPool();
        // rowToObject 把 creator_id 重命名为 creator（数字值）
        const creatorIds = [...new Set(carpools.map(c => c.creator).filter(c => typeof c === 'number' || typeof c === 'string'))];
        if (creatorIds.length > 0) {
          const placeholders = creatorIds.map(() => '?').join(',');
          const [userRows] = await pool.query(
            'SELECT id, nickName, avatarUrl, creditScore, gender, school, bio, tripCount, goodRate, user_id_code FROM users WHERE id IN (' + placeholders + ')',
            creatorIds
          );
          for (const u of userRows) {
            creatorMap[u.id] = {
              _id: u.id, id: u.id,
              nickName: u.nickName,
              avatarUrl: u.avatarUrl || '',
              creditScore: u.creditScore,
              gender: u.gender,
              school: u.school || '',
              bio: u.bio || '',
              tripCount: u.tripCount || 0,
              goodRate: u.goodRate || 100,
              user_id_code: u.user_id_code || '',
              toString: function() { return String(this._id); }
            };
          }
        }
      }
      
      for (const c of carpools) {
        c.participants = participantsMap[c.id] || [];
        attachNested(c);
        if (hasCreatorPopulate) {
          const rawCreator = typeof c.creator === 'object' ? c.creator.id : c.creator;
          if (rawCreator) {
            c.creator = creatorMap[rawCreator] || {
              _id: rawCreator, id: rawCreator,
              nickName: c.creator_nickName || '未知用户',
              avatarUrl: c.creator_avatarUrl || '',
              creditScore: c.creator_creditScore || 100,
              gender: c.creator_gender || 'secret',
              school: c.creator_school || '',
              toString: function() { return String(this._id); }
            };
          }
        }
      }
    }

    return carpools;
  };

  return qb;
};

// Override findById — 支持链式 .populate()
const origFindById = baseModel.findById;
baseModel.findById = function(id) {
  // 返回一个 thenable 对象，支持 .populate() 链式调用
  const pendingPromise = origFindById(id).then(carpool => {
    if (carpool) {
      // rowToObject 把 creator_id 重命名为 creator（数字值）
      // 保存原始 creator ID
      const rawCreator = carpool.creator;
      carpool._rawCreatorId = rawCreator;
      // 默认填充 creator 信息（用 snapshot 字段）
      carpool.creator = {
        _id: rawCreator,
        id: rawCreator,
        nickName: carpool.creator_nickName || '未知用户',
        avatarUrl: carpool.creator_avatarUrl || '',
        creditScore: carpool.creator_creditScore || 100,
        gender: carpool.creator_gender || 'secret',
        school: carpool.creator_school || '',
        bio: '',
        tripCount: 0,
        goodRate: 100,
        toString: function() { return String(this._id); }
      };
    }
    return carpool;
  });

  const chainable = {
    _populateFields: [],
    populate(path, select) { this._populateFields.push({ path, select }); return this; },
    select(s) { return this; },
    lean() { return this; },
    then(resolve, reject) { return pendingPromise.then(resolve, reject); },
    catch(reject) { return pendingPromise.catch(reject); },
  };

  // 重新构建 promise，加入 populate 逻辑
  const rebuiltPromise = pendingPromise.then(async carpool => {
    if (!carpool) return null;

    // 如果 populate 了 creator，从 DB 查完整用户信息
    const hasCreatorPopulate = chainable._populateFields.some(f => f.path === 'creator');
    if (hasCreatorPopulate) {
      const pool = getPool();
      const creatorId = carpool._rawCreatorId || (typeof carpool.creator === 'object' ? carpool.creator.id : carpool.creator);
      if (creatorId) {
        const [userRows] = await pool.query(
          'SELECT id, nickName, avatarUrl, creditScore, gender, school, bio, tripCount, goodRate FROM users WHERE id = ?',
          [creatorId]
        );
        if (userRows.length > 0) {
          const u = userRows[0];
          carpool.creator = {
            _id: u.id,
            id: u.id,
            nickName: u.nickName,
            avatarUrl: u.avatarUrl || '',
            creditScore: u.creditScore,
            gender: u.gender,
            school: u.school || '',
            bio: u.bio || '',
            tripCount: u.tripCount || 0,
            goodRate: u.goodRate || 100,
            toString: function() { return String(this._id); }
          };
        }
      }
    }

    const participantsMap = await fetchParticipants([carpool.id]);
    carpool.participants = participantsMap[carpool.id] || [];
    attachNested(carpool);
    attachCarpoolMethods(carpool);
    return carpool;
  });

  // 返回 chainable 但 then 指向 rebuiltPromise
  chainable.then = (resolve, reject) => rebuiltPromise.then(resolve, reject);
  chainable.catch = (reject) => rebuiltPromise.catch(reject);

  return chainable;
};

// Override findOne
const origFindOne = baseModel.findOne;
baseModel.findOne = async function(conditions) {
  const { participantCond, mainCond } = extractParticipantConditions(conditions);
  let carpool;
  
  if (Object.keys(participantCond).length > 0) {
    // Use find with limit 1
    const qb = baseModel.find(conditions);
    qb._limitVal = 1;
    qb._skipVal = 0;
    const results = await qb.exec();
    carpool = results[0] || null;
  } else {
    carpool = await origFindOne(mainCond);
  }
  
  if (carpool) {
    const participantsMap = await fetchParticipants([carpool.id]);
    carpool.participants = participantsMap[carpool.id] || [];
    attachNested(carpool);
    attachCarpoolMethods(carpool);
  }
  return carpool;
};

// Override create
const origCreate = baseModel.create;
baseModel.create = async function(data) {
  const flatData = { ...data };
  if (flatData.creatorSnapshot) {
    flatData.creator_nickName = flatData.creatorSnapshot.nickName;
    flatData.creator_avatarUrl = flatData.creatorSnapshot.avatarUrl || '';
    flatData.creator_creditScore = flatData.creatorSnapshot.creditScore || 100;
    flatData.creator_gender = flatData.creatorSnapshot.gender || 'secret';
    flatData.creator_school = flatData.creatorSnapshot.school || '';
    delete flatData.creatorSnapshot;
  }
  if (flatData.vehicleInfo) {
    flatData.vehicle_plateNumber = flatData.vehicleInfo.plateNumber || '';
    flatData.vehicle_brand = flatData.vehicleInfo.brand || '';
    flatData.vehicle_color = flatData.vehicleInfo.color || '';
    delete flatData.vehicleInfo;
  }
  if (flatData.from !== undefined) { flatData.from_place = flatData.from; delete flatData.from; }
  if (flatData.to !== undefined) { flatData.to_place = flatData.to; delete flatData.to; }
  if (flatData.creator !== undefined) { flatData.creator_id = flatData.creator; delete flatData.creator; }
  delete flatData.participants;

  return origCreate(flatData);
};

// Override countDocuments for participant conditions
const origCount = baseModel.countDocuments;
baseModel.countDocuments = async function(conditions = {}) {
  const { participantCond, mainCond } = extractParticipantConditions(conditions);
  
  if (Object.keys(participantCond).length > 0) {
    const pool = getPool();
    const pc = participantCond;
    let partWhere = [];
    let partVals = [];
    for (const [k, v] of Object.entries(pc)) {
      partWhere.push(`cp.${k} = ?`);
      partVals.push(v);
    }
    
    const where = buildWhere(mainCond, 'c', fieldMap);
    
    let sql = `SELECT COUNT(DISTINCT c.id) as count FROM \`${tableName}\` c INNER JOIN carpool_participants cp ON c.id = cp.carpool_id WHERE ${partWhere.join(' AND ')}`;
    if (where.sql !== '1=1') {
      sql += ` AND ${where.sql}`;
      partVals.push(...where.values);
    }
    
    const [rows] = await pool.query(sql, partVals);
    return rows[0].count;
  }
  
  return origCount(mainCond);
};

function attachCarpoolMethods(carpool) {
  if (!carpool) return;

  carpool.save = async function() {
    const pool = getPool();
    const fields = [];
    const values = [];

    const saveData = { ...this };
    delete saveData.participants;
    delete saveData.creatorSnapshot;
    delete saveData.vehicleInfo;
    delete saveData._id;
    delete saveData.id;
    delete saveData.save;
    delete saveData.deleteOne;
    delete saveData.toObject;
    delete saveData.isJoined;
    delete saveData.isCreator;
    delete saveData.isFavorited;

    if (saveData.from !== undefined) { saveData.from_place = saveData.from; delete saveData.from; }
    if (saveData.to !== undefined) { saveData.to_place = saveData.to; delete saveData.to; }
    if (saveData.creator !== undefined) {
      saveData.creator_id = typeof saveData.creator === 'object' ? (saveData.creator._id || saveData.creator.id) : saveData.creator;
      delete saveData.creator;
    }
    delete saveData._rawCreatorId;

    // 转换日期格式: ISO -> MySQL DATETIME
    function toMysqlDate(val) {
      if (!val) return null;
      if (val instanceof Date) {
        return val.toISOString().slice(0, 19).replace('T', ' ');
      }
      if (typeof val === 'string') {
        // ISO format: 2026-06-22T10:00:00+08:00 or 2026-06-22T10:00:00.000Z
        const d = new Date(val);
        if (!isNaN(d.getTime())) {
          return d.toISOString().slice(0, 19).replace('T', ' ');
        }
        return val;
      }
      return val;
    }
    ['departureTime', 'deadlineTime', 'createTime', 'updateTime'].forEach(f => {
      if (saveData[f] !== undefined) saveData[f] = toMysqlDate(saveData[f]);
    });

    for (const [key, val] of Object.entries(saveData)) {
      if (typeof val === 'function') continue;
      if (['tags', 'images'].includes(key) && Array.isArray(val)) {
        fields.push(`\`${key}\` = ?`);
        values.push(JSON.stringify(val));
      } else {
        fields.push(`\`${key}\` = ?`);
        values.push(val === true ? 1 : val === false ? 0 : val);
      }
    }
    values.push(this.id);
    if (fields.length > 0) {
      await pool.query(`UPDATE \`${tableName}\` SET ${fields.join(', ')} WHERE id = ?`, values);
    }

    // Save participants
    if (this.participants && Array.isArray(this.participants)) {
      // Delete existing and re-insert for simplicity
      await pool.query('DELETE FROM carpool_participants WHERE carpool_id = ?', [this.id]);
      for (const p of this.participants) {
        const pId = (p.user && (p.user._id || p.user.id || p.user)) || 
                     (typeof p.user === 'number' ? p.user : null);
        if (!pId) continue;
        await pool.query(
          `INSERT INTO carpool_participants (carpool_id, user_id, nickName, avatarUrl, creditScore, joinTime, status, contact, note)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [this.id, pId, p.nickName, p.avatarUrl || '', p.creditScore || 100,
           p.joinTime || new Date(), p.status || 'joined', p.contact || '', p.note || '']
        );
      }
    }

    return this;
  };

  carpool.deleteOne = async function() {
    const pool = getPool();
    await pool.query('DELETE FROM carpool_participants WHERE carpool_id = ?', [this.id]);
    await pool.query('DELETE FROM carpools WHERE id = ?', [this.id]);
  };

  carpool.toObject = function() { return { ...this }; };
}

// Static method: markExpired
// 超过出发时间的进行中拼车（active/full）自动置为 expired（"已结束"），只改状态、不删除记录
baseModel.markExpired = async function() {
  const pool = getPool();
  const [result] = await pool.query(
    "UPDATE carpools SET status = 'expired' WHERE status IN ('active', 'full') AND departureTime < NOW()"
  );
  return result.affectedRows || 0;
};

module.exports = baseModel;
