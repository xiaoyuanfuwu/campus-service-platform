const { createModel } = require('./mysql');

const fieldMap = {
  'from': 'from_place',
  'to': 'to_place',
};

const baseModel = createModel('hot_routes', {
  primaryKey: 'id',
  jsonFields: [],
  booleanFields: [],
}, fieldMap);

module.exports = baseModel;
