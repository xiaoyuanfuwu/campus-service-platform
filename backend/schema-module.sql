-- ============================================================
-- 模块帖子系统 — 统一建表脚本
-- 为 10 个模块提供统一存储
-- 字符集: utf8mb4  排序规则: utf8mb4_unicode_ci
-- ============================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ============================================================
-- 1. 模块帖子表 (统一存储 express/task/lost/forum/secondhand/rental/substitute/print/yellowpage/charity)
-- ============================================================
DROP TABLE IF EXISTS `module_posts`;
CREATE TABLE `module_posts` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `module` VARCHAR(20) NOT NULL COMMENT '模块名: express|task|lost|forum|secondhand|rental|substitute|print|yellowpage|charity',
  `type` ENUM('offer','find','info') NOT NULL DEFAULT 'offer' COMMENT 'offer=提供, find=需求, info=信息',
  `creator_id` BIGINT UNSIGNED NOT NULL COMMENT '发布者用户ID',
  `creator_nickName` VARCHAR(100) DEFAULT '' COMMENT '发布时昵称快照',
  `creator_avatarUrl` VARCHAR(500) DEFAULT '' COMMENT '发布时头像快照',
  `creator_creditScore` INT DEFAULT 100 COMMENT '发布时信用分快照',
  `creator_gender` ENUM('male','female','secret') DEFAULT 'secret',
  `creator_school` VARCHAR(100) DEFAULT '' COMMENT '发布时学校快照',
  `title` VARCHAR(200) NOT NULL COMMENT '标题',
  `content` TEXT COMMENT '正文(HTML/Markdown)',
  `summary` VARCHAR(500) DEFAULT '' COMMENT '摘要(列表展示用)',
  `price` DECIMAL(10,2) DEFAULT 0.00 COMMENT '价格/悬赏金额(元)',
  `priceNote` VARCHAR(200) DEFAULT '' COMMENT '价格说明',
  `contact` VARCHAR(100) DEFAULT '' COMMENT '联系方式',
  `contactType` ENUM('phone','wechat','qq','other') DEFAULT 'phone',
  `images` JSON DEFAULT NULL COMMENT '图片数组 [{url,width,height}]',
  `tags` JSON DEFAULT NULL COMMENT '标签数组 ["快递","代取"]',
  `location` VARCHAR(300) DEFAULT '' COMMENT '位置/地址',
  `status` ENUM('active','closed','cancelled','resolved') DEFAULT 'active' COMMENT 'active=进行中, closed=已结束, cancelled=已取消, resolved=已解决',
  `viewCount` INT DEFAULT 0 COMMENT '浏览数',
  `favoriteCount` INT DEFAULT 0 COMMENT '收藏数',
  `participateCount` INT DEFAULT 0 COMMENT '参与/报名数',
  `replyCount` INT DEFAULT 0 COMMENT '回复/评论数',
  `auditStatus` ENUM('pending','approved','rejected') DEFAULT 'approved',
  `auditReason` VARCHAR(500) DEFAULT '',
  `isFeatured` TINYINT(1) DEFAULT 0 COMMENT '是否精选',
  `isTop` TINYINT(1) DEFAULT 0 COMMENT '是否置顶',
  `displayOrder` INT DEFAULT 0 COMMENT '排序权重',
  `extra` JSON DEFAULT NULL COMMENT '模块扩展字段: deadline, courseName, condition, loanDuration等',
  `createTime` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updateTime` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_module` (`module`),
  KEY `idx_module_status` (`module`, `status`),
  KEY `idx_module_time` (`module`, `createTime` DESC),
  KEY `idx_creator` (`creator_id`),
  KEY `idx_type` (`type`),
  KEY `idx_status` (`status`),
  KEY `idx_audit` (`auditStatus`),
  KEY `idx_featured` (`isFeatured`, `displayOrder`),
  KEY `idx_price` (`price`),
  FULLTEXT KEY `ft_title_content` (`title`, `content`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='模块帖子统一表';

-- ============================================================
-- 2. 模块收藏表
-- ============================================================
DROP TABLE IF EXISTS `module_favorites`;
CREATE TABLE `module_favorites` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` BIGINT UNSIGNED NOT NULL,
  `post_id` BIGINT UNSIGNED NOT NULL COMMENT 'module_posts.id',
  `module` VARCHAR(20) NOT NULL COMMENT '冗余,方便统计',
  `createTime` DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_user_post` (`user_id`, `post_id`),
  KEY `idx_user` (`user_id`),
  KEY `idx_post` (`post_id`),
  KEY `idx_user_module` (`user_id`, `module`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='模块收藏表';

-- ============================================================
-- 3. 模块回复/评论表
-- ============================================================
DROP TABLE IF EXISTS `module_replies`;
CREATE TABLE `module_replies` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `post_id` BIGINT UNSIGNED NOT NULL COMMENT 'module_posts.id',
  `module` VARCHAR(20) NOT NULL,
  `parent_id` BIGINT UNSIGNED DEFAULT NULL COMMENT '父回复ID(子回复用)',
  `reply_to_id` BIGINT UNSIGNED DEFAULT NULL COMMENT '被回复者用户ID',
  `reply_to_nickName` VARCHAR(100) DEFAULT '' COMMENT '被回复者昵称',
  `user_id` BIGINT UNSIGNED NOT NULL COMMENT '回复者用户ID',
  `user_nickName` VARCHAR(100) DEFAULT '' COMMENT '回复时昵称快照',
  `user_avatarUrl` VARCHAR(500) DEFAULT '' COMMENT '回复时头像快照',
  `content` TEXT NOT NULL COMMENT '回复内容',
  `images` JSON DEFAULT NULL COMMENT '图片',
  `isDeleted` TINYINT(1) DEFAULT 0 COMMENT '软删除',
  `likeCount` INT DEFAULT 0,
  `createTime` DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_post` (`post_id`, `createTime`),
  KEY `idx_post_created` (`post_id`, `createTime` DESC),
  KEY `idx_user` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='模块回复表';

-- ============================================================
-- 4. 扩展通知表 — 支持模块帖子事件
-- ============================================================
ALTER TABLE `notifications`
  MODIFY COLUMN `type` ENUM('new_message','new_participant','participant_left','carpool_cancelled',
    'carpool_ended','new_review','credit_change','system',
    'module_new_reply','module_favorited','module_status_change') NOT NULL,
  ADD COLUMN `relatedPost_id` BIGINT UNSIGNED DEFAULT NULL COMMENT '关联 module_posts.id' AFTER `relatedCarpool_id`,
  ADD COLUMN `relatedReply_id` BIGINT UNSIGNED DEFAULT NULL COMMENT '关联 module_replies.id' AFTER `relatedPost_id`,
  ADD INDEX `idx_relatedPost` (`relatedPost_id`);

SET FOREIGN_KEY_CHECKS = 1;
