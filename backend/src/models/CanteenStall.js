const { createModel, getPool } = require('./mysql');
const baseModel = createModel('canteen_stalls', {
  primaryKey: 'id',
  jsonFields: [],
  booleanFields: ['isFeatured', 'isActive'],
}, null);
module.exports = baseModel;
