const { createModel, getPool } = require('./mysql');

const tableName = 'map_pois';

const schemaHints = {
  primaryKey: 'id',
  jsonFields: [],
  booleanFields: ['is_visible'],
};

const baseModel = createModel(tableName, schemaHints, {});

module.exports = baseModel;
