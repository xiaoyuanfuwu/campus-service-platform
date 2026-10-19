-- 校园墙独立表：forum_posts + forum_likes/forum_favorites/forum_replies
CREATE TABLE IF NOT EXISTS forum_posts (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  type VARCHAR(20) NOT NULL DEFAULT 'chat',
  creator_id BIGINT UNSIGNED NOT NULL,
  creator_nickName VARCHAR(100) DEFAULT '',
  creator_avatarUrl VARCHAR(500) DEFAULT '',
  creator_userCode VARCHAR(16) DEFAULT NULL,
  creator_creditScore INT DEFAULT 100,
  creator_gender ENUM('male','female','secret') DEFAULT 'secret',
  creator_school VARCHAR(100) DEFAULT '',
  isAnonymous TINYINT(1) NOT NULL DEFAULT 0 COMMENT '匿名发布',
  title VARCHAR(200) NOT NULL,
  content TEXT,
  summary VARCHAR(500) DEFAULT '',
  tags JSON DEFAULT NULL,
  images JSON DEFAULT NULL,
  location VARCHAR(300) DEFAULT '',
  status ENUM('active','closed','cancelled','resolved') DEFAULT 'active',
  viewCount INT DEFAULT 0,
  favoriteCount INT DEFAULT 0,
  likeCount INT DEFAULT 0,
  replyCount INT DEFAULT 0,
  auditStatus ENUM('pending','approved','rejected') DEFAULT 'pending' COMMENT '独立审核：新帖默认待审',
  auditReason VARCHAR(500) DEFAULT '',
  isFeatured TINYINT(1) DEFAULT 0,
  isTop TINYINT(1) DEFAULT 0,
  displayOrder INT DEFAULT 0,
  extra JSON DEFAULT NULL,
  legacyModulePostId BIGINT UNSIGNED DEFAULT NULL COMMENT '旧 module_posts.id 映射',
  createTime DATETIME DEFAULT CURRENT_TIMESTAMP,
  updateTime DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_legacy_post (legacyModulePostId),
  KEY idx_status_audit (status, auditStatus, createTime),
  KEY idx_audit (auditStatus),
  KEY idx_creator (creator_id),
  KEY idx_top (isTop, displayOrder, createTime),
  FULLTEXT KEY ft_title_content (title, content)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='校园墙独立帖子表';

CREATE TABLE IF NOT EXISTS forum_likes (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  post_id BIGINT UNSIGNED NOT NULL,
  user_id BIGINT UNSIGNED NOT NULL,
  createTime DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_user_post (user_id, post_id),
  KEY idx_post (post_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='校园墙点赞表';

CREATE TABLE IF NOT EXISTS forum_favorites (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  post_id BIGINT UNSIGNED NOT NULL,
  user_id BIGINT UNSIGNED NOT NULL,
  createTime DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_user_post (user_id, post_id),
  KEY idx_post (post_id),
  KEY idx_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='校园墙收藏表';

CREATE TABLE IF NOT EXISTS forum_replies (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  post_id BIGINT UNSIGNED NOT NULL,
  parent_id BIGINT UNSIGNED DEFAULT NULL,
  reply_to_id BIGINT UNSIGNED DEFAULT NULL,
  reply_to_nickName VARCHAR(100) DEFAULT '',
  user_id BIGINT UNSIGNED NOT NULL,
  user_nickName VARCHAR(100) DEFAULT '',
  user_avatarUrl VARCHAR(500) DEFAULT '',
  content TEXT NOT NULL,
  images JSON DEFAULT NULL,
  isDeleted TINYINT(1) DEFAULT 0,
  likeCount INT DEFAULT 0,
  createTime DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_post (post_id, createTime),
  KEY idx_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='校园墙回复表';

-- 迁移：module_posts 中全部 forum 数据 → forum_posts（保留旧ID映射，可重复执行）
INSERT INTO forum_posts (
  type, creator_id, creator_nickName, creator_avatarUrl, creator_userCode, creator_creditScore,
  creator_gender, creator_school, isAnonymous, title, content, summary, tags, images, location,
  status, viewCount, favoriteCount, likeCount, replyCount, auditStatus, auditReason, isFeatured,
  isTop, displayOrder, extra, legacyModulePostId, createTime, updateTime
)
SELECT m.type, m.creator_id, m.creator_nickName, m.creator_avatarUrl, m.creator_userCode, m.creator_creditScore,
       m.creator_gender, m.creator_school, 0, m.title, m.content, m.summary, m.tags, m.images, m.location,
       m.status, m.viewCount, m.favoriteCount, m.likeCount, m.replyCount, m.auditStatus, m.auditReason, m.isFeatured,
       m.isTop, m.displayOrder, m.extra, m.id, m.createTime, m.updateTime
FROM module_posts m
WHERE m.module = 'forum'
  AND NOT EXISTS (SELECT 1 FROM forum_posts f WHERE f.legacyModulePostId = m.id);
