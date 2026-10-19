const { createModel } = require('./mysql');

const tableName = 'contact_messages';

const fieldMap = {
  'user': 'user_id',
  'userSnapshot.nickName': 'user_nickName',
  'userSnapshot.avatarUrl': 'user_avatarUrl',
};

const schemaHints = {
  primaryKey: 'id',
  jsonFields: [],
  booleanFields: ['is_read'],
};

const baseModel = createModel(tableName, schemaHints, fieldMap);

const origCreate = baseModel.create;
baseModel.create = async function(data) {
  if (data.user !== undefined) { data.user_id = data.user; delete data.user; }
  if (data.userSnapshot) {
    data.user_nickName = data.userSnapshot.nickName || '';
    data.user_avatarUrl = data.userSnapshot.avatarUrl || '';
    delete data.userSnapshot;
  }
  return origCreate(data);
};

module.exports = baseModel;
