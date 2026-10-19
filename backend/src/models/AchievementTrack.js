const { createModel, getPool } = require('./mysql');

const baseModel = createModel('achievement_tracks', {
  primaryKey: 'id',
  jsonFields: [],
  booleanFields: ['isActive'],
}, null);

module.exports = baseModel;
