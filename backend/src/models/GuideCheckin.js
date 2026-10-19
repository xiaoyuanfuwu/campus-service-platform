const { createModel } = require('./mysql');

// 打卡图鉴收集记录 model
const baseModel = createModel('guide_checkins', {
  primaryKey: 'id',
  jsonFields: ['images'],
  booleanFields: ['isActive'],
}, null);

module.exports = baseModel;
