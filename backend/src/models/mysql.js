/**
 * MySQL Query Builder — Mongoose-compatible API wrapper over mysql2/promise
 */

const getPool = require('../config/db');

/**
 * Convert Mongoose-style conditions to SQL WHERE clause
 * @param {object} conditions - Mongoose query conditions
 * @param {string} tableAlias - Table alias for column prefix
 * @param {object|null} fieldMap - { mongoField: mysqlColumn } mapping
 */
function buildWhere(conditions, tableAlias = '', fieldMap = null) {
  if (!conditions || Object.keys(conditions).length === 0) return { sql: '1=1', values: [] };

  const resolveCol = (key) => {
    if (key === '_id') return 'id'; // Mongoose 兼容：_id → 主键（本项目所有表主键均为 id）
    return fieldMap && fieldMap[key] ? fieldMap[key] : key;
  };
  const prefix = tableAlias ? tableAlias + '.' : '';
  const parts = [];
  const values = [];

  for (const [key, val] of Object.entries(conditions)) {
    if (key === '$or') {
      const orParts = [];
      for (const cond of val) {
        const sub = buildWhere(cond, tableAlias, fieldMap);
        orParts.push('(' + sub.sql + ')');
        values.push(...sub.values);
      }
      parts.push('(' + orParts.join(' OR ') + ')');
    } else if (key === '$and') {
      const andParts = [];
      for (const cond of val) {
        const sub = buildWhere(cond, tableAlias, fieldMap);
        andParts.push('(' + sub.sql + ')');
        values.push(...sub.values);
      }
      parts.push('(' + andParts.join(' AND ') + ')');
    } else if (val instanceof RegExp) {
      const pattern = val.source.replace(/%/g, '\\%').replace(/_/g, '\\_');
      const col = resolveCol(key);
      parts.push(prefix + '`' + col + '` LIKE ?');
      values.push('%' + pattern + '%');
    } else if (val !== null && typeof val === 'object' && !Array.isArray(val) && !(val instanceof Date)) {
      for (const [op, opVal] of Object.entries(val)) {
        const col = resolveCol(key);
        switch (op) {
          case '$gt': parts.push(prefix + '`' + col + '` > ?'); values.push(opVal); break;
          case '$gte': parts.push(prefix + '`' + col + '` >= ?'); values.push(opVal); break;
          case '$lt': parts.push(prefix + '`' + col + '` < ?'); values.push(opVal); break;
          case '$lte': parts.push(prefix + '`' + col + '` <= ?'); values.push(opVal); break;
          case '$ne':
            if (opVal === null) parts.push(prefix + '`' + col + '` IS NOT NULL');
            else { parts.push(prefix + '`' + col + '` != ?'); values.push(opVal); }
            break;
          case '$in':
            if (Array.isArray(opVal) && opVal.length > 0) {
              parts.push(prefix + '`' + col + '` IN (' + opVal.map(() => '?').join(',') + ')');
              values.push(...opVal);
            } else parts.push('0=1');
            break;
          case '$nin':
            if (Array.isArray(opVal) && opVal.length > 0) {
              parts.push(prefix + '`' + col + '` NOT IN (' + opVal.map(() => '?').join(',') + ')');
              values.push(...opVal);
            }
            break;
          case '$exists':
            if (opVal) parts.push(prefix + '`' + col + '` IS NOT NULL');
            else parts.push(prefix + '`' + col + '` IS NULL');
            break;
          case '$elemMatch':
            if (typeof opVal === 'object') {
              parts.push('JSON_CONTAINS(' + prefix + '`' + col + '`, JSON_OBJECT(' +
                Object.keys(opVal).map(k => "'" + k + "', ?").join(',') + '))');
              values.push(...Object.values(opVal));
            }
            break;
        }
      }
    } else if (Array.isArray(val)) {
      const col = resolveCol(key);
      parts.push(prefix + '`' + col + '` = ?');
      values.push(val);
    } else if (val === null) {
      const col = resolveCol(key);
      parts.push(prefix + '`' + col + '` IS NULL');
    } else {
      const col = resolveCol(key);
      parts.push(prefix + '`' + col + '` = ?');
      values.push(val);
    }
  }

  return { sql: parts.length > 0 ? parts.join(' AND ') : '1=1', values };
}

/**
 * Build ORDER BY clause from Mongoose-style sort object
 * @param {object} sortObj - { field: 1|-1 }
 * @param {object|null} fieldMap - { mongoField: mysqlColumn } mapping
 */
function buildSort(sortObj, fieldMap = null) {
  if (!sortObj || Object.keys(sortObj).length === 0) return '';
  const parts = [];
  for (const [key, dir] of Object.entries(sortObj)) {
    const col = (fieldMap && fieldMap[key]) || key;
    parts.push('`' + col + '` ' + (dir === -1 ? 'DESC' : 'ASC'));
  }
  return 'ORDER BY ' + parts.join(', ');
}

function createModel(tableName, schemaHints = {}, fieldMap = null) {
  const pk = schemaHints.primaryKey || 'id';
  const jsonFields = schemaHints.jsonFields || [];
  const booleanFields = schemaHints.booleanFields || [];
  const reverseMap = {};

  if (fieldMap) {
    for (const [mongoKey, mysqlCol] of Object.entries(fieldMap)) {
      reverseMap[mysqlCol] = mongoKey;
    }
  }

  function rowToObject(row) {
    if (!row) return null;
    const obj = { ...row };
    for (const f of jsonFields) {
      const mysqlCol = fieldMap ? (fieldMap[f] || f) : f;
      if (typeof obj[mysqlCol] === 'string') {
        try { obj[mysqlCol] = JSON.parse(obj[mysqlCol]); } catch (e) {}
      }
      if (obj[mysqlCol] === null || obj[mysqlCol] === undefined) obj[mysqlCol] = [];
    }
    for (const f of booleanFields) {
      const mysqlCol = fieldMap ? (fieldMap[f] || f) : f;
      if (obj[mysqlCol] !== undefined) obj[mysqlCol] = !!obj[mysqlCol];
    }
    if (fieldMap) {
      for (const [mysqlCol, mongoField] of Object.entries(reverseMap)) {
        if (mysqlCol in obj && mongoField !== mysqlCol && !mongoField.includes('.')) {
          obj[mongoField] = obj[mysqlCol];
          delete obj[mysqlCol];
        }
      }
    }
    obj._id = obj[pk];
    obj.toObject = function () { return { ...this }; };
    return obj;
  }

  function toMysqlCol(field) {
    if (fieldMap && fieldMap[field]) return fieldMap[field];
    return field;
  }

  function buildSet(updateObj) {
    const sets = [];
    const values = [];
    for (const [op, fields] of Object.entries(updateObj)) {
      switch (op) {
        case '$set':
          for (const [key, val] of Object.entries(fields)) {
            const col = toMysqlCol(key);
            if (val instanceof Date) { sets.push('`' + col + '` = ?'); values.push(val); }
            else if (typeof val === 'object' && val !== null) { sets.push('`' + col + '` = ?'); values.push(JSON.stringify(val)); }
            else { sets.push('`' + col + '` = ?'); values.push(val); }
          }
          break;
        case '$inc':
          for (const [key, val] of Object.entries(fields)) {
            const col = toMysqlCol(key);
            sets.push('`' + col + '` = `' + col + '` + ?');
            values.push(val);
          }
          break;
        case '$addToSet':
          for (const [key, val] of Object.entries(fields)) {
            const col = toMysqlCol(key);
            sets.push('`' + col + '` = JSON_ARRAY_APPEND(COALESCE(`' + col + '`, \'[]\'), \'$\', ?)');
            values.push(JSON.stringify(val));
          }
          break;
        case '$unset':
          for (const key of Object.keys(fields)) {
            const col = toMysqlCol(key);
            sets.push('`' + col + '` = NULL');
          }
          break;
      }
    }
    return { sql: sets.join(', '), values };
  }

  // Query Builder
  class QueryBuilder {
    constructor(fm) {
      this._conditions = {};
      this._sortObj = null;
      this._skipVal = 0;
      this._limitVal = null;
      this._selectStr = null;
      this._populates = [];
      this._lean = false;
      this._fieldMap = fm || fieldMap || null;
    }
    where(conditions) { Object.assign(this._conditions, conditions); return this; }
    sort(sortObj) { this._sortObj = sortObj; return this; }
    skip(n) { this._skipVal = n; return this; }
    limit(n) { this._limitVal = n; return this; }
    select(str) { this._selectStr = str; return this; }
    populate(path, select) { this._populates.push({ path, select }); return this; }
    lean() { this._lean = true; return this; }
    then(resolve, reject) { this.exec().then(resolve, reject); }

    async exec() {
      const pool = getPool();
      const where = buildWhere(this._conditions, '', this._fieldMap);
      const selectClause = '*';
      const sortClause = buildSort(this._sortObj, fieldMap);
      const values = [...where.values];

      let sql = 'SELECT ' + selectClause + ' FROM `' + tableName + '` WHERE ' + where.sql;
      if (sortClause) sql += ' ' + sortClause;
      if (this._limitVal !== null) {
        sql += ' LIMIT ? OFFSET ?';
        values.push(this._limitVal, this._skipVal);
      }

      const [rows] = await pool.query(sql, values);
      let objects = rows.map(r => rowToObject(r));

      if (this._selectStr) {
        const excludeFields = this._selectStr.split(/\s+/).filter(f => f.startsWith('-')).map(f => f.slice(1));
        if (excludeFields.length > 0) {
          objects = objects.map(obj => {
            const result = { ...obj };
            for (const f of excludeFields) delete result[f];
            return result;
          });
        }
      }

      if (this._populates.length > 0) {
        for (const pop of this._populates) {
          objects = await applyPopulate(objects, pop, pool);
        }
      }

      return objects;
    }
  }

  const populateConfig = {
    creator: { table: 'users', fk: 'creator_id', pk: 'id' },
    sender: { table: 'users', fk: 'sender_id', pk: 'id' },
    receiver: { table: 'users', fk: 'receiver_id', pk: 'id' },
    user: { table: 'users', fk: 'user_id', pk: 'id' },
    complainant: { table: 'users', fk: 'complainant_id', pk: 'id' },
    targetUser: { table: 'users', fk: 'targetUser_id', pk: 'id' },
    reviewer: { table: 'users', fk: 'reviewer_id', pk: 'id' },
    recipient: { table: 'users', fk: 'recipient_id', pk: 'id' },
    publisher: { table: 'users', fk: 'publisher_id', pk: 'id' },
    handler: { table: 'users', fk: 'handler_id', pk: 'id' },
    operator: { table: 'admins', fk: 'operator_id', pk: 'id' },
    relatedCarpool: { table: 'carpools', fk: 'relatedCarpool_id', pk: 'id' },
    relatedPost: { table: 'module_posts', fk: 'relatedPost_id', pk: 'id' },
    targetCarpool: { table: 'carpools', fk: 'targetCarpool_id', pk: 'id' },
    carpool: { table: 'carpools', fk: 'carpool_id', pk: 'id' },
    relatedReview: { table: 'reviews', fk: 'relatedReview_id', pk: 'id' },
    targetReview: { table: 'reviews', fk: 'targetReview_id', pk: 'id' },
    targetMessage: { table: 'messages', fk: 'targetMessage_id', pk: 'id' },
    relatedUser: { table: 'users', fk: 'relatedUser_id', pk: 'id' },
  };

  async function applyPopulate(objects, pop, pool) {
    const config = populateConfig[pop.path];
    if (!config) return objects;
    // rowToObject 已将 FK 列名重命名为 mongoField 名（如 complainant_id → complainant）
    // 所以需同时检查 config.fk（原始列名）和 pop.path（重命名后的属性名）
    const ids = [...new Set(objects.flatMap(o => {
      const v1 = o[config.fk];
      const v2 = o[pop.path];
      const candidates = [];
      // 只取原始 ID 值（数字/字符串），不取已 populate 过的对象
      if (v1 !== undefined && v1 !== null && typeof v1 !== 'object') candidates.push(v1);
      if (v2 !== undefined && v2 !== null && typeof v2 !== 'object') candidates.push(v2);
      return candidates;
    }))];
    if (ids.length === 0) return objects;
    const [refRows] = await pool.query(
      'SELECT * FROM `' + config.table + '` WHERE `' + config.pk + '` IN (' + ids.map(() => '?').join(',') + ')',
      ids
    );
    const refMap = {};
    for (const row of refRows) {
      const obj = rowToObject(row);
      refMap[obj[config.pk]] = obj;
    }
    for (const obj of objects) {
      if (obj[config.fk] && refMap[obj[config.fk]]) {
        obj[pop.path] = refMap[obj[config.fk]];
      }
    }
    return objects;
  }

  function find(conditions = {}) {
    const qb = new QueryBuilder(fieldMap);
    qb._conditions = { ...conditions };
    return qb;
  }

  function findOne(conditions) {
    const qb = new QueryBuilder(fieldMap);
    qb._conditions = { ...conditions };
    qb._limitVal = 1;
    return qb.exec().then(rows => rows[0] || null);
  }

  async function findById(id) {
    if (id === null || id === undefined) return null;
    const pool = getPool();
    const [rows] = await pool.query('SELECT * FROM `' + tableName + '` WHERE `' + pk + '` = ? LIMIT 1', [id]);
    return rows.length > 0 ? rowToObject(rows[0]) : null;
  }

  async function create(data) {
    const pool = getPool();
    const cols = [];
    const placeholders = [];
    const values = [];
    for (let [key, val] of Object.entries(data)) {
      const col = toMysqlCol(key);
      if (jsonFields.includes(key) && (Array.isArray(val) || (typeof val === 'object' && val !== null && !(val instanceof Date)))) {
        val = JSON.stringify(val);
      }
      cols.push('`' + col + '`');
      placeholders.push('?');
      values.push(val);
    }
    const sql = 'INSERT INTO `' + tableName + '` (' + cols.join(', ') + ') VALUES (' + placeholders.join(', ') + ')';
    const [result] = await pool.query(sql, values);
    const [rows] = await pool.query('SELECT * FROM `' + tableName + '` WHERE `' + pk + '` = ?', [result.insertId]);
    const obj = rows.length > 0 ? rowToObject(rows[0]) : null;
    if (obj) {
      obj.save = async function () {
        const updateData = { ...this };
        delete updateData[pk]; delete updateData._id; delete updateData.toObject;
        delete updateData.save; delete updateData.deleteOne;
        delete updateData.comparePassword; delete updateData.toSafeObject;
        delete updateData.hasPermission; delete updateData.addTimeline;
        const setVals = []; const setArr = [];
        for (const [k, v] of Object.entries(updateData)) {
          if (typeof v === 'function') continue;
          const c = toMysqlCol(k);
          setArr.push('`' + c + '` = ?');
          setVals.push(jsonFields.includes(k) && (Array.isArray(v) || (typeof v === 'object' && v !== null && !(v instanceof Date))) ? JSON.stringify(v) : v);
        }
        setVals.push(this[pk]);
        await pool.query('UPDATE `' + tableName + '` SET ' + setArr.join(', ') + ' WHERE `' + pk + '` = ?', setVals);
        return this;
      };
      obj.deleteOne = async function () {
        await pool.query('DELETE FROM `' + tableName + '` WHERE `' + pk + '` = ?', [this[pk]]);
      };
    }
    return obj;
  }

  async function findByIdAndUpdate(id, update, options = {}) {
    const pool = getPool();
    let setSql, setValues;
    if (update.$set !== undefined || update.$inc !== undefined || update.$addToSet !== undefined || update.$unset !== undefined) {
      const result = buildSet(update);
      setSql = result.sql; setValues = result.values;
    } else {
      const fields = []; const vals = [];
      for (const [key, val] of Object.entries(update)) {
        const col = toMysqlCol(key);
        fields.push('`' + col + '` = ?');
        vals.push(jsonFields.includes(key) && (Array.isArray(val) || (typeof val === 'object' && val !== null && !(val instanceof Date))) ? JSON.stringify(val) : val);
      }
      setSql = fields.join(', '); setValues = vals;
    }
    if (!setSql) return findById(id);
    await pool.query('UPDATE `' + tableName + '` SET ' + setSql + ' WHERE `' + pk + '` = ?', [...setValues, id]);
    return findById(id);
  }

  async function findByIdAndDelete(id) {
    const pool = getPool();
    const [rows] = await pool.query('SELECT * FROM `' + tableName + '` WHERE `' + pk + '` = ?', [id]);
    if (rows.length === 0) return null;
    const obj = rowToObject(rows[0]);
    await pool.query('DELETE FROM `' + tableName + '` WHERE `' + pk + '` = ?', [id]);
    return obj;
  }

  async function countDocuments(conditions = {}) {
    const pool = getPool();
    const where = buildWhere(conditions, '', fieldMap);
    const [rows] = await pool.query('SELECT COUNT(*) as count FROM `' + tableName + '` WHERE ' + where.sql, where.values);
    return rows[0].count;
  }

  async function updateMany(conditions, update) {
    const pool = getPool();
    const where = buildWhere(conditions, '', fieldMap);
    let setSql, setValues;
    if (update.$set !== undefined || update.$inc !== undefined || update.$addToSet !== undefined || update.$unset !== undefined) {
      const result = buildSet(update); setSql = result.sql; setValues = result.values;
    } else {
      const fields = []; const vals = [];
      for (const [key, val] of Object.entries(update)) {
        const col = toMysqlCol(key);
        fields.push('`' + col + '` = ?'); vals.push(val);
      }
      setSql = fields.join(', '); setValues = vals;
    }
    if (!setSql) return { modifiedCount: 0 };
    const sql = 'UPDATE `' + tableName + '` SET ' + setSql + ' WHERE ' + where.sql;
    const [result] = await pool.query(sql, [...setValues, ...where.values]);
    return { modifiedCount: result.affectedRows || 0 };
  }

  async function findOneAndUpdate(conditions, update, options = {}) {
    const pool = getPool();
    const where = buildWhere(conditions, '', fieldMap);
    let setSql, setValues;
    if (update.$set !== undefined || update.$inc !== undefined || update.$addToSet !== undefined || update.$unset !== undefined) {
      const result = buildSet(update); setSql = result.sql; setValues = result.values;
    } else {
      const fields = []; const vals = [];
      for (const [key, val] of Object.entries(update)) {
        const col = toMysqlCol(key);
        fields.push('`' + col + '` = ?'); vals.push(val);
      }
      setSql = fields.join(', '); setValues = vals;
    }
    if (!setSql) return null;
    await pool.query('UPDATE `' + tableName + '` SET ' + setSql + ' WHERE ' + where.sql + ' LIMIT 1', [...setValues, ...where.values]);
    const [rows] = await pool.query('SELECT * FROM `' + tableName + '` WHERE ' + where.sql + ' LIMIT 1', where.values);
    return rows.length > 0 ? rowToObject(rows[0]) : null;
  }

  async function findOneAndDelete(conditions) {
    const pool = getPool();
    const where = buildWhere(conditions, '', fieldMap);
    const [rows] = await pool.query('SELECT * FROM `' + tableName + '` WHERE ' + where.sql + ' LIMIT 1', where.values);
    if (rows.length === 0) return null;
    const obj = rowToObject(rows[0]);
    await pool.query('DELETE FROM `' + tableName + '` WHERE `' + pk + '` = ?', [obj[pk]]);
    return obj;
  }

  async function insertMany(docs) {
    if (!Array.isArray(docs) || docs.length === 0) return [];
    const pool = getPool();
    const cols = Object.keys(docs[0]);
    const colNames = cols.map(c => '`' + toMysqlCol(c) + '`').join(', ');
    const placeholders = docs.map(() => '(' + cols.map(() => '?').join(', ') + ')').join(', ');
    const values = [];
    for (const doc of docs) {
      for (const key of cols) {
        let val = doc[key];
        if (jsonFields.includes(key) && (Array.isArray(val) || (typeof val === 'object' && val !== null && !(val instanceof Date)))) {
          val = JSON.stringify(val);
        }
        values.push(val);
      }
    }
    await pool.query('INSERT INTO `' + tableName + '` (' + colNames + ') VALUES ' + placeholders, values);
    return docs;
  }

  return {
    tableName, pk, fieldMap,
    find, findOne, findById, create,
    findByIdAndUpdate, findByIdAndDelete,
    findOneAndUpdate, findOneAndDelete,
    countDocuments, updateMany, insertMany,
    buildWhere, buildSet, toMysqlCol, rowToObject,
    getPool, schemaHints,
  };
}

module.exports = { createModel, buildWhere, buildSort, getPool };
