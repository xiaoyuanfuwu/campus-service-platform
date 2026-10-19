const { createModel, getPool } = require('./mysql');

const tableName = 'announcements';

const fieldMap = {
  'publisher': 'publisher_id',
  'publisherSnapshot.nickName': 'publisher_nickName',
  'publisherSnapshot.avatarUrl': 'publisher_avatarUrl',
  'relatedCarpool': 'relatedCarpool_id',
};

const schemaHints = {
  primaryKey: 'id',
  jsonFields: ['images', 'tags', 'targetSchools', 'targetRoles'],
  booleanFields: ['isTop', 'isPopup', 'isImportant'],
};

const baseModel = createModel(tableName, schemaHints, fieldMap);

const origCreate = baseModel.create;
baseModel.create = async function(data) {
  if (data.publisher !== undefined) { data.publisher_id = data.publisher; delete data.publisher; }
  if (data.publisherSnapshot) {
    data.publisher_nickName = data.publisherSnapshot.nickName || '系统管理员';
    data.publisher_avatarUrl = data.publisherSnapshot.avatarUrl || '';
    delete data.publisherSnapshot;
  }
  if (data.relatedCarpool !== undefined) { data.relatedCarpool_id = data.relatedCarpool; delete data.relatedCarpool; }
  // targetUsers is stored as JSON in targetUsers, but mongoose had it as ref array
  // In MySQL there's no targetUsers column - the visibility filter uses it differently
  // For now just ignore/remove as the schema doesn't have it
  delete data.targetUsers;
  return origCreate(data);
};

// Static: archiveExpired
baseModel.archiveExpired = async function() {
  const pool = getPool();
  const [result] = await pool.query(
    "UPDATE announcements SET status = 'archived' WHERE status = 'published' AND expireTime IS NOT NULL AND expireTime < NOW()"
  );
  return result.affectedRows || 0;
};

module.exports = baseModel;
