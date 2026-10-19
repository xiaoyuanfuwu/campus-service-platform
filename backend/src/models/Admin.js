const { createModel } = require('./mysql');
const bcrypt = require('bcryptjs');

const tableName = 'admins';

const schemaHints = {
  primaryKey: 'id',
  jsonFields: ['permissions'],
  booleanFields: [],
};

const baseModel = createModel(tableName, schemaHints, null);

const origCreate = baseModel.create;
baseModel.create = async function(data) {
  if (data.password) {
    data.password = await bcrypt.hash(data.password, 14);
  }
  if (data.permissions && Array.isArray(data.permissions)) {
    data.permissions = JSON.stringify(data.permissions);
  }
  return origCreate(data).then(admin => attachAdminMethods(admin));
};

const origFindOne = baseModel.findOne;
baseModel.findOne = async function(conditions) {
  const admin = await origFindOne(conditions);
  return attachAdminMethods(admin);
};

const origFindById = baseModel.findById;
baseModel.findById = async function(id) {
  const admin = await origFindById(id);
  return attachAdminMethods(admin);
};

function attachAdminMethods(admin) {
  if (!admin) return null;

  admin.comparePassword = async function(candidatePassword) {
    if (!this.password) {
      const pool = require('../config/db')();
      const [rows] = await pool.query('SELECT password FROM admins WHERE id = ?', [this.id]);
      if (rows.length > 0) this.password = rows[0].password;
    }
    return bcrypt.compare(candidatePassword, this.password);
  };

  admin.hasPermission = function(permission) {
    if (this.role === 'super_admin') return true;
    const perms = Array.isArray(this.permissions) ? this.permissions : (typeof this.permissions === 'string' ? JSON.parse(this.permissions || '[]') : []);
    if (perms.includes('*')) return true;
    return perms.includes(permission);
  };

  admin.toSafeObject = function() {
    const obj = { ...this };
    delete obj.password;
    return obj;
  };

  admin.save = async function() {
    const pool = require('../config/db')();
    const fields = [];
    const values = [];
    const skipKeys = ['comparePassword', 'hasPermission', 'toSafeObject', 'toObject', 'save', 'deleteOne', '_id'];
    for (const [key, val] of Object.entries(this)) {
      if (skipKeys.includes(key)) continue;
      if (typeof val === 'function') continue;
      if (key === 'permissions' && Array.isArray(val)) {
        fields.push(`\`${key}\` = ?`);
        values.push(JSON.stringify(val));
      } else {
        fields.push(`\`${key}\` = ?`);
        values.push(val);
      }
    }
    values.push(this.id);
    await pool.query(`UPDATE \`${tableName}\` SET ${fields.join(', ')} WHERE id = ?`, values);
    return this;
  };

  admin.deleteOne = async function() {
    const pool = require('../config/db')();
    await pool.query('DELETE FROM admins WHERE id = ?', [this.id]);
  };

  return admin;
}

module.exports = baseModel;
