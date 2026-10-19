const { createModel, getPool } = require('./mysql');

const baseModel = createModel('questionbanks', {
  primaryKey: 'id',
  jsonFields: [],
  booleanFields: [],
}, null);

module.exports = baseModel;
