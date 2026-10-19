const { createModel, getPool } = require('./mysql');

const tableName = 'complaints';

const fieldMap = {
  'complainant': 'complainant_id',
  'complainantSnapshot.nickName': 'complainant_nickName',
  'complainantSnapshot.avatarUrl': 'complainant_avatarUrl',
  'complainantSnapshot.phone': 'complainant_phone',
  'complainantSnapshot.creditScore': 'complainant_creditScore',
  'targetUser': 'targetUser_id',
  'targetUserSnapshot.nickName': 'targetUser_nickName',
  'targetUserSnapshot.avatarUrl': 'targetUser_avatarUrl',
  'targetUserSnapshot.phone': 'targetUser_phone',
  'targetCarpool': 'targetCarpool_id',
  'targetReview': 'targetReview_id',
  'targetMessage': 'targetMessage_id',
  'handler': 'handler_id',
  'penalty.type': 'penalty_type',
  'penalty.creditDeduct': 'penalty_creditDeduct',
  'penalty.banDuration': 'penalty_banDuration',
  'penalty.banStartAt': 'penalty_banStartAt',
  'penalty.banEndAt': 'penalty_banEndAt',
  'penalty.reason': 'penalty_reason',
  'appeal.content': 'appeal_content',
  'appeal.evidence': 'appeal_evidence',
  'appeal.submittedAt': 'appeal_submittedAt',
  'appeal.reviewedAt': 'appeal_reviewedAt',
  'appeal.result': 'appeal_result',
  'appeal.resultNote': 'appeal_resultNote',
};

const schemaHints = {
  primaryKey: 'id',
  jsonFields: ['evidence', 'appeal_evidence'],
  booleanFields: ['isAnonymous'],
};

const baseModel = createModel(tableName, schemaHints, fieldMap);

const origCreate = baseModel.create;
baseModel.create = async function(data) {
  // Flatten nested objects
  if (data.complainant !== undefined) { data.complainant_id = data.complainant; delete data.complainant; }
  if (data.complainantSnapshot) {
    data.complainant_nickName = data.complainantSnapshot.nickName || '';
    data.complainant_avatarUrl = data.complainantSnapshot.avatarUrl || '';
    data.complainant_phone = data.complainantSnapshot.phone || '';
    data.complainant_creditScore = data.complainantSnapshot.creditScore || 100;
    delete data.complainantSnapshot;
  }
  if (data.targetUser !== undefined) { data.targetUser_id = data.targetUser; delete data.targetUser; }
  if (data.targetUserSnapshot) {
    data.targetUser_nickName = data.targetUserSnapshot.nickName || '';
    data.targetUser_avatarUrl = data.targetUserSnapshot.avatarUrl || '';
    data.targetUser_phone = data.targetUserSnapshot.phone || '';
    delete data.targetUserSnapshot;
  }
  if (data.targetCarpool !== undefined) { data.targetCarpool_id = data.targetCarpool; delete data.targetCarpool; }
  if (data.targetReview !== undefined) { data.targetReview_id = data.targetReview; delete data.targetReview; }
  if (data.targetMessage !== undefined) { data.targetMessage_id = data.targetMessage; delete data.targetMessage; }
  if (data.handler !== undefined) { data.handler_id = data.handler; delete data.handler; }

  // penalty
  if (data.penalty) {
    data.penalty_type = data.penalty.type || 'none';
    data.penalty_creditDeduct = data.penalty.creditDeduct || 0;
    data.penalty_banDuration = data.penalty.banDuration || 0;
    data.penalty_banStartAt = data.penalty.banStartAt || null;
    data.penalty_banEndAt = data.penalty.banEndAt || null;
    data.penalty_reason = data.penalty.reason || '';
    delete data.penalty;
  }

  // appeal
  if (data.appeal) {
    data.appeal_content = data.appeal.content || '';
    data.appeal_evidence = data.appeal.evidence ? JSON.stringify(data.appeal.evidence) : null;
    data.appeal_submittedAt = data.appeal.submittedAt || null;
    data.appeal_reviewedAt = data.appeal.reviewedAt || null;
    data.appeal_result = data.appeal.result || 'pending';
    data.appeal_resultNote = data.appeal.resultNote || '';
    delete data.appeal;
  }

  // timeline - stored in separate table
  const timeline = data.timeline;
  delete data.timeline;

  const complaint = await origCreate(data);

  // Save timeline entries
  if (timeline && Array.isArray(timeline)) {
    const pool = getPool();
    for (const entry of timeline) {
      await pool.query(
        'INSERT INTO complaint_timeline (complaint_id, action, operator_id, operatorName, note, createdAt) VALUES (?, ?, ?, ?, ?, ?)',
        [complaint.id, entry.action, entry.operator || null, entry.operatorName || '', entry.note || '', entry.createdAt || new Date()]
      );
    }
  }

  return complaint;
};

// Override findById to include timeline
const origFindById = baseModel.findById;
baseModel.findById = async function(id) {
  const complaint = await origFindById(id);
  if (complaint) {
    const pool = getPool();
    const [timeline] = await pool.query(
      'SELECT * FROM complaint_timeline WHERE complaint_id = ? ORDER BY createdAt ASC',
      [id]
    );
    complaint.timeline = timeline.map(t => ({
      action: t.action,
      operator: t.operator_id,
      operatorName: t.operatorName,
      note: t.note,
      createdAt: t.createdAt,
    }));

    // Reconstitute nested objects
    complaint.penalty = {
      type: complaint.penalty_type || 'none',
      creditDeduct: complaint.penalty_creditDeduct || 0,
      banDuration: complaint.penalty_banDuration || 0,
      banStartAt: complaint.penalty_banStartAt,
      banEndAt: complaint.penalty_banEndAt,
      reason: complaint.penalty_reason || '',
    };
    complaint.appeal = {
      content: complaint.appeal_content || '',
      evidence: complaint.appeal_evidence ? (typeof complaint.appeal_evidence === 'string' ? JSON.parse(complaint.appeal_evidence) : complaint.appeal_evidence) : [],
      submittedAt: complaint.appeal_submittedAt,
      reviewedAt: complaint.appeal_reviewedAt,
      result: complaint.appeal_result || 'pending',
      resultNote: complaint.appeal_resultNote || '',
    };

    attachComplaintMethods(complaint);
  }
  return complaint;
};

function attachComplaintMethods(complaint) {
  complaint.addTimeline = async function(action, operator, note) {
    const pool = getPool();
    await pool.query(
      'INSERT INTO complaint_timeline (complaint_id, action, operator_id, operatorName, note) VALUES (?, ?, ?, ?, ?)',
      [this.id, action, operator?._id || operator || null, operator?.nickName || '系统', note || '']
    );
    if (!this.timeline) this.timeline = [];
    this.timeline.push({ action, operator: operator?._id || null, operatorName: operator?.nickName || '系统', note: note || '', createdAt: new Date() });
    return this;
  };

  complaint.save = async function() {
    const pool = getPool();
    // Flatten nested objects
    const d = { ...this };
    if (d.penalty) {
      d.penalty_type = d.penalty.type || 'none';
      d.penalty_creditDeduct = d.penalty.creditDeduct || 0;
      d.penalty_banDuration = d.penalty.banDuration || 0;
      d.penalty_banStartAt = d.penalty.banStartAt || null;
      d.penalty_banEndAt = d.penalty.banEndAt || null;
      d.penalty_reason = d.penalty.reason || '';
      delete d.penalty;
    }
    if (d.appeal) {
      d.appeal_content = d.appeal.content || '';
      d.appeal_evidence = d.appeal.evidence ? JSON.stringify(d.appeal.evidence) : null;
      d.appeal_submittedAt = d.appeal.submittedAt || null;
      d.appeal_reviewedAt = d.appeal.reviewedAt || null;
      d.appeal_result = d.appeal.result || 'pending';
      d.appeal_resultNote = d.appeal.resultNote || '';
      delete d.appeal;
    }

    const skipKeys = ['timeline', 'toObject', '_id', 'save', 'deleteOne', 'addTimeline',
                       'complainantSnapshot', 'targetUserSnapshot', 'constructor'];
    // 将 mongoField 名映射回 MySQL 列名（如 handler → handler_id）
    function toCol(k) { return fieldMap[k] || k; }
    // JSON 字段需序列化，null/undefined 需跳过
    const jsonCols = new Set(['evidence', 'appeal_evidence']);
    const fields = [];
    const values = [];
    for (const [key, val] of Object.entries(d)) {
      if (skipKeys.includes(key)) continue;
      if (typeof val === 'function') continue;
      if (val === null || val === undefined) continue;
      let col = toCol(key);
      if (jsonCols.has(key) && typeof val === 'object') {
        fields.push(`\`${col}\` = ?`);
        values.push(JSON.stringify(val));
      } else {
        fields.push(`\`${col}\` = ?`);
        values.push(val);
      }
    }
    values.push(this.id);
    if (fields.length > 0) {
      await pool.query(`UPDATE \`${tableName}\` SET ${fields.join(', ')} WHERE id = ?`, values);
    }
    return this;
  };

  complaint.deleteOne = async function() {
    const pool = getPool();
    await pool.query('DELETE FROM complaint_timeline WHERE complaint_id = ?', [this.id]);
    await pool.query('DELETE FROM complaints WHERE id = ?', [this.id]);
  };
}

module.exports = baseModel;
