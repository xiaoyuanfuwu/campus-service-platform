const { createModel, getPool } = require('./mysql');

const baseModel = createModel('user_achievements', {
  primaryKey: 'id',
  jsonFields: [],
  booleanFields: [],
}, null);

module.exports = baseModel;
