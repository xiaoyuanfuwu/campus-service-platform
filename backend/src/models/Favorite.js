const { createModel } = require('./mysql');

const tableName = 'favorites';

const fieldMap = {
  'user': 'user_id',
  'carpool': 'carpool_id',
};

const baseModel = createModel(tableName, { primaryKey: 'id', jsonFields: [], booleanFields: [] }, fieldMap);

const origCreate = baseModel.create;
baseModel.create = async function(data) {
  if (data.user !== undefined) { data.user_id = data.user; delete data.user; }
  if (data.carpool !== undefined) { data.carpool_id = data.carpool; delete data.carpool; }
  return origCreate(data);
};

module.exports = baseModel;
