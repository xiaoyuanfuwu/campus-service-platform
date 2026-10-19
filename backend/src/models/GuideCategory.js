const { createModel, getPool } = require('./mysql');

const baseModel = createModel('guide_categories', {
  primaryKey: 'id',
  jsonFields: [],
  booleanFields: ['isActive'],
}, null);

module.exports = baseModel;
