const { createModel } = require('./mysql');
const { getPool } = require('../config/db');

const tableName = 'messages';

const fieldMap = {
  'sender': 'sender_id',
  'receiver': 'receiver_id',
  'relatedCarpool': 'relatedCarpool_id',
  'conversationId': 'conversation_id',
  'carpoolId': 'relatedCarpool_id',
};

const schemaHints = {
  primaryKey: 'id',
  jsonFields: [],
  booleanFields: ['isRead', 'isRecalled'],
};

const baseModel = createModel(tableName, schemaHints, fieldMap);

// Override create to map fields
const origCreate = baseModel.create;
baseModel.create = async function(data) {
  if (data.sender !== undefined) { data.sender_id = data.sender; delete data.sender; }
  if (data.receiver !== undefined) { data.receiver_id = data.receiver; delete data.receiver; }
  if (data.relatedCarpool !== undefined) { data.relatedCarpool_id = data.relatedCarpool; delete data.relatedCarpool; }
  if (data.conversationId !== undefined) { data.conversation_id = data.conversationId; delete data.conversationId; }
  // carpoolId 在 messages 表中没有独立列，映射到 relatedCarpool_id
  if (data.carpoolId !== undefined) {
    data.relatedCarpool_id = data.carpoolId;
    delete data.carpoolId;
  }
  return origCreate(data);
};

// Override find to support populate('sender') chainable
const origFind = baseModel.find;
baseModel.find = function(query) {
  const qb = origFind(query);
  const origExec = qb.exec.bind(qb);
  const origThen = qb.then.bind(qb);

  let _populateFields = [];
  let _isExec = false;

  // chainable populate
  const chainablePopulate = {
    populate(path, select) {
      _populateFields.push({ path, select });
      return this;
    },
    select(s) { return this; },
    lean() { return this; },
    sort(s) { qb.sort(s); return this; },
    skip(n) { qb.skip(n); return this; },
    limit(n) { qb.limit(n); return this; },
    countDocuments(q) { return qb.countDocuments ? qb.countDocuments(q) : origExec().then(rows => rows.length); },
  };

  // Override exec to add populate
  qb.exec = async function() {
    const rows = await origExec();
    if (!rows || rows.length === 0) return rows;

    // populate sender
    const hasSenderPopulate = _populateFields.some(f => f.path === 'sender');
    if (hasSenderPopulate) {
      const senderIds = [...new Set(rows.map(r => r.sender_id || r.sender).filter(Boolean))];
      if (senderIds.length > 0) {
        const [users] = await getPool().query(
          'SELECT id, nickName, avatarUrl, creditScore, gender, school, user_id_code FROM users WHERE id IN (?)',
          [senderIds]
        );
        const userMap = {};
        users.forEach(u => { userMap[u.id] = u; });
        rows.forEach(row => {
          const sid = row.sender_id || row.sender;
          if (sid && userMap[sid]) {
            const u = userMap[sid];
            row.sender = {
              _id: u.id, id: u.id,
              nickName: u.nickName,
              avatarUrl: u.avatarUrl || '',
              creditScore: u.creditScore,
              gender: u.gender,
              school: u.school || '',
              userCode: u.user_id_code || '',
              toString: function() { return String(this._id); }
            };
          }
        });
      }
    }

    return rows;
  };

  // Make it thenable with populate support
  const origThenFn = qb.then;
  qb.then = function(resolve, reject) {
    return origThenFn(resolve, reject);
  };

  // Attach populate to qb
  qb.populate = chainablePopulate.populate;
  qb.lean = chainablePopulate.lean;
  qb.select = chainablePopulate.select;

  return qb;
};

// Override findById to support populate chainable
const origFindById = baseModel.findById;
baseModel.findById = function(id) {
  const pendingPromise = origFindById(id);
  const chainable = {
    _populateFields: [],
    populate(path, select) { this._populateFields.push({ path, select }); return this; },
    select(s) { return this; },
    lean() { return this; },
    then(resolve, reject) { return pendingPromise.then(resolve, reject); },
    catch(reject) { return pendingPromise.catch(reject); },
  };

  const rebuiltPromise = pendingPromise.then(async message => {
    if (!message) return null;

    const hasSenderPopulate = chainable._populateFields.some(f => f.path === 'sender');
    if (hasSenderPopulate) {
      const sid = message.sender_id || message.sender;
      if (sid) {
        const [users] = await getPool().query(
          'SELECT id, nickName, avatarUrl, creditScore, gender, school, user_id_code FROM users WHERE id = ?',
          [sid]
        );
        if (users.length > 0) {
          const u = users[0];
          message.sender = {
            _id: u.id, id: u.id,
            nickName: u.nickName,
            avatarUrl: u.avatarUrl || '',
            creditScore: u.creditScore,
            gender: u.gender,
            school: u.school || '',
            userCode: u.user_id_code || '',
            toString: function() { return String(this._id); }
          };
        }
      }
    }

    return message;
  });

  chainable.then = (resolve, reject) => rebuiltPromise.then(resolve, reject);
  chainable.catch = (reject) => rebuiltPromise.catch(reject);

  return chainable;
};

module.exports = baseModel;
