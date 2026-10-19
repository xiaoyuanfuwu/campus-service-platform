const { createModel } = require('./mysql');

const baseModel = createModel('ip_records', {
  primaryKey: 'id',
  jsonFields: [],
  booleanFields: ['isBlocked'],
}, null);

// Note: ip_records doesn't have 'users' column in MySQL (unlike Mongoose which has ref array)
// The ipGuard service uses $addToSet { users: userId } which needs adaptation

module.exports = baseModel;
