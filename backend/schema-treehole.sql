-- ============================================
-- 树洞（Treehole）建表 SQL
-- 4 个表：treehole_posts / treehole_likes / treehole_comments / treehole_reports
-- ============================================

CREATE TABLE IF NOT EXISTS `treehole_posts` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` INT UNSIGNED NOT NULL COMMENT '发布者ID',
  `nick_name` VARCHAR(64) NOT NULL DEFAULT '' COMMENT '发布时昵称快照',
  `avatar` VARCHAR(32) NOT NULL DEFAULT '' COMMENT '匿名小动物头像 (emoji)',
  `content` TEXT NOT NULL COMMENT '心事正文',
  `images` JSON DEFAULT NULL COMMENT '图片URL数组',
  `category` VARCHAR(16) NOT NULL DEFAULT 'share' COMMENT '分类: find/complain/help/share',
  `location` VARCHAR(64) NOT NULL DEFAULT '' COMMENT '来源地',
  `likes` INT UNSIGNED NOT NULL DEFAULT 0 COMMENT '点赞数',
  `comments` INT UNSIGNED NOT NULL DEFAULT 0 COMMENT '评论数',
  `views` INT UNSIGNED NOT NULL DEFAULT 0 COMMENT '浏览数',
  `status` TINYINT NOT NULL DEFAULT 0 COMMENT '0=待审核 1=已通过 2=官方已发布 -1=删除/驳回',
  `createTime` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updateTime` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_createTime` (`createTime`),
  KEY `idx_status` (`status`),
  KEY `idx_category` (`category`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='树洞心声';

CREATE TABLE IF NOT EXISTS `treehole_likes` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` INT UNSIGNED NOT NULL,
  `post_id` INT UNSIGNED NOT NULL,
  `createTime` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_user_post` (`user_id`, `post_id`),
  KEY `idx_post_id` (`post_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='树洞点赞';

CREATE TABLE IF NOT EXISTS `treehole_comments` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `post_id` INT UNSIGNED NOT NULL,
  `user_id` INT UNSIGNED NOT NULL,
  `nick_name` VARCHAR(64) NOT NULL DEFAULT '' COMMENT '评论时昵称',
  `avatar` VARCHAR(32) NOT NULL DEFAULT '' COMMENT '评论者头像',
  `content` VARCHAR(500) NOT NULL COMMENT '评论内容',
  `status` TINYINT NOT NULL DEFAULT 1 COMMENT '1=正常 0=删除',
  `createTime` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_post_id` (`post_id`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_createTime` (`createTime`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='树洞评论';
