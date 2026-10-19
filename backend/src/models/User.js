const { createModel } = require('./mysql');
const bcrypt = require('bcryptjs');

const tableName = 'users';

// Mongoose field → MySQL column mapping
const fieldMap = {
  // preferences nested → flat
  'preferences.smoke': 'smoke_pref',
  'preferences.music': 'music_pref',
  'preferences.chat': 'chat_pref',
  'preferences.quiet': 'quiet_pref',
  'preferences.pet': 'pet_pref',
  'preferences.luggage': 'luggage_pref',
  // deviceInfo → flat
  'deviceInfo.platform': 'platform',
  'deviceInfo.brand': 'device_brand',
  'deviceInfo.model': 'device_model',
  'deviceInfo.version': 'device_version',
  // wechatInfo → flat
  'wechatInfo.unionid': 'unionid',
  'wechatInfo.sessionKey': 'sessionKey',
};

const schemaHints = {
  primaryKey: 'id',
  jsonFields: ['tags'],
  booleanFields: ['isVerified', 'isOnline'],
};

const baseModel = createModel(tableName, schemaHints, null);

// ========== Custom User methods ==========

// 生成6位不重复数字ID（100000-0000000）
async function generateUserIdCode() {
  const pool = require('../config/db')();
  for (let i = 0; i < 20; i++) {
    const code = String(Math.floor(100000 + Math.random() * 900000));
    const [rows] = await pool.query('SELECT id FROM users WHERE user_id_code = ?', [code]);
    if (rows.length === 0) return code;
  }
  // fallback：基于时间戳生成
  return String(100000 + (Date.now() % 900000));
}

// Override create to handle preferences/deviceInfo/wechatInfo nesting
const origCreate = baseModel.create;
baseModel.create = async function(data) {
  // Flatten nested objects
  if (data.preferences) {
    data.smoke_pref = data.preferences.smoke !== undefined ? (data.preferences.smoke ? 1 : 0) : undefined;
    data.music_pref = data.preferences.music !== undefined ? (data.preferences.music ? 1 : 0) : undefined;
    data.chat_pref = data.preferences.chat !== undefined ? (data.preferences.chat ? 1 : 0) : undefined;
    data.quiet_pref = data.preferences.quiet !== undefined ? (data.preferences.quiet ? 1 : 0) : undefined;
    data.pet_pref = data.preferences.pet !== undefined ? (data.preferences.pet ? 1 : 0) : undefined;
    data.luggage_pref = data.preferences.luggage !== undefined ? (data.preferences.luggage ? 1 : 0) : undefined;
    delete data.preferences;
  }
  if (data.deviceInfo) {
    data.platform = data.deviceInfo.platform || '';
    data.device_brand = data.deviceInfo.brand || '';
    data.device_model = data.deviceInfo.model || '';
    data.device_version = data.deviceInfo.version || '';
    delete data.deviceInfo;
  }
  if (data.wechatInfo) {
    data.unionid = data.wechatInfo.unionid || '';
    data.sessionKey = data.wechatInfo.sessionKey || '';
    delete data.wechatInfo;
  }

  // bcrypt password
  if (data.password) {
    data.password = await bcrypt.hash(data.password, 12);
  }

  // 自动生成6位数字ID
  if (!data.user_id_code) {
    data.user_id_code = await generateUserIdCode();
  }

  const user = await origCreate(data);
  return attachUserMethods(user);
};

// Override findOne to handle select('+password')
const origFindOne = baseModel.findOne;
baseModel.findOne = async function(conditions) {
  const user = await origFindOne(conditions);
  if (!user) return null;
  return attachUserMethods(user);
};

// Override findById to handle select('+password')
const origFindById = baseModel.findById;
baseModel.findById = async function(id) {
  const user = await origFindById(id);
  if (!user) return null;
  return attachUserMethods(user);
};

// Override find
const origFind = baseModel.find;
baseModel.find = function(conditions) {
  const qb = origFind(conditions);
  const origExec = qb.exec.bind(qb);
  qb.exec = async function() {
    const users = await origExec();
    return users.map(u => attachUserMethods(u));
  };
  // Support .select('+password') - need to fetch password separately
  const origSelect = qb.select.bind(qb);
  qb.select = function(sel) {
    if (sel && typeof sel === 'string') {
      qb._selectStr = sel;
      // If +password is requested, we need actual password field
      // We'll handle this at response time
    }
    return qb;
  };
  return qb;
};

// Attach Mongoose-like instance methods
function attachUserMethods(user) {
  if (!user) return null;

  user.toSafeObject = function() {
    const obj = { ...this };
    delete obj.password;
    delete obj.unionid;
    delete obj.sessionKey;
    // 映射 user_id_code → userCode 供前端使用
    if (obj.user_id_code !== undefined) {
      obj.userCode = obj.user_id_code;
    }
    return obj;
  };

  user.comparePassword = async function(candidatePassword) {
    if (!this.password) {
      // Need to fetch password from DB
      const pool = require('../config/db')();
      const [rows] = await pool.query('SELECT password FROM users WHERE id = ?', [this.id]);
      if (rows.length > 0) {
        this.password = rows[0].password;
      }
    }
    return bcrypt.compare(candidatePassword, this.password);
  };

  // Reconstitute nested objects from flat columns
  if (user.smoke_pref !== undefined) {
    user.preferences = {
      smoke: !!user.smoke_pref,
      music: !!user.music_pref,
      chat: !!user.chat_pref,
      quiet: !!user.quiet_pref,
      pet: !!user.pet_pref,
      luggage: !!user.luggage_pref,
    };
  }

  if (user.platform !== undefined && user.deviceInfo === undefined) {
    user.deviceInfo = {
      platform: user.platform || '',
      brand: user.device_brand || '',
      model: user.device_model || '',
      version: user.device_version || '',
    };
  }

  user.wechatInfo = {
    unionid: user.unionid || '',
    sessionKey: user.sessionKey || '',
  };

  // Add .save() method
  user.save = async function() {
    const pool = require('../config/db')();
    const fields = [];
    const values = [];

    // Flatten nested objects before saving
    const saveData = { ...this };

    if (saveData.preferences && typeof saveData.preferences === 'object') {
      saveData.smoke_pref = saveData.preferences.smoke ? 1 : 0;
      saveData.music_pref = saveData.preferences.music ? 1 : 0;
      saveData.chat_pref = saveData.preferences.chat ? 1 : 0;
      saveData.quiet_pref = saveData.preferences.quiet ? 1 : 0;
      saveData.pet_pref = saveData.preferences.pet ? 1 : 0;
      saveData.luggage_pref = saveData.preferences.luggage ? 1 : 0;
      delete saveData.preferences;
    }
    if (saveData.deviceInfo && typeof saveData.deviceInfo === 'object') {
      saveData.platform = saveData.deviceInfo.platform || '';
      saveData.device_brand = saveData.deviceInfo.brand || '';
      saveData.device_model = saveData.deviceInfo.model || '';
      saveData.device_version = saveData.deviceInfo.version || '';
      delete saveData.deviceInfo;
    }

    // Skip methods and internal props
    const skipKeys = ['toSafeObject', 'comparePassword', 'save', 'deleteOne',
                       'toObject', '_id', 'wechatInfo', 'preferences', 'deviceInfo',
                       'favoriteCarpools'];
    for (const [key, val] of Object.entries(saveData)) {
      if (skipKeys.includes(key)) continue;
      if (typeof val === 'function') continue;
      const col = key;
      fields.push(`\`${col}\` = ?`);
      values.push(val === true ? 1 : val === false ? 0 : (Array.isArray(val) ? JSON.stringify(val) : val));
    }
    values.push(this.id);
    await pool.query(`UPDATE \`${tableName}\` SET ${fields.join(', ')} WHERE id = ?`, values);

    // Update local object
    return this;
  };

  user.deleteOne = async function() {
    const pool = require('../config/db')();
    await pool.query('DELETE FROM users WHERE id = ?', [this.id]);
  };

  // For password fetch on login
  user.select = function(fieldStr) {
    // select('+password') - handled by caller
    return this;
  };

  return user;
}

// Special: handle select('+password')
// In Mongoose, .select('+password') means include the password field
// We need a way to pass this through findOne
baseModel._origFindOne = baseModel.findOne;
baseModel._origFindById = baseModel.findById;

// Override findByIdAndUpdate to attach methods
const origFindByIdAndUpdate = baseModel.findByIdAndUpdate;
baseModel.findByIdAndUpdate = async function(id, update, options) {
  const user = await origFindByIdAndUpdate(id, update, options);
  if (user) return attachUserMethods(user);
  return null;
};

// Override findOneAndUpdate to attach methods
const origFindOneAndUpdate = baseModel.findOneAndUpdate;
baseModel.findOneAndUpdate = async function(conditions, update, options) {
  const user = await origFindOneAndUpdate(conditions, update, options);
  if (user) return attachUserMethods(user);
  return null;
};

module.exports = baseModel;

// 导出生成器供 authController 使用
baseModel.generateUserIdCode = generateUserIdCode;