const { createModel, getPool } = require('./mysql');

const baseModel = createModel('yellowpages', {
  primaryKey: 'id',
  jsonFields: [],
  booleanFields: [],
}, null);

module.exports = baseModel;
