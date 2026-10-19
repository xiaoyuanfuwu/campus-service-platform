const { createModel } = require('./mysql');

const fieldMap = {
  'operator': 'operator_id',
};

const baseModel = createModel('operation_logs', {
  primaryKey: 'id',
  jsonFields: ['detail'],
  booleanFields: [],
}, fieldMap);

const origCreate = baseModel.create;
baseModel.create = async function(data) {
  if (data.operator !== undefined) { data.operator_id = data.operator; delete data.operator; }
  return origCreate(data);
};

module.exports = baseModel;
