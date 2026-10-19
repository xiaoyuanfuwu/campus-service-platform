const { createModel } = require('./mysql');

const fieldMap = {
  'date': 'statDate',
};

const baseModel = createModel('daily_stats', {
  primaryKey: 'id',
  jsonFields: [],
  booleanFields: [],}, fieldMap);

module.exports = baseModel;
