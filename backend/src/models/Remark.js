const { createModel } = require('./mysql');

const tableName = 'user_remarks';

const fieldMap = {
  'user': 'user_id',
};

const baseModel = createModel(tableName, { primaryKey: 'id', jsonFields: [], booleanFields: [] }, fieldMap);

const origCreate = baseModel.create;
baseModel.create = async function(data) {
  if (data.user !== undefined) { data.user_id = data.user; delete data.user; }
  return origCreate(data);
};

module.exports = baseModel;
