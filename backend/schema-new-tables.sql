-- ============================================================
-- 新模块数据库建表脚本
-- 字符集: utf8mb4  排序规则: utf8mb4_unicode_ci
-- 包含：校园黄页、校园题库、校园图鉴、校园成就
-- ============================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ============================================================
-- 1. 校园黄页
-- ============================================================
DROP TABLE IF EXISTS `yellowpages`;
CREATE TABLE `yellowpages` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(200) NOT NULL COMMENT '部门/机构名称',
  `category` VARCHAR(50) NOT NULL COMMENT '分类：党政机构|教学机构|学生事务|后勤保障|教辅单位|国际交流|附属单位',
  `phone` VARCHAR(100) DEFAULT '' COMMENT '联系电话',
  `fax` VARCHAR(50) DEFAULT '' COMMENT '传真',
  `email` VARCHAR(200) DEFAULT '' COMMENT '邮箱',
  `location` VARCHAR(200) DEFAULT '' COMMENT '办公地点',
  `description` TEXT COMMENT '描述/备注',
  `sort_order` INT DEFAULT 0 COMMENT '排序权重',
  `is_active` TINYINT(1) DEFAULT 1 COMMENT '是否显示',
  `createTime` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updateTime` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_category` (`category`),
  KEY `idx_active` (`is_active`),
  KEY `idx_sort` (`sort_order`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='校园黄页';

-- ============================================================
-- 2. 校园题库
-- ============================================================
DROP TABLE IF EXISTS `questionbanks`;
CREATE TABLE `questionbanks` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(200) NOT NULL COMMENT '试卷/试题名称',
  `category` VARCHAR(50) NOT NULL COMMENT '分类：高数|英语|思政|专业课|其他',
  `course` VARCHAR(100) DEFAULT '' COMMENT '课程名',
  `year` VARCHAR(10) DEFAULT '' COMMENT '年份',
  `question_count` INT DEFAULT 0 COMMENT '题目数量',
  `sort_order` INT DEFAULT 0 COMMENT '排序权重',
  `is_active` TINYINT(1) DEFAULT 1 COMMENT '是否显示',
  `createTime` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updateTime` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_category` (`category`),
  KEY `idx_active` (`is_active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='校园题库';

-- ============================================================
-- 3. 校园图鉴分类表
-- ============================================================
DROP TABLE IF EXISTS `guide_categories`;
CREATE TABLE `guide_categories` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `category_key` VARCHAR(50) NOT NULL COMMENT '分类标识 key：landmarks|organizations|animals|plants|awards|certificates|limited',
  `name` VARCHAR(100) NOT NULL COMMENT '分类名称',
  `tag` VARCHAR(50) DEFAULT '' COMMENT '标签/副标题',
  `description` VARCHAR(300) DEFAULT '' COMMENT '分类描述',
  `color` VARCHAR(20) DEFAULT '' COMMENT '主色',
  `color_light` VARCHAR(20) DEFAULT '' COMMENT '浅色',
  `icon` VARCHAR(500) DEFAULT '' COMMENT '分类图标 URL',
  `sort_order` INT DEFAULT 0 COMMENT '排序权重',
  `is_active` TINYINT(1) DEFAULT 1 COMMENT '是否显示',
  `createTime` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updateTime` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_key` (`category_key`),
  KEY `idx_active` (`is_active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='图鉴分类';

-- ============================================================
-- 4. 校园图鉴条目表
-- ============================================================
DROP TABLE IF EXISTS `guide_items`;
CREATE TABLE `guide_items` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `category_key` VARCHAR(50) NOT NULL COMMENT '归属分类 key',
  `name` VARCHAR(200) NOT NULL COMMENT '条目名称',
  `description` TEXT COMMENT '条目描述',
  `emoji` VARCHAR(20) DEFAULT '' COMMENT 'Emoji 图标',
  `icon` VARCHAR(500) DEFAULT '' COMMENT '图片图标 URL',
  `sort_order` INT DEFAULT 0 COMMENT '排序权重',
  `is_active` TINYINT(1) DEFAULT 1 COMMENT '是否显示',
  `createTime` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updateTime` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_category` (`category_key`),
  KEY `idx_active` (`is_active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='图鉴条目';

-- ============================================================
-- 5. 校园成就 — 赛道定义表
-- ============================================================
DROP TABLE IF EXISTS `achievement_tracks`;
CREATE TABLE `achievement_tracks` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `track_key` VARCHAR(50) NOT NULL COMMENT '赛道标识：leadership|certificate|academic|competition',
  `name` VARCHAR(100) NOT NULL COMMENT '赛道名称',
  `theme` VARCHAR(50) DEFAULT '' COMMENT '主题色标识',
  `icon` VARCHAR(20) DEFAULT '' COMMENT 'Emoji 图标',
  `icon_img` VARCHAR(500) DEFAULT '' COMMENT '图片图标 URL',
  `description` VARCHAR(300) DEFAULT '' COMMENT '赛道描述',
  `sort_order` INT DEFAULT 0 COMMENT '排序权重',
  `is_active` TINYINT(1) DEFAULT 1 COMMENT '是否启用',
  `createTime` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updateTime` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_track` (`track_key`),
  KEY `idx_active` (`is_active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='成就赛道定义';

-- ============================================================
-- 6. 校园成就 — 成就项定义表
-- ============================================================
DROP TABLE IF EXISTS `achievement_items`;
CREATE TABLE `achievement_items` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `track_key` VARCHAR(50) NOT NULL COMMENT '所属赛道 key',
  `item_key` VARCHAR(100) NOT NULL COMMENT '成就项标识',
  `name` VARCHAR(200) NOT NULL COMMENT '成就项名称',
  `description` TEXT COMMENT '成就描述',
  `icon` MEDIUMTEXT COMMENT 'SVG base64 图标',
  `sort_order` INT DEFAULT 0 COMMENT '排序权重',
  `is_active` TINYINT(1) DEFAULT 1 COMMENT '是否启用',
  `createTime` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updateTime` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_item` (`track_key`, `item_key`),
  KEY `idx_track` (`track_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='成就项定义';

-- ============================================================
-- 7. 校园成就 — 用户成就记录表
-- ============================================================
DROP TABLE IF EXISTS `user_achievements`;
CREATE TABLE `user_achievements` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` BIGINT UNSIGNED NOT NULL COMMENT '用户ID',
  `track_key` VARCHAR(50) NOT NULL COMMENT '赛道 key',
  `item_key` VARCHAR(100) NOT NULL COMMENT '成就项 key',
  `status` ENUM('none','pending','approved','rejected') DEFAULT 'none' COMMENT '状态',
  `image_url` VARCHAR(500) DEFAULT '' COMMENT '上传的证书图片 URL',
  `note` TEXT COMMENT '用户备注',
  `reviewed_by` BIGINT UNSIGNED DEFAULT NULL COMMENT '审核人（管理员ID）',
  `reviewed_at` DATETIME DEFAULT NULL COMMENT '审核时间',
  `review_remark` VARCHAR(500) DEFAULT '' COMMENT '审核备注',
  `createTime` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updateTime` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_user_item` (`user_id`, `track_key`, `item_key`),
  KEY `idx_user` (`user_id`),
  KEY `idx_track` (`track_key`),
  KEY `idx_status` (`status`),
  KEY `idx_create` (`createTime`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户成就记录';

SET FOREIGN_KEY_CHECKS = 1;
