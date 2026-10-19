const { createModel, getPool } = require('./mysql');
const baseModel = createModel('stall_reviews', {
  primaryKey: 'id',
  jsonFields: [],
  booleanFields: [],
}, null);
module.exports = baseModel;
