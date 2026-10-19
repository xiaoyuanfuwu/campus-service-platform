const { createModel, getPool } = require('./mysql');

const baseModel = createModel('guide_feed', {
  primaryKey: 'id',
  jsonFields: ['images'],
  // booleanFields removed: column is 'is_active', handled in controller
}, null);

module.exports = baseModel;
