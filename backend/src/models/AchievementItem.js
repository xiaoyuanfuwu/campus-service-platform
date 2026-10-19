const { createModel, getPool } = require('./mysql');

const baseModel = createModel('achievement_items', {
  primaryKey: 'id',
  jsonFields: [],
  booleanFields: ['isActive'],
}, null);

module.exports = baseModel;
