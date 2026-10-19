const { createModel } = require('./mysql');

const tableName = 'feedbacks';

const fieldMap = {
  'user': 'user_id',
  'userSnapshot.nickName': 'user_nickName',
  'userSnapshot.avatarUrl': 'user_avatarUrl',
  'userSnapshot.phone': 'user_phone',
  'relatedCarpool': 'relatedCarpool_id',
  'relatedUser': 'relatedUser_id',
  'deviceInfo.platform': 'platform',
  'deviceInfo.system': 'device_system',
  'deviceInfo.brand': 'device_brand',
  'deviceInfo.model': 'device_model',
  'deviceInfo.version': 'device_version',
  'deviceInfo.networkType': 'networkType',
  'handler': 'handler_id',
};

const schemaHints = {
  primaryKey: 'id',
  jsonFields: ['images', 'extraData'],
  booleanFields: [],
};

const baseModel = createModel(tableName, schemaHints, fieldMap);

const origCreate = baseModel.create;
baseModel.create = async function(data) {
  if (data.user !== undefined) { data.user_id = data.user; delete data.user; }
  if (data.userSnapshot) {
    data.user_nickName = data.userSnapshot.nickName || '';
    data.user_avatarUrl = data.userSnapshot.avatarUrl || '';
    data.user_phone = data.userSnapshot.phone || '';
    delete data.userSnapshot;
  }
  if (data.relatedCarpool !== undefined) { data.relatedCarpool_id = data.relatedCarpool; delete data.relatedCarpool; }
  if (data.relatedUser !== undefined) { data.relatedUser_id = data.relatedUser; delete data.relatedUser; }
  if (data.deviceInfo) {
    data.platform = data.deviceInfo.platform || '';
    data.device_system = data.deviceInfo.system || '';
    data.device_brand = data.deviceInfo.brand || '';
    data.device_model = data.deviceInfo.model || '';
    data.device_version = data.deviceInfo.version || '';
    data.networkType = data.deviceInfo.networkType || '';
    delete data.deviceInfo;
  }
  if (data.handler !== undefined) { data.handler_id = data.handler; delete data.handler; }
  return origCreate(data);
};

module.exports = baseModel;
