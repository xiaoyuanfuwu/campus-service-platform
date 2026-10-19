const { createModel } = require('./mysql');

const tableName = 'notifications';

const fieldMap = {
  'recipient': 'recipient_id',
  'sender': 'sender_id',
  'senderSnapshot.nickName': 'sender_nickName',
  'senderSnapshot.avatarUrl': 'sender_avatarUrl',
  'relatedCarpool': 'relatedCarpool_id',
  'relatedUser': 'relatedUser_id',
  'relatedReview': 'relatedReview_id',
};

const schemaHints = {
  primaryKey: 'id',
  jsonFields: ['extraData'],
  booleanFields: ['isRead', 'isDeleted'],
};

const baseModel = createModel(tableName, schemaHints, fieldMap);

const origCreate = baseModel.create;
baseModel.create = async function(data) {
  if (data.recipient !== undefined) { data.recipient_id = data.recipient; delete data.recipient; }
  if (data.sender !== undefined) { data.sender_id = data.sender; delete data.sender; }
  if (data.senderSnapshot) {
    data.sender_nickName = data.senderSnapshot.nickName || '';
    data.sender_avatarUrl = data.senderSnapshot.avatarUrl || '';
    delete data.senderSnapshot;
  }
  if (data.relatedCarpool !== undefined) { data.relatedCarpool_id = data.relatedCarpool; delete data.relatedCarpool; }
  if (data.relatedUser !== undefined) { data.relatedUser_id = data.relatedUser; delete data.relatedUser; }
  if (data.relatedReview !== undefined) { data.relatedReview_id = data.relatedReview; delete data.relatedReview; }
  if (data.extraData && typeof data.extraData === 'object') {
    data.extraData = JSON.stringify(data.extraData);
  }
  return origCreate(data);
};

module.exports = baseModel;
