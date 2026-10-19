-- 统一内容迁移：拼车并入 module_posts。旧表保留，用于回滚及历史兼容。
ALTER TABLE module_posts
  MODIFY COLUMN module VARCHAR(20) NOT NULL COMMENT '统一内容模块，含 carpool',
  MODIFY COLUMN status ENUM('active','full','closed','cancelled','resolved','ended','expired') NOT NULL DEFAULT 'active',
  ADD COLUMN contentType ENUM('forum','template') NOT NULL DEFAULT 'template' AFTER module,
  ADD COLUMN displayType VARCHAR(32) NOT NULL DEFAULT 'standard' AFTER contentType,
  ADD COLUMN legacyCarpoolId BIGINT UNSIGNED NULL AFTER displayType,
  ADD COLUMN isUrgent TINYINT(1) NOT NULL DEFAULT 0 AFTER isTop,
  ADD COLUMN showContactAfterJoin TINYINT(1) NOT NULL DEFAULT 0 AFTER isUrgent,
  ADD COLUMN isReported TINYINT(1) NOT NULL DEFAULT 0 AFTER showContactAfterJoin,
  ADD COLUMN reportCount INT NOT NULL DEFAULT 0 AFTER isReported,
  ADD COLUMN cancelReason VARCHAR(500) NOT NULL DEFAULT '' AFTER reportCount,
  ADD UNIQUE KEY uk_legacy_carpool (legacyCarpoolId),
  ADD KEY idx_content_display (module, displayType, status, createTime);

CREATE TABLE IF NOT EXISTS content_participants (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  content_id BIGINT UNSIGNED NOT NULL COMMENT 'module_posts.id',
  user_id BIGINT UNSIGNED NOT NULL,
  nickName VARCHAR(100) NOT NULL DEFAULT '',
  avatarUrl VARCHAR(500) NOT NULL DEFAULT '',
  creditScore INT NOT NULL DEFAULT 100,
  joinTime DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  status ENUM('joined','left','kicked','cancelled') NOT NULL DEFAULT 'joined',
  contact VARCHAR(100) NOT NULL DEFAULT '',
  note VARCHAR(500) NOT NULL DEFAULT '',
  PRIMARY KEY (id),
  UNIQUE KEY uk_content_user (content_id, user_id),
  KEY idx_content_status (content_id, status),
  KEY idx_user_status (user_id, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='统一内容参与者表';

INSERT INTO module_posts (
  module, contentType, displayType, legacyCarpoolId, type,
  creator_id, creator_nickName, creator_avatarUrl, creator_userCode, creator_creditScore, creator_gender, creator_school,
  title, content, summary, price, priceNote, contact, contactType, images, tags, location, status,
  viewCount, favoriteCount, participateCount, replyCount, auditStatus, auditReason, isFeatured,
  isUrgent, showContactAfterJoin, isReported, reportCount, cancelReason, extra, createTime, updateTime
)
SELECT
  'carpool', 'template', 'carpool', c.id, c.type,
  c.creator_id, c.creator_nickName, c.creator_avatarUrl, NULL, c.creator_creditScore, c.creator_gender, c.creator_school,
  CONCAT(c.from_place, ' → ', c.to_place), c.note, c.note, c.price, c.priceNote, c.contact, c.contactType,
  c.images, c.tags, CONCAT_WS(' ', c.from_place, c.to_place), c.status,
  c.viewCount, c.favoriteCount, GREATEST(c.totalSeats - c.remainSeats, 0), 0, c.auditStatus, c.auditReason, c.isFeatured,
  c.isUrgent, c.showContactAfterJoin, c.isReported, c.reportCount, c.cancelReason,
  JSON_OBJECT(
    'from', c.from_place, 'to', c.to_place, 'fromDetail', c.fromDetail, 'toDetail', c.toDetail,
    'fromLat', c.from_lat, 'fromLng', c.from_lng, 'toLat', c.to_lat, 'toLng', c.to_lng,
    'departureTime', DATE_FORMAT(c.departureTime, '%Y-%m-%dT%H:%i:%s.000Z'),
    'deadlineTime', IF(c.deadlineTime IS NULL, NULL, DATE_FORMAT(c.deadlineTime, '%Y-%m-%dT%H:%i:%s.000Z')),
    'totalSeats', c.totalSeats, 'remainSeats', c.remainSeats,
    'vehicle', JSON_OBJECT('plateNumber', c.vehicle_plateNumber, 'brand', c.vehicle_brand, 'color', c.vehicle_color),
    'legacyCarpoolId', c.id
  ),
  c.createTime, c.updateTime
FROM carpools c
LEFT JOIN module_posts p ON p.legacyCarpoolId = c.id
WHERE p.id IS NULL;

INSERT INTO content_participants (content_id, user_id, nickName, avatarUrl, creditScore, joinTime, status, contact, note)
SELECT p.id, cp.user_id, cp.nickName, cp.avatarUrl, cp.creditScore, cp.joinTime,
       CASE WHEN cp.status = 'left' THEN 'left' WHEN cp.status = 'kicked' THEN 'kicked' ELSE 'joined' END,
       cp.contact, cp.note
FROM carpool_participants cp
JOIN module_posts p ON p.legacyCarpoolId = cp.carpool_id AND p.module = 'carpool'
ON DUPLICATE KEY UPDATE nickName=VALUES(nickName), avatarUrl=VALUES(avatarUrl), creditScore=VALUES(creditScore), joinTime=VALUES(joinTime), status=VALUES(status), contact=VALUES(contact), note=VALUES(note);

INSERT INTO module_favorites (user_id, post_id, module, createTime)
SELECT f.user_id, p.id, 'carpool', f.createTime
FROM favorites f
JOIN module_posts p ON p.legacyCarpoolId = f.carpool_id AND p.module = 'carpool'
ON DUPLICATE KEY UPDATE createTime=VALUES(createTime);

UPDATE notifications n
JOIN module_posts p ON n.relatedCarpool_id = p.legacyCarpoolId AND p.module = 'carpool'
SET n.relatedPost_id = p.id
WHERE n.relatedPost_id IS NULL;
