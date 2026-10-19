const { createModel, getPool } = require('./mysql');

const baseModel = createModel('guide_items', {
  primaryKey: 'id',
  jsonFields: ['images'],
  booleanFields: ['isActive'],
}, null);

module.exports = baseModel;
