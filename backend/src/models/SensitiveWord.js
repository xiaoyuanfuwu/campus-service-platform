const { createModel, getPool } = require('./mysql');

const baseModel = createModel('sensitive_words', {
  primaryKey: 'id',
  jsonFields: [],
  booleanFields: ['enabled'],
}, null);

// Override findOneAndUpdate for upsert
const origFindOneAndUpdate = baseModel.findOneAndUpdate;
if (origFindOneAndUpdate) {
  const origFn = baseModel.findOneAndUpdate;
  baseModel.findOneAndUpdate = async function(conditions, update, options = {}) {
    // Simple case: use ON DUPLICATE KEY UPDATE
    // For sensitive words, word is unique
    return origFn(conditions, update, options);
  };
}

module.exports = baseModel;
