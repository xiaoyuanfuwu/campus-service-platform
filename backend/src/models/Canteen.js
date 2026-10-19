const { createModel, getPool } = require('./mysql');
const baseModel = createModel('canteens', {
  primaryKey: 'id',
  jsonFields: [],
  booleanFields: ['isActive'],
}, null);
module.exports = baseModel;
