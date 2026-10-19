const { createModel, getPool } = require('./mysql');

const tableName = 'reviews';

const fieldMap = {
  'reviewer': 'reviewer_id',
  'reviewerSnapshot.nickName': 'reviewer_nickName',
  'reviewerSnapshot.avatarUrl': 'reviewer_avatarUrl',
  'targetUser': 'targetUser_id',
  'carpool': 'carpool_id',
};

const schemaHints = {
  primaryKey: 'id',
  jsonFields: ['tags'],
  booleanFields: ['isAnonymous', 'isReported'],
};

const baseModel = createModel(tableName, schemaHints, fieldMap);

const origCreate = baseModel.create;
baseModel.create = async function(data) {
  if (data.reviewer !== undefined) { data.reviewer_id = data.reviewer; delete data.reviewer; }
  if (data.reviewerSnapshot) {
    data.reviewer_nickName = data.reviewerSnapshot.nickName || '';
    data.reviewer_avatarUrl = data.reviewerSnapshot.avatarUrl || '';
    delete data.reviewerSnapshot;
  }
  if (data.targetUser !== undefined) { data.targetUser_id = data.targetUser; delete data.targetUser; }
  if (data.carpool !== undefined) { data.carpool_id = data.carpool; delete data.carpool; }
  return origCreate(data);
};

// Static method: updateUserStats
baseModel.updateUserStats = async function(targetUserId) {
  const pool = getPool();
  // Calculate stats
  const [[{ total, avgRating, positive }]] = await pool.query(
    'SELECT COUNT(*) as total, AVG(rating) as avgRating, SUM(CASE WHEN rating >= 4 THEN 1 ELSE 0 END) as positive FROM reviews WHERE targetUser_id = ?',
    [targetUserId]
  );

  if (total === 0) return;

  const goodRate = Math.round((positive / total) * 100);
  const creditScore = Math.min(110, Math.max(0, Math.round(
    100 + (avgRating - 3) * 10 + positive * 3 - (total - positive) * 5
  )));

  await pool.query(
    'UPDATE users SET totalReviews = ?, positiveReviews = ?, goodRate = ?, creditScore = ? WHERE id = ?',
    [total, positive, goodRate, creditScore, targetUserId]
  );
};

module.exports = baseModel;
