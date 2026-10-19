-- ====================================================================
-- 合并建库脚本 install.sql（按官方顺序合并 backend/ 下所有 schema）
-- 用法一（自动建库）: mysql -u<USER> -p < install.sql
-- 用法二（指定库）  : mysql -u<USER> -p <DB_NAME> < install.sql
-- 默认库名: campus_service（如需改名，改下方 CREATE DATABASE 行即可）
-- 注意: 所有子脚本均含 DROP TABLE IF EXISTS，重复执行会清空同名表，仅首次建库使用
-- ====================================================================
CREATE DATABASE IF NOT EXISTS `campus_service` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `campus_service`;
SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- 1) 核心表：用户 / 拼车 / 消息 / 通知 / 评价 / 投诉 / 管理员 等

-- ============================================================
-- 校园信息服务平台 - MySQL 数据库建表脚本
-- 基于 src/models/*.js 和后端 API 接口文档生成
-- 字符集: utf8mb4  排序规则: utf8mb4_unicode_ci
-- 生成时间: 2026-06-21
-- ============================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- -----------------------------------------------------------
-- 1. 用户表
-- -----------------------------------------------------------
DROP TABLE IF EXISTS `users`;
CREATE TABLE `users` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id_code` VARCHAR(10) DEFAULT NULL COMMENT '6位数字唯一ID',
  `openid` VARCHAR(100) DEFAULT NULL COMMENT '微信 openid',
  `unionid` VARCHAR(100) DEFAULT '' COMMENT '微信 unionid',
  `sessionKey` VARCHAR(200) DEFAULT '' COMMENT '微信 session_key',
  `phone` VARCHAR(20) DEFAULT '' COMMENT '手机号',
  `password` VARCHAR(200) DEFAULT NULL COMMENT '密码(bcrypt)',
  `nickName` VARCHAR(100) DEFAULT '' COMMENT '昵称',
  `avatarUrl` VARCHAR(500) DEFAULT '' COMMENT '头像地址',
  `gender` ENUM('male','female','secret') DEFAULT 'secret' COMMENT '性别',
  `birthday` DATE DEFAULT NULL COMMENT '生日',
  `bio` VARCHAR(500) DEFAULT '' COMMENT '个人简介',
  `school` VARCHAR(100) DEFAULT '示例大学' COMMENT '学校',
  `realName` VARCHAR(50) DEFAULT NULL COMMENT '真实姓名',
  `studentId` VARCHAR(20) DEFAULT '' COMMENT '学号',
  `department` VARCHAR(100) DEFAULT '' COMMENT '院系',
  `grade` VARCHAR(20) DEFAULT '' COMMENT '年级',
  `role` ENUM('user','moderator') DEFAULT 'user' COMMENT '角色',
  `creditScore` INT DEFAULT 100 COMMENT '信用分',
  `tripCount` INT DEFAULT 0 COMMENT '同行次数',
  `publishCount` INT DEFAULT 0 COMMENT '发布次数',
  `joinCount` INT DEFAULT 0 COMMENT '参与次数',
  `cancelCount` INT DEFAULT 0 COMMENT '取消次数',
  `totalReviews` INT DEFAULT 0 COMMENT '总评价数',
  `positiveReviews` INT DEFAULT 0 COMMENT '好评数',
  `goodRate` INT DEFAULT 100 COMMENT '好评率(%)',
  `loginCount` INT DEFAULT 0 COMMENT '登录次数',
  `banned` TINYINT(1) DEFAULT 0 COMMENT '是否被封禁 0=正常 1=封禁',
  `lastLoginTime` DATETIME DEFAULT NULL COMMENT '最后登录时间',
  `lastLoginAt` DATETIME DEFAULT NULL COMMENT '最后登录时间(ISO)',
  `lastLoginIp` VARCHAR(50) DEFAULT '' COMMENT '最后登录 IP',
  `platform` VARCHAR(20) DEFAULT '' COMMENT '注册平台',
  `device_brand` VARCHAR(50) DEFAULT '' COMMENT '设备品牌',
  `device_model` VARCHAR(50) DEFAULT '' COMMENT '设备型号',
  `device_version` VARCHAR(20) DEFAULT '' COMMENT '应用版本',
  `smoke_pref` TINYINT(1) DEFAULT 0 COMMENT '是否接受抽烟',
  `music_pref` TINYINT(1) DEFAULT 1 COMMENT '是否接受听歌',
  `chat_pref` TINYINT(1) DEFAULT 1 COMMENT '是否接受聊天',
  `quiet_pref` TINYINT(1) DEFAULT 0 COMMENT '偏好安静',
  `pet_pref` TINYINT(1) DEFAULT 0 COMMENT '是否接受宠物',
  `luggage_pref` TINYINT(1) DEFAULT 1 COMMENT '是否接受行李',
  `status` ENUM('active','disabled','banned') DEFAULT 'active' COMMENT '账号状态',
  `banReason` VARCHAR(500) DEFAULT '' COMMENT '封禁原因',
  `banUntil` DATETIME DEFAULT NULL COMMENT '封禁截止时间',
  `isVerified` TINYINT(1) DEFAULT 0 COMMENT '是否已认证',
  `isOnline` TINYINT(1) DEFAULT 0 COMMENT '是否在线',
  `createTime` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '注册时间',
  `updateTime` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_user_id_code` (`user_id_code`),
  UNIQUE KEY `uk_openid` (`openid`),
  UNIQUE KEY `uk_phone` (`phone`),
  KEY `idx_school` (`school`),
  KEY `idx_status` (`status`),
  KEY `idx_credit` (`creditScore`),
  KEY `idx_create` (`createTime`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户表';

-- -----------------------------------------------------------
-- 2. 管理员表
-- -----------------------------------------------------------
DROP TABLE IF EXISTS `admins`;
CREATE TABLE `admins` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `username` VARCHAR(50) NOT NULL COMMENT '用户名',
  `password` VARCHAR(200) NOT NULL COMMENT '密码(bcrypt)',
  `nickName` VARCHAR(100) DEFAULT '' COMMENT '昵称',
  `email` VARCHAR(100) DEFAULT '' COMMENT '邮箱',
  `phone` VARCHAR(20) DEFAULT '' COMMENT '手机号',
  `avatar` VARCHAR(500) DEFAULT '' COMMENT '头像',
  `role` ENUM('super_admin','admin','moderator') DEFAULT 'admin' COMMENT '角色',
  `permissions` JSON DEFAULT NULL COMMENT '权限列表',
  `status` ENUM('active','disabled') DEFAULT 'active' COMMENT '状态',
  `lastLoginTime` DATETIME DEFAULT NULL COMMENT '最后登录时间',
  `lastLoginAt` DATETIME DEFAULT NULL COMMENT '最后登录时间(ISO)',
  `lastLoginIp` VARCHAR(50) DEFAULT '' COMMENT '最后登录 IP',
  `loginFailCount` INT DEFAULT 0 COMMENT '连续登录失败次数',
  `loginCount` INT DEFAULT 0 COMMENT '登录次数',
  `lockedUntil` DATETIME DEFAULT NULL COMMENT '锁定截止时间',
  `createTime` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updateTime` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_username` (`username`),
  KEY `idx_status` (`status`),
  KEY `idx_role` (`role`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='管理员表';

-- -----------------------------------------------------------
-- 3. 拼车表
-- -----------------------------------------------------------
DROP TABLE IF EXISTS `carpools`;
CREATE TABLE `carpools` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `creator_id` BIGINT UNSIGNED NOT NULL COMMENT '发布者 ID',
  `creator_nickName` VARCHAR(100) DEFAULT '' COMMENT '发布时昵称快照',
  `creator_avatarUrl` VARCHAR(500) DEFAULT '' COMMENT '发布时头像快照',
  `creator_creditScore` INT DEFAULT 100 COMMENT '发布时信用分快照',
  `creator_gender` ENUM('male','female','secret') DEFAULT 'secret',
  `creator_school` VARCHAR(100) DEFAULT '',
  `from_place` VARCHAR(200) NOT NULL COMMENT '出发地',
  `to_place` VARCHAR(200) NOT NULL COMMENT '目的地',
  `fromDetail` VARCHAR(500) DEFAULT '' COMMENT '出发地详细地址',
  `toDetail` VARCHAR(500) DEFAULT '' COMMENT '目的地详细地址',
  `from_lat` DECIMAL(10,7) DEFAULT NULL COMMENT '出发地纬度',
  `from_lng` DECIMAL(10,7) DEFAULT NULL COMMENT '出发地经度',
  `to_lat` DECIMAL(10,7) DEFAULT NULL COMMENT '目的地纬度',
  `to_lng` DECIMAL(10,7) DEFAULT NULL COMMENT '目的地经度',
  `departureTime` DATETIME NOT NULL COMMENT '出发时间',
  `deadlineTime` DATETIME DEFAULT NULL COMMENT '报名截止时间',
  `totalSeats` INT NOT NULL DEFAULT 1 COMMENT '总座位数(1-20)',
  `remainSeats` INT NOT NULL DEFAULT 1 COMMENT '剩余座位数',
  `type` ENUM('find','offer') NOT NULL DEFAULT 'offer' COMMENT '类型: find=找同行, offer=有空位',
  `status` ENUM('active','full','ended','cancelled','expired') DEFAULT 'active',
  `contact` VARCHAR(100) DEFAULT '' COMMENT '联系方式',
  `contactType` ENUM('phone','wechat','qq','other') DEFAULT 'phone',
  `vehicle_plateNumber` VARCHAR(20) DEFAULT '' COMMENT '车牌号',
  `vehicle_brand` VARCHAR(50) DEFAULT '' COMMENT '品牌型号',
  `vehicle_color` VARCHAR(20) DEFAULT '' COMMENT '颜色',
  `note` VARCHAR(1000) DEFAULT '' COMMENT '备注',
  `tags` JSON DEFAULT NULL COMMENT '标签数组',
  `images` JSON DEFAULT NULL COMMENT '图片数组',
  `price` DECIMAL(10,2) DEFAULT 0.00 COMMENT '费用(元)',
  `priceNote` VARCHAR(200) DEFAULT '' COMMENT '费用说明',
  `viewCount` INT DEFAULT 0 COMMENT '浏览数',
  `favoriteCount` INT DEFAULT 0 COMMENT '收藏数',
  `isUrgent` TINYINT(1) DEFAULT 0 COMMENT '是否紧急',
  `isFeatured` TINYINT(1) DEFAULT 0 COMMENT '是否精选',
  `showContactAfterJoin` TINYINT(1) DEFAULT 1 COMMENT '加入后才显示联系方式',
  `auditStatus` ENUM('pending','approved','rejected') DEFAULT 'approved' COMMENT '审核状态',
  `auditReason` VARCHAR(500) DEFAULT '' COMMENT '审核备注',
  `isReported` TINYINT(1) DEFAULT 0 COMMENT '是否被举报',
  `reportCount` INT DEFAULT 0 COMMENT '举报次数',
  `cancelReason` VARCHAR(500) DEFAULT '' COMMENT '取消原因',
  `createTime` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updateTime` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_creator` (`creator_id`),
  KEY `idx_from` (`from_place`(100)),
  KEY `idx_to` (`to_place`(100)),
  KEY `idx_departure` (`departureTime`),
  KEY `idx_status` (`status`),
  KEY `idx_type` (`type`),
  KEY `idx_create` (`createTime`),
  KEY `idx_audit` (`auditStatus`),
  KEY `idx_geo` (`from_lat`, `from_lng`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='拼车表';

-- -----------------------------------------------------------
-- 4. 拼车参与者表
-- -----------------------------------------------------------
DROP TABLE IF EXISTS `carpool_participants`;
CREATE TABLE `carpool_participants` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `carpool_id` BIGINT UNSIGNED NOT NULL,
  `user_id` BIGINT UNSIGNED NOT NULL,
  `nickName` VARCHAR(100) DEFAULT '' COMMENT '加入时昵称快照',
  `avatarUrl` VARCHAR(500) DEFAULT '' COMMENT '加入时头像快照',
  `creditScore` INT DEFAULT 100,
  `joinTime` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `status` ENUM('joined','left','kicked') DEFAULT 'joined',
  `contact` VARCHAR(100) DEFAULT '' COMMENT '联系方式',
  `note` VARCHAR(500) DEFAULT '' COMMENT '备注',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_carpool_user` (`carpool_id`, `user_id`),
  KEY `idx_user` (`user_id`),
  KEY `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='拼车参与者表';

-- -----------------------------------------------------------
-- 5. 收藏表
-- -----------------------------------------------------------
DROP TABLE IF EXISTS `favorites`;
CREATE TABLE `favorites` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` BIGINT UNSIGNED NOT NULL,
  `carpool_id` BIGINT UNSIGNED NOT NULL,
  `createTime` DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_user_carpool` (`user_id`, `carpool_id`),
  KEY `idx_carpool` (`carpool_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='收藏表';

-- -----------------------------------------------------------
-- 6. 消息表
-- -----------------------------------------------------------
DROP TABLE IF EXISTS `messages`;
CREATE TABLE `messages` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `conversation_id` VARCHAR(50) NOT NULL COMMENT '会话ID(拼接)',
  `sender_id` BIGINT UNSIGNED NOT NULL,
  `receiver_id` BIGINT UNSIGNED DEFAULT NULL COMMENT '接收者(群聊为NULL)',
  `type` ENUM('text','image','voice','system') DEFAULT 'text',
  `content` TEXT COMMENT '消息内容',
  `imageUrl` VARCHAR(500) DEFAULT '' COMMENT '图片地址',
  `voiceUrl` VARCHAR(500) DEFAULT '' COMMENT '语音地址',
  `voiceDuration` INT DEFAULT 0 COMMENT '语音时长(秒)',
  `relatedCarpool_id` BIGINT UNSIGNED DEFAULT NULL COMMENT '关联拼车ID',
  `isRead` TINYINT(1) DEFAULT 0,
  `readAt` DATETIME DEFAULT NULL,
  `isRecalled` TINYINT(1) DEFAULT 0,
  `createTime` DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_conversation` (`conversation_id`),
  KEY `idx_sender` (`sender_id`),
  KEY `idx_receiver` (`receiver_id`),
  KEY `idx_read` (`isRead`),
  KEY `idx_conv_time` (`conversation_id`, `createTime` DESC),
  KEY `idx_receiver_read` (`receiver_id`, `isRead`, `createTime` DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='消息表';

-- -----------------------------------------------------------
-- 7. 通知表
-- -----------------------------------------------------------
DROP TABLE IF EXISTS `notifications`;
CREATE TABLE `notifications` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `recipient_id` BIGINT UNSIGNED NOT NULL COMMENT '接收者',
  `sender_id` BIGINT UNSIGNED DEFAULT NULL COMMENT '发送者',
  `sender_nickName` VARCHAR(100) DEFAULT '' COMMENT '发送者昵称快照',
  `sender_avatarUrl` VARCHAR(500) DEFAULT '' COMMENT '发送者头像快照',
  `type` ENUM('new_message','new_participant','participant_left','carpool_cancelled',
              'carpool_ended','new_review','credit_change','system') NOT NULL,
  `title` VARCHAR(200) DEFAULT '',
  `content` TEXT,
  `priority` ENUM('low','normal','high','urgent') DEFAULT 'normal',
  `isRead` TINYINT(1) DEFAULT 0,
  `isDeleted` TINYINT(1) DEFAULT 0,
  `relatedCarpool_id` BIGINT UNSIGNED DEFAULT NULL,
  `relatedUser_id` BIGINT UNSIGNED DEFAULT NULL,
  `relatedReview_id` BIGINT UNSIGNED DEFAULT NULL,
  `extraData` JSON DEFAULT NULL,
  `createTime` DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_recipient` (`recipient_id`),
  KEY `idx_type` (`type`),
  KEY `idx_read` (`isRead`),
  KEY `idx_recipient_read` (`recipient_id`, `isRead`, `createTime` DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='通知表';

-- -----------------------------------------------------------
-- 8. 评价表
-- -----------------------------------------------------------
DROP TABLE IF EXISTS `reviews`;
CREATE TABLE `reviews` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `reviewer_id` BIGINT UNSIGNED NOT NULL COMMENT '评价者',
  `reviewer_nickName` VARCHAR(100) DEFAULT '',
  `reviewer_avatarUrl` VARCHAR(500) DEFAULT '',
  `targetUser_id` BIGINT UNSIGNED NOT NULL COMMENT '被评价者',
  `carpool_id` BIGINT UNSIGNED NOT NULL COMMENT '关联拼车',
  `rating` TINYINT NOT NULL COMMENT '评分(1-5)',
  `content` VARCHAR(1000) DEFAULT '' COMMENT '评价内容',
  `tags` JSON DEFAULT NULL COMMENT '评价标签数组',
  `reviewType` ENUM('driver','passenger') DEFAULT 'passenger',
  `isAnonymous` TINYINT(1) DEFAULT 0,
  `isReported` TINYINT(1) DEFAULT 0,
  `createTime` DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_reviewer` (`reviewer_id`),
  KEY `idx_target` (`targetUser_id`),
  KEY `idx_carpool` (`carpool_id`),
  KEY `idx_rating` (`rating`),
  KEY `idx_target_rating` (`targetUser_id`, `rating`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='评价表';

-- -----------------------------------------------------------
-- 9. 投诉表
-- -----------------------------------------------------------
DROP TABLE IF EXISTS `complaints`;
CREATE TABLE `complaints` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `complainant_id` BIGINT UNSIGNED NOT NULL COMMENT '投诉人',
  `complainant_nickName` VARCHAR(100) DEFAULT '',
  `complainant_avatarUrl` VARCHAR(500) DEFAULT '',
  `complainant_phone` VARCHAR(20) DEFAULT '',
  `complainant_creditScore` INT DEFAULT 100,
  `targetType` ENUM('user','carpool','review','message') NOT NULL,
  `targetUser_id` BIGINT UNSIGNED DEFAULT NULL COMMENT '被投诉用户',
  `targetUser_nickName` VARCHAR(100) DEFAULT '',
  `targetUser_avatarUrl` VARCHAR(500) DEFAULT '',
  `targetUser_phone` VARCHAR(20) DEFAULT '',
  `targetCarpool_id` BIGINT UNSIGNED DEFAULT NULL,
  `targetReview_id` BIGINT UNSIGNED DEFAULT NULL,
  `targetMessage_id` BIGINT UNSIGNED DEFAULT NULL,
  `category` VARCHAR(50) NOT NULL COMMENT '投诉类型',
  `title` VARCHAR(200) NOT NULL,
  `content` TEXT NOT NULL,
  `evidence` JSON DEFAULT NULL COMMENT '证据图片数组',
  `severity` ENUM('low','medium','high','urgent') DEFAULT 'medium',
  `status` ENUM('pending','investigating','verified','rejected','warning',
                'penalized','banned','resolved','closed') DEFAULT 'pending',
  `isAnonymous` TINYINT(1) DEFAULT 0,
  `handler_id` BIGINT UNSIGNED DEFAULT NULL COMMENT '处理人',
  `handlerNote` VARCHAR(1000) DEFAULT '',
  `resolution` VARCHAR(1000) DEFAULT '',
  `penalty_type` ENUM('none','warning','credit_deduct','temp_ban','permanent_ban') DEFAULT 'none',
  `penalty_creditDeduct` INT DEFAULT 0,
  `penalty_banDuration` INT DEFAULT 0 COMMENT '封禁天数',
  `penalty_banStartAt` DATETIME DEFAULT NULL,
  `penalty_banEndAt` DATETIME DEFAULT NULL,
  `penalty_reason` VARCHAR(500) DEFAULT '',
  `appeal_content` VARCHAR(1000) DEFAULT '',
  `appeal_evidence` JSON DEFAULT NULL,
  `appeal_submittedAt` DATETIME DEFAULT NULL,
  `appeal_reviewedAt` DATETIME DEFAULT NULL,
  `appeal_result` ENUM('pending','approved','rejected') DEFAULT 'pending',
  `appeal_resultNote` VARCHAR(500) DEFAULT '',
  `createTime` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updateTime` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_complainant` (`complainant_id`),
  KEY `idx_status` (`status`),
  KEY `idx_create` (`createTime`),
  KEY `idx_target_user` (`targetUser_id`, `status`),
  KEY `idx_target_carpool` (`targetCarpool_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='投诉表';

-- -----------------------------------------------------------
-- 10. 投诉时间线表
-- -----------------------------------------------------------
DROP TABLE IF EXISTS `complaint_timeline`;
CREATE TABLE `complaint_timeline` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `complaint_id` BIGINT UNSIGNED NOT NULL,
  `action` VARCHAR(50) NOT NULL COMMENT '操作类型',
  `operator_id` BIGINT UNSIGNED DEFAULT NULL COMMENT '操作人',
  `operatorName` VARCHAR(100) DEFAULT '' COMMENT '操作人名称快照',
  `note` VARCHAR(1000) DEFAULT '',
  `createdAt` DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_complaint` (`complaint_id`, `createdAt`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='投诉时间线表';

-- -----------------------------------------------------------
-- 11. 反馈表
-- -----------------------------------------------------------
DROP TABLE IF EXISTS `feedbacks`;
CREATE TABLE `feedbacks` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` BIGINT UNSIGNED NOT NULL,
  `user_nickName` VARCHAR(100) DEFAULT '',
  `user_avatarUrl` VARCHAR(500) DEFAULT '',
  `user_phone` VARCHAR(20) DEFAULT '',
  `category` VARCHAR(50) NOT NULL COMMENT '反馈类型',
  `title` VARCHAR(200) NOT NULL,
  `content` TEXT NOT NULL,
  `images` JSON DEFAULT NULL,
  `relatedCarpool_id` BIGINT UNSIGNED DEFAULT NULL,
  `relatedUser_id` BIGINT UNSIGNED DEFAULT NULL,
  `pagePath` VARCHAR(200) DEFAULT '' COMMENT '来源页面',
  `platform` VARCHAR(20) DEFAULT '',
  `device_system` VARCHAR(20) DEFAULT '',
  `device_brand` VARCHAR(50) DEFAULT '',
  `device_model` VARCHAR(50) DEFAULT '',
  `device_version` VARCHAR(20) DEFAULT '',
  `networkType` VARCHAR(20) DEFAULT '',
  `extraData` JSON DEFAULT NULL,
  `status` ENUM('pending','reviewing','accepted','in_progress','resolved','rejected','closed') DEFAULT 'pending',
  `priority` ENUM('low','normal','high','urgent') DEFAULT 'normal',
  `handler_id` BIGINT UNSIGNED DEFAULT NULL,
  `handlerNote` VARCHAR(1000) DEFAULT '',
  `resolveNote` VARCHAR(1000) DEFAULT '',
  `rating` TINYINT DEFAULT NULL COMMENT '用户评分(1-5)',
  `createTime` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updateTime` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_user` (`user_id`),
  KEY `idx_status` (`status`),
  KEY `idx_category` (`category`),
  KEY `idx_create` (`createTime`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='反馈表';

-- -----------------------------------------------------------
-- 12. 公告表
-- -----------------------------------------------------------
DROP TABLE IF EXISTS `announcements`;
CREATE TABLE `announcements` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `publisher_id` BIGINT UNSIGNED DEFAULT NULL,
  `publisher_nickName` VARCHAR(100) DEFAULT '系统管理员',
  `publisher_avatarUrl` VARCHAR(500) DEFAULT '',
  `type` VARCHAR(50) NOT NULL DEFAULT 'notice' COMMENT '公告类型',
  `title` VARCHAR(200) NOT NULL,
  `summary` VARCHAR(500) DEFAULT '',
  `content` TEXT NOT NULL,
  `coverImage` VARCHAR(500) DEFAULT '',
  `images` JSON DEFAULT NULL,
  `status` ENUM('draft','published','recalled','archived') DEFAULT 'published',
  `isTop` TINYINT(1) DEFAULT 0,
  `isPopup` TINYINT(1) DEFAULT 0,
  `isImportant` TINYINT(1) DEFAULT 0,
  `displayOrder` INT DEFAULT 0,
  `visibility` ENUM('all','school','role','custom') DEFAULT 'all',
  `targetSchools` JSON DEFAULT NULL,
  `targetRoles` JSON DEFAULT NULL,
  `likeCount` INT DEFAULT 0,
  `viewCount` INT DEFAULT 0,
  `readCount` INT DEFAULT 0,
  `publishTime` DATETIME DEFAULT NULL,
  `expireTime` DATETIME DEFAULT NULL,
  `tags` JSON DEFAULT NULL,
  `relatedCarpool_id` BIGINT UNSIGNED DEFAULT NULL,
  `createTime` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updateTime` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_status` (`status`),
  KEY `idx_type` (`type`),
  KEY `idx_top` (`isTop`, `displayOrder`),
  KEY `idx_publish` (`publishTime`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='公告表';

-- -----------------------------------------------------------
-- 13. 操作日志表
-- -----------------------------------------------------------
DROP TABLE IF EXISTS `operation_logs`;
CREATE TABLE `operation_logs` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `operator_id` BIGINT UNSIGNED DEFAULT NULL,
  `operatorName` VARCHAR(100) DEFAULT '',
  `operatorRole` VARCHAR(20) DEFAULT '',
  `module` VARCHAR(30) NOT NULL COMMENT '模块',
  `action` VARCHAR(50) NOT NULL COMMENT '操作类型',
  `description` VARCHAR(500) DEFAULT '',
  `detail` JSON DEFAULT NULL,
  `targetType` VARCHAR(30) DEFAULT '',
  `targetId` BIGINT UNSIGNED DEFAULT NULL,
  `targetName` VARCHAR(200) DEFAULT '',
  `ip` VARCHAR(50) DEFAULT '',
  `userAgent` VARCHAR(500) DEFAULT '',
  `method` VARCHAR(10) DEFAULT '',
  `path` VARCHAR(500) DEFAULT '',
  `result` ENUM('success','failure') DEFAULT 'success',
  `errorMessage` VARCHAR(500) DEFAULT '',
  `createTime` DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_operator` (`operator_id`),
  KEY `idx_module` (`module`),
  KEY `idx_action` (`action`),
  KEY `idx_create` (`createTime`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='操作日志表';

-- -----------------------------------------------------------
-- 14. 敏感词表
-- -----------------------------------------------------------
DROP TABLE IF EXISTS `sensitive_words`;
CREATE TABLE `sensitive_words` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `word` VARCHAR(100) NOT NULL COMMENT '敏感词',
  `level` ENUM('block','review','replace') DEFAULT 'block' COMMENT '级别: block=拦截, review=审核, replace=替换',
  `category` ENUM('abuse','spam','politics','other') DEFAULT 'other',
  `replacement` VARCHAR(100) DEFAULT '***' COMMENT '替换词',
  `enabled` TINYINT(1) DEFAULT 1,
  `createTime` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updateTime` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_word` (`word`),
  KEY `idx_category` (`category`),
  KEY `idx_enabled` (`enabled`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='敏感词表';

-- -----------------------------------------------------------
-- 15. IP 记录表
-- -----------------------------------------------------------
DROP TABLE IF EXISTS `ip_records`;
CREATE TABLE `ip_records` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `ip` VARCHAR(50) NOT NULL COMMENT 'IP 地址',
  `isBlocked` TINYINT(1) DEFAULT 0 COMMENT '是否封锁',
  `blockedAt` DATETIME DEFAULT NULL COMMENT '封锁时间',
  `blockedReason` VARCHAR(500) DEFAULT '' COMMENT '封锁原因',
  `requestCount` INT DEFAULT 0 COMMENT '请求次数',
  `registerCount` INT DEFAULT 0 COMMENT '注册次数',
  `loginCount` INT DEFAULT 0 COMMENT '登录次数',
  `riskScore` INT DEFAULT 0 COMMENT '风险评分',
  `lastRequestAt` DATETIME DEFAULT NULL COMMENT '最后请求时间',
  `lastRequestTime` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `reason` VARCHAR(500) DEFAULT '' COMMENT '封锁原因(兼容)',
  `createTime` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updateTime` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_ip` (`ip`),
  KEY `idx_blocked` (`isBlocked`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='IP 记录表';

-- -----------------------------------------------------------
-- 16. 热门路线缓存表
-- -----------------------------------------------------------
DROP TABLE IF EXISTS `hot_routes`;
CREATE TABLE `hot_routes` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `from_place` VARCHAR(200) NOT NULL COMMENT '出发地',
  `to_place` VARCHAR(200) NOT NULL COMMENT '目的地',
  `count` INT DEFAULT 0 COMMENT '拼车次数',
  `avgPrice` DECIMAL(10,2) DEFAULT 0.00 COMMENT '平均价格',
  `avgSeats` DECIMAL(5,2) DEFAULT 0.00 COMMENT '平均座位数',
  `totalParticipants` INT DEFAULT 0 COMMENT '总参与人数',
  `popularityScore` INT DEFAULT 0 COMMENT '热度分',
  `estimatedDistance` DECIMAL(10,2) DEFAULT 0.00 COMMENT '预估距离(km)',
  `estimatedDuration` INT DEFAULT 0 COMMENT '预估时长(分钟)',
  `createTime` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updateTime` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_route` (`from_place`(100), `to_place`(100)),
  KEY `idx_popularity` (`popularityScore` DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='热门路线缓存表';

-- -----------------------------------------------------------
-- 17. 每日统计表
-- -----------------------------------------------------------
DROP TABLE IF EXISTS `daily_stats`;
CREATE TABLE `daily_stats` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `statDate` DATE NOT NULL COMMENT '统计日期',
  `newUsers` INT DEFAULT 0,
  `totalUsers` INT DEFAULT 0,
  `newCarpools` INT DEFAULT 0,
  `totalCarpools` INT DEFAULT 0,
  `activeCarpools` INT DEFAULT 0,
  `joinCount` INT DEFAULT 0,
  `newComplaints` INT DEFAULT 0,
  `pendingComplaints` INT DEFAULT 0,
  `newReviews` INT DEFAULT 0,
  `avgRating` DECIMAL(3,2) DEFAULT 0.00,
  `newFeedbacks` INT DEFAULT 0,
  `createTime` DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_date` (`statDate`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='每日统计表';

SET FOREIGN_KEY_CHECKS = 1;

-- ============================================================
-- 默认数据
-- ============================================================

-- 默认超级管理员 (默认账号: admin / 默认密码: Admin@123456，bcrypt 哈希，上线后请立即修改)
INSERT INTO `admins` (`username`, `password`, `nickName`, `role`, `permissions`, `status`)
VALUES ('admin', '$2b$14$r.TLELUilWRvrB.eC6oWj.jf0rmYPtTxLssjyh5TyRiYbs8oQmTYa', '超级管理员', 'super_admin', '["*"]', 'active')
ON DUPLICATE KEY UPDATE `username` = `username`;

-- ============================================================
-- 索引说明:
-- idx_conv_time: 会话列表按时间排序查询
-- idx_receiver_read: 未读消息计数 (WHERE receiver_id=? AND is_read=0)
-- idx_target_user: 按被投诉人查投诉
-- idx_target_carpool: 按拼车查投诉
-- idx_recipient_read: 未读通知计数
-- idx_target_rating: 按被评价人聚合评分
-- idx_geo: 经纬度范围查询(附近拼车)
-- ============================================================

-- ============================================================
-- sms_codes: 短信验证码存储（持久化，避免 PM2 重启丢失）
-- ============================================================
CREATE TABLE IF NOT EXISTS `sms_codes` (
  `phone` VARCHAR(20) PRIMARY KEY COMMENT '手机号',
  `code` VARCHAR(10) NOT NULL COMMENT '验证码',
  `expire_at` DATETIME NOT NULL COMMENT '过期时间',
  `send_at` DATETIME NOT NULL COMMENT '发送时间',
  INDEX `idx_expire` (`expire_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='短信验证码';

-- ============================================================
-- contact_messages: 联系作者留言
-- ============================================================
CREATE TABLE IF NOT EXISTS `contact_messages` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` BIGINT UNSIGNED DEFAULT NULL COMMENT '留言用户ID(未登录为NULL)',
  `user_nickName` VARCHAR(100) DEFAULT '' COMMENT '昵称',
  `user_avatarUrl` VARCHAR(500) DEFAULT '' COMMENT '头像',
  `contact` VARCHAR(100) DEFAULT '' COMMENT '联系方式(QQ/微信/手机)',
  `content` TEXT NOT NULL COMMENT '留言内容',
  `is_read` TINYINT(1) DEFAULT 0 COMMENT '是否已读',
  `reply` TEXT DEFAULT NULL COMMENT '作者回复',
  `replied_at` DATETIME DEFAULT NULL COMMENT '回复时间',
  `createTime` DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_user` (`user_id`),
  KEY `idx_read` (`is_read`),
  KEY `idx_create` (`createTime`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='联系作者留言表';

-- 2) 模块帖子系统（10 模块统一存储）
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

-- 3) 食堂管理系统
-- ============================================================
-- 食堂管理系统建表脚本
-- 包含：食堂表、档口表、用户评价表
-- ============================================================
SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- 食堂表
DROP TABLE IF EXISTS `canteens`;
CREATE TABLE `canteens` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(100) NOT NULL COMMENT '食堂名称',
  `name_key` VARCHAR(50) NOT NULL COMMENT '标识: first/second/third',
  `floor` VARCHAR(50) DEFAULT '' COMMENT '楼层',
  `sort_order` INT DEFAULT 0 COMMENT '排序',
  `is_active` TINYINT(1) DEFAULT 1,
  `createTime` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updateTime` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_key` (`name_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='食堂';

-- 档口表
DROP TABLE IF EXISTS `canteen_stalls`;
CREATE TABLE `canteen_stalls` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `canteen_id` BIGINT UNSIGNED NOT NULL COMMENT '所属食堂ID',
  `name` VARCHAR(200) NOT NULL COMMENT '档口/店铺名称',
  `category` VARCHAR(50) DEFAULT '' COMMENT '品类: rice/noodle/bread/malatang/buffet/snack',
  `description` TEXT COMMENT '简介描述',
  `price_range` VARCHAR(50) DEFAULT '' COMMENT '价格区间',
  `rating` DECIMAL(2,1) DEFAULT 0 COMMENT '综合评分',
  `rating_count` INT DEFAULT 0 COMMENT '评价人数',
  `cover_image` VARCHAR(500) DEFAULT '' COMMENT '封面图URL',
  `tags` TEXT COMMENT '标签,逗号分隔',
  `location_desc` VARCHAR(200) DEFAULT '' COMMENT '位置描述',
  `business_hours` VARCHAR(100) DEFAULT '' COMMENT '营业时间',
  `is_featured` TINYINT(1) DEFAULT 0,
  `recommend_count` INT DEFAULT 0,
  `sort_order` INT DEFAULT 0,
  `is_active` TINYINT(1) DEFAULT 1,
  `createTime` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updateTime` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_canteen` (`canteen_id`),
  KEY `idx_category` (`category`),
  KEY `idx_active` (`is_active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='档口';

-- 用户评价表
DROP TABLE IF EXISTS `stall_reviews`;
CREATE TABLE `stall_reviews` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `stall_id` BIGINT UNSIGNED NOT NULL COMMENT '档口ID',
  `user_id` BIGINT UNSIGNED NOT NULL COMMENT '评价用户ID',
  `rating` TINYINT NOT NULL COMMENT '评分 1-5 (1=拉完了 2=NPC 3=人上人 4=顶级 5=夯)',
  `content` TEXT COMMENT '评价内容',
  `createTime` DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_stall` (`stall_id`),
  KEY `idx_user` (`user_id`),
  UNIQUE KEY `uk_user_stall` (`user_id`, `stall_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='档口评价';

SET FOREIGN_KEY_CHECKS = 1;

-- ============================================================
-- 种子数据：示例大学三大食堂
-- ============================================================
INSERT INTO `canteens` (`name`, `name_key`, `floor`, `sort_order`) VALUES
('第一食堂','first','一楼',1),
('第二食堂','second','二楼',2),
('第三食堂','third','三楼',3);

-- 档口种子数据
INSERT INTO `canteen_stalls` (`canteen_id`, `name`, `category`, `description`, `price_range`, `tags`, `location_desc`, `is_featured`, `recommend_count`, `sort_order`) VALUES
(1,'确食佳·安格斯肥牛滑蛋饭','rice','安格斯肥牛搭配嫩滑蛋，酱汁浓郁超下饭','12-16','招牌,必吃,人气王','一楼东侧',1,587,1),
(1,'鱼你在一起·酸菜鱼','rice','活鱼现片的酸菜鱼，酸辣鲜香','13-18','招牌,热门','一楼东侧',0,432,2),
(1,'杨国福麻辣烫','malatang','自选称重麻辣烫，汤底浓郁','10-20','连锁,人气','一楼中段',1,345,3),
(1,'张亮麻辣烫','malatang','经典麻辣烫，汤底可喝','10-20','连锁','一楼中段',0,312,4),
(1,'烘焙达人·西点坊','bread','现烤面包蛋糕，下午茶必备','4-12','甜品,下午茶','一楼西侧',0,267,5),
(1,'川魂·冒菜','rice','正宗四川冒菜，麻辣鲜香','13-18','川味,辣','一楼东侧',0,298,6),
(1,'陕西人家','noodle','biangbiang面、肉夹馍、凉皮，地道陕西味','8-15','面食,西北','一楼西侧',0,376,7),
(1,'原味汤粉王','noodle','清淡鲜美汤粉系列，健康暖胃','7-12','清淡,早餐','一楼西侧',0,198,8),
(1,'吉祥馄饨','noodle','大个馄饨，多种馅料选择','8-14','面食,经典','一楼西侧',0,234,9),
(1,'正新鸡排','snack','经典炸鸡排、烤串，课间解馋','6-12','小吃,炸物','一楼入口',0,456,10),
(1,'煎饼果子·杂粮煎饼','snack','现做煎饼果子，加蛋加肠加辣条','5-10','早餐,小吃','一楼入口',1,389,11),
(1,'水果捞·鲜切水果','snack','新鲜水果现切现卖，酸奶果捞','5-15','健康,甜品','一楼西侧',0,167,12),

(2,'嗨族拌面·爆肚面','noodle','秘制爆肚搭配劲道拌面','10-18','面食,招牌,辣','二楼东侧',1,678,1),
(2,'螺蛳粉先生','noodle','正宗柳州螺蛳粉，酸笋够味','9-15','特色,网红','二楼东侧',1,543,2),
(2,'麻辣拌·麻辣香锅','malatang','自选麻辣拌/麻辣香锅，想吃什么夹什么','10-22','自选,辣','二楼中段',0,432,3),
(2,'川天椒麻辣烫','malatang','经典川味麻辣烫','10-20','连锁','二楼中段',0,376,4),
(2,'饼大王','bread','酱香饼、鸡蛋灌饼、手抓饼、馅饼','3-8','面点,早餐','二楼西侧',0,289,5),
(2,'武大郎烧饼','bread','特色烧饼，加肠加蛋加肉','4-8','特色,小吃','二楼西侧',0,234,6),
(2,'花甲粉·锡纸烧','snack','锡纸花甲粉、金针菇、娃娃菜','8-15','特色,夜宵','二楼入口',0,345,7),
(2,'铁板厨房','rice','铁板炒饭、铁板意面、铁板鸡排','12-18','热门','二楼东侧',0,398,8),
(2,'过桥米线','noodle','正宗过桥米线，汤鲜料足','10-16','经典','二楼东侧',0,312,9),
(2,'麻辣诱惑','rice','麻辣香锅、麻辣烤鱼，适合聚餐','12-25','辣,聚餐','二楼中段',0,267,10),
(2,'黄焖鸡米饭','rice','经典黄焖鸡，汁浓味香','10-16','经典,米饭','二楼东侧',0,432,11),

(3,'汉堡小子','bread','现做汉堡、薯条、炸鸡，西式简餐','8-20','西式,快餐','三楼东侧',0,345,1),
(3,'麻辣香锅·烤鱼','malatang','自选麻辣香锅，烤鱼双人套餐','12-30','聚餐,辣','三楼中段',1,456,2),
(3,'自选快餐·每日特价','buffet','每日多道菜品自选，一荤两素、两荤一素','8-14','家常,实惠','三楼中段',1,678,3),
(3,'大叔便当','rice','日式便当系列，咖喱鸡排饭、照烧鸡腿饭','12-16','日式,热门','三楼东侧',0,543,4),
(3,'麻辣串串香','malatang','自选串串，荤素搭配，麻辣鲜香','8-18','特色,辣','三楼中段',0,312,5),
(3,'烤鱼·纸上烤鱼','rice','纸上烤鱼鲜嫩多汁，多人聚餐首选','18-32','聚餐,热门','三楼中段',0,267,6),
(3,'炒饭王','rice','蛋炒饭、扬州炒饭、叉烧炒饭','8-14','快手,经典','三楼东侧',1,398,7),
(3,'关东煮·串串','snack','热腾腾关东煮，各种丸子串串','3-10','小吃,暖身','三楼入口',0,234,8),
(3,'凉皮·凉面','noodle','夏天必备凉皮凉面，清爽开胃','6-12','季节,清爽','三楼西侧',0,189,9),
(3,'滋补烩面','noodle','羊肉烩面、牛肉面，汤底熬制数小时','10-16','面食,经典','三楼西侧',0,287,10),
(3,'炒酸奶·冰淇淋','snack','现做炒酸奶、冰淇淋，饭后甜点','6-12','甜品,夏天','三楼入口',0,156,11);

-- 4) 地图 POI 坐标
-- 地图地标坐标表
-- 用于在小程序地图中动态管理 POI 坐标，无需改前端代码

CREATE TABLE IF NOT EXISTS map_pois (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  name        VARCHAR(100)  NOT NULL COMMENT '地标名称',
  u           INT           NOT NULL COMMENT 'X 像素坐标',
  v           INT           NOT NULL COMMENT 'Y 像素坐标',
  category    VARCHAR(20)   NOT NULL DEFAULT 'campus' COMMENT '分类: campus=校园地标, dorm=宿舍楼号',
  sort_order  INT           NOT NULL DEFAULT 0 COMMENT '排序权重',
  is_visible  TINYINT(1)    NOT NULL DEFAULT 1 COMMENT '是否显示',
  created_at  TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_category (category),
  INDEX idx_visible (is_visible)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='地图地标坐标';

-- ===== 种子数据：校园地标 (category=campus) =====
INSERT INTO map_pois (name, u, v, category, sort_order) VALUES
  ('1图书馆', 1474, 1584, 'campus', 1),
  ('4科研楼', 1749, 1600, 'campus', 2),
  ('6综合服务中心', 1161, 1937, 'campus', 3),
  ('5会议服务中心', 1580, 1942, 'campus', 4),
  ('4研究生部', 1639, 1751, 'campus', 5),
  ('42创新创业中心', 1971, 1693, 'campus', 6),
  ('太极广场', 2335, 1906, 'campus', 7),
  ('44留学生公寓', 2483, 1980, 'campus', 8),
  ('43建筑与艺术学院', 2466, 1747, 'campus', 9),
  ('第四社区', 2389, 1379, 'campus', 10),
  ('39园林与生态工程学院', 2104, 1311, 'campus', 11),
  ('38生命与食品工程学院', 1951, 1308, 'campus', 12),
  ('37医学院', 1945, 1253, 'campus', 13),
  ('36数理学院', 1947, 1168, 'campus', 14),
  ('28水工结构管', 1933, 964, 'campus', 15),
  ('26水利水电学院', 1927, 1074, 'campus', 16),
  ('27水院水利馆', 1874, 1006, 'campus', 17),
  ('25土木工程学院', 1757, 1065, 'campus', 18),
  ('24能源与环境工程学院', 1716, 961, 'campus', 19),
  ('第三社区', 1991, 849, 'campus', 20),
  ('第三食堂', 2172, 1024, 'campus', 21),
  ('第三操场', 2343, 1042, 'campus', 22),
  ('基础二', 1759, 1371, 'campus', 23),
  ('南门', 1418, 2027, 'campus', 24),
  ('基础一', 1104, 1366, 'campus', 25),
  ('17地球科学与工程学院', 1069, 1204, 'campus', 26),
  ('18矿测学院', 1132, 1117, 'campus', 27),
  ('19材料科学与工程学院', 1149, 1062, 'campus', 28),
  ('16信电学院', 881, 1124, 'campus', 29),
  ('管商学院', 660, 1419, 'campus', 30),
  ('15机械与装备工程学院', 763, 1228, 'campus', 31),
  ('第二社区', 1004, 928, 'campus', 32),
  ('第一社区', 570, 1089, 'campus', 33),
  ('第一操场', 269, 1462, 'campus', 34),
  ('体育中心', 329, 1653, 'campus', 35),
  ('马克思主义学院', 646, 1361, 'campus', 36),
  ('9体育与健康工程学院', 694, 1460, 'campus', 37),
  ('成人教育学院', 663, 1311, 'campus', 38),
  ('10文法学院', 785, 1321, 'campus', 39),
  ('西门', 219, 1287, 'campus', 40),
  ('东门', 2604, 1512, 'campus', 41),
  ('第一食堂', 499, 1225, 'campus', 42),
  ('第二食堂', 926, 1007, 'campus', 43),
  ('8体育综合馆', 428, 1397, 'campus', 44),
  ('景观湖', 1375, 1162, 'campus', 45),
  ('情人坡', 1491, 804, 'campus', 46),
  ('32第一后勤服务楼', 2150, 814, 'campus', 47),
  ('33校医院', 2160, 877, 'campus', 48);

-- ===== 种子数据：宿舍楼号 (category=dorm) =====
INSERT INTO map_pois (name, u, v, category, sort_order) VALUES
  ('A楼', 541, 991, 'dorm', 1),
  ('B楼', 450, 1021, 'dorm', 2),
  ('C楼', 419, 1062, 'dorm', 3),
  ('D楼', 388, 1112, 'dorm', 4),
  ('E楼', 347, 1202, 'dorm', 5),
  ('F楼', 651, 1031, 'dorm', 6),
  ('A楼', 867, 866, 'dorm', 7),
  ('B楼', 1006, 831, 'dorm', 8),
  ('C楼', 1136, 820, 'dorm', 9),
  ('D楼', 938, 898, 'dorm', 10),
  ('E楼', 1095, 935, 'dorm', 11),
  ('A楼', 1854, 822, 'dorm', 12),
  ('B楼', 2009, 821, 'dorm', 13),
  ('C楼', 1937, 822, 'dorm', 14),
  ('A楼', 2278, 1166, 'dorm', 15),
  ('B楼', 2300, 1282, 'dorm', 16),
  ('C楼', 2400, 1146, 'dorm', 17),
  ('D楼', 2462, 1299, 'dorm', 18),
  ('E楼', 2360, 1404, 'dorm', 19),
  ('F楼', 2487, 1405, 'dorm', 20),
  ('G楼', 2508, 1460, 'dorm', 21),
  ('H楼', 2376, 1465, 'dorm', 22);

-- 5) 树洞（Treehole）
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

-- 6) 新模块：校园黄页 / 题库 / 图鉴 / 成就
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

-- 7) 种子数据（通用演示数据）
-- ============================================================
-- 1. 校园黄页
-- ========================
INSERT INTO yellowpages (name, category, phone, fax, email, location, description, sort_order) VALUES
('学校办公室','党政机构','0000-0000000','','office@example.edu.cn','行政楼','示例数据，请替换为本校实际信息',1),
('教务处','教学机构','0000-0000000','','academic@example.edu.cn','行政楼','本科教学、学籍与考试管理',1),
('学生工作处','学生事务','0000-0000000','','student@example.edu.cn','学生服务中心','学生事务与校园服务',1),
('后勤服务中心','后勤保障','0000-0000000','','','后勤楼','餐饮、公寓与维修服务',1),
('图书馆','教辅单位','0000-0000000','','','图书馆','借阅、检索与学习空间服务',1),
('国际交流处','国际交流','0000-0000000','','','行政楼','国际合作与交流项目',1),
('校医院','附属单位','0000-0000000','','','校医院','校内基础医疗与健康服务',1);

-- ========================
-- 2. 校园题库
-- ========================
INSERT INTO `questionbanks` (`name`, `category`, `course`, `year`, `question_count`, `sort_order`) VALUES
('高等数学（上）期末真题','高数','高等数学','2025',28,1),
('线性代数期中试题','高数','线性代数','2025',20,2),
('大学英语四级真题','英语','综合英语','2024',35,3),
('六级翻译专项','英语','综合英语','2024',15,4),
('马克思主义基本原理','思政','马原','2025',25,5),
('思想道德与法治','思政','思修','2025',22,6),
('数据结构期末试卷','专业课','数据结构','2025',18,7),
('计算机网络复习题','专业课','计网','2024',30,8);

-- ========================
-- 3. 图鉴分类
-- ========================
INSERT INTO `guide_categories` (`category_key`, `name`, `tag`, `description`, `color`, `color_light`, `sort_order`) VALUES
('landmarks','校园地标','校园记忆','校园南门、图书馆、校园湖……校园的每一处角落','#FF9500','#FFB347',1),
('organizations','社团组织','组织一览','学生会、融媒体、机器人团队……找到你的归属','#AF52DE','#D98CF0',2),
('animals','动物图鉴','萌宠集合','校园湖的鹅、校园各处的小毛孩们','#30D158','#6EE890',3),
('plants','植物图鉴','绿植百科','认识校园里每一棵树、每一朵花','#5EB864','#8FD990',4),
('awards','任职评优','荣誉体系','学生干部、奖学金、荣誉称号全指南','#FF6B35','#FF9A70',5),
('certificates','证书图鉴','考证百科','四六级、计算机、教资……大学必考证书一览','#0A84FF','#5EAFFF',6),
('limited','限定图鉴','季节限定','银杏金黄、海棠花开、雪景……错过等一年的美景','#FF375F','#FF7A90',7);

-- ========================
-- 4. 图鉴条目
-- ========================
INSERT INTO `guide_items` (`category_key`, `name`, `description`, `emoji`, `icon`, `sort_order`) VALUES

-- 校园地标 (12)
('landmarks','校园南门','大学路1号新校区南大门，校园第一地标。门前泰山石与迎客松庄重大气，每个本校学生的入学合影首选。','🚪','/images/guide-icons/00.png',1),
('landmarks','校名石','南门广场的校名石，刻有「示例大学」字样；请替换为本校实际介绍。','🪨','/images/guide-icons/01.png',2),
('landmarks','图书馆','校园主要图书馆，提供阅览、自习与数字资源服务；请替换为本校实际介绍。','📚','/images/guide-icons/02.png',3),
('landmarks','建筑艺术博物馆','校藏瑰宝，3000平方米展陈空间，藏品1700余件，北朝人面瓦当等珍贵文物在此展出。','🏛️','/images/guide-icons/03.png',4),
('landmarks','体育馆','因造型酷似鸟巢而得名，校园标志性体育建筑。篮球馆、羽毛球场、乒乓球场地一应俱全。','🏟️','/images/guide-icons/04.png',5),
('landmarks','三大餐厅','第一餐厅、第二餐厅、第三餐厅各具特色，各地美食琳琅满目，舌尖上的工程大从此开始。','🍽️','/images/guide-icons/05.png',6),
('landmarks','学生公寓','标准四人间，上床下桌布局，空调电扇一应俱全。温馨小窝里装着四年青春。','🏠','/images/guide-icons/06.png',7),
('landmarks','校园湖','校园北部湖光水景，湖中养有黑天鹅和白天鹅、可爱的小鸭子。日落时分波光粼粼，校园最治愈的角落。','🦢','/images/guide-icons/07.png',8),
('landmarks','景观湖','校园内另一处水景，春夏绿意盎然，秋日芦苇随风飘摇，冬日白雪披身。一湖清水润校园。','🏞️','/images/guide-icons/08.png',9),
('landmarks','情人坡','位于校园高坡之处，可俯瞰校园全景。观日升赏日落，读书野餐漫步谈天的好去处。','🌸','/images/guide-icons/09.png',10),
('landmarks','主教学楼','校园核心建筑，阶梯教室与多媒体教室分布其中，铃声响起时人潮涌动的景象最是壮观。','🏫','/images/guide-icons/10.png',11),
('landmarks','运动场','15.5万平方米运动场地！篮球馆2座、田径场4块、足球场35块、篮球场30块……挥洒汗水的圣地。','🏃','/images/guide-icons/11.png',12),

-- 社团组织 (60)
('organizations','校学生会','','🏛️','/images/guide-icons/12.png',1),
('organizations','校研究生会','','🎓','/images/guide-icons/13.png',2),
('organizations','大学生社团联合会','','🤝','/images/guide-icons/14.png',3),
('organizations','大学生青年志愿者协会','','❤️','/images/guide-icons/15.png',4),
('organizations','大学生科学技术协会','','🔬','/images/guide-icons/16.png',5),
('organizations','大学生服务保障中心','','🛎️','/images/guide-icons/17.png',6),
('organizations','大学生女生联合会','','🌸','/images/guide-icons/18.png',7),
('organizations','大学生融媒体中心','','📸','/images/guide-icons/19.png',8),
('organizations','UPRE机器人团队','','🤖','/images/guide-icons/20.png',9),
('organizations','习近平新时代中国特色社会主义思想研究会','','📖','/images/guide-icons/21.png',10),
('organizations','马克思主义理论研学社','','📕','/images/guide-icons/22.png',11),
('organizations','稷下学社','','💭','/images/guide-icons/23.png',12),
('organizations','旗帜社','','🚩','/images/guide-icons/12.png',13),
('organizations','心理家园协会','','🧠','/images/guide-icons/13.png',14),
('organizations','新时代·诵经典·青马学社','','📜','/images/guide-icons/14.png',15),
('organizations','数学建模协会','','🔢','/images/guide-icons/15.png',16),
('organizations','3D协会','','🖨️','/images/guide-icons/16.png',17),
('organizations','机器人协会','','⚙️','/images/guide-icons/17.png',18),
('organizations','互联网创新创业协会','','🌐','/images/guide-icons/18.png',19),
('organizations','TRIZ发明与创新协会','','💡','/images/guide-icons/19.png',20),
('organizations','凌云车队','','🏎️','/images/guide-icons/20.png',21),
('organizations','创新航模协会','','✈️','/images/guide-icons/21.png',22),
('organizations','GIS社团','','🗺️','/images/guide-icons/22.png',23),
('organizations','工程导航社','','🧭','/images/guide-icons/23.png',24),
('organizations','学生家园','','🌳','/images/guide-icons/12.png',25),
('organizations','大学生书画社','','🖌️','/images/guide-icons/13.png',26),
('organizations','剧锋艺术团','','🎭','/images/guide-icons/14.png',27),
('organizations','齐艺艺术社','','🎵','/images/guide-icons/15.png',28),
('organizations','大学生艺术团','','🎨','/images/guide-icons/16.png',29),
('organizations','声音吉他协会','','🎸','/images/guide-icons/17.png',30),
('organizations','新欣交谊舞协会','','💃','/images/guide-icons/18.png',31),
('organizations','Earth Power街舞社','','🕺','/images/guide-icons/19.png',32),
('organizations','漫画社','','🎨','/images/guide-icons/20.png',33),
('organizations','馨语相声社','','🎤','/images/guide-icons/21.png',34),
('organizations','红学研究协会','','📚','/images/guide-icons/22.png',35),
('organizations','校英语协会','','🔤','/images/guide-icons/23.png',36),
('organizations','匠心创意艺术社','','✂️','/images/guide-icons/12.png',37),
('organizations','传统杨氏太极拳协会','','🥋','/images/guide-icons/13.png',38),
('organizations','乒羽社','','🏸','/images/guide-icons/14.png',39),
('organizations','羽毛球协会','','🏸','/images/guide-icons/15.png',40),
('organizations','龙魂台球社','','🎱','/images/guide-icons/16.png',41),
('organizations','跆拳道协会','','🥋','/images/guide-icons/17.png',42),
('organizations','大学生电子竞技协会','','🎮','/images/guide-icons/18.png',43),
('organizations','HUOE桌游协会','','🎲','/images/guide-icons/19.png',44),
('organizations','KY曳舞团','','🏃','/images/guide-icons/20.png',45),
('organizations','「一米阳光」关爱儿童协会','','☀️','/images/guide-icons/21.png',46),
('organizations','红十字彩生活志愿服务队','','➕','/images/guide-icons/22.png',47),
('organizations','爱心协会','','💝','/images/guide-icons/23.png',48),
('organizations','轻尘义工协会','','🌿','/images/guide-icons/12.png',49),
('organizations','心语手语社','','🤟','/images/guide-icons/13.png',50),
('organizations','绿化树环保协会','','🌲','/images/guide-icons/14.png',51),
('organizations','大学生心理健康协会','','💚','/images/guide-icons/15.png',52),
('organizations','引领食尚','','🍳','/images/guide-icons/16.png',53),
('organizations','校学风建设委员会','','📋','/images/guide-icons/17.png',54),
('organizations','温馨家园建设委员会','','🏡','/images/guide-icons/18.png',55),
('organizations','OTC推理社','','🔍','/images/guide-icons/19.png',56),
('organizations','「自由人」摄影协会','','📷','/images/guide-icons/20.png',57),
('organizations','治城学社','','🏙️','/images/guide-icons/21.png',58),
('organizations','新媒体中心','','📱','/images/guide-icons/22.png',59),
('organizations','逸风航模协会','','🚀','/images/guide-icons/23.png',60),

-- 动物图鉴 (12)
('animals','校园橘猫「大橘」','','🐱','/images/guide-icons/24.png',1),
('animals','校园湖黑天鹅','','🦢','/images/guide-icons/25.png',2),
('animals','校园湖白天鹅','','🦢','/images/guide-icons/26.png',3),
('animals','校园湖鸭群','','🦆','/images/guide-icons/27.png',4),
('animals','校园流浪猫群','','🐱','/images/guide-icons/28.png',5),
('animals','流浪猫「亮亮」','','🐱','/images/guide-icons/29.png',6),
('animals','校园流浪狗','','🐶','/images/guide-icons/30.png',7),
('animals','鉴湖锦鲤','','🐟','/images/guide-icons/31.png',8),
('animals','鉴湖鹅鸭','','🦢','/images/guide-icons/32.png',9),
('animals','校园麻雀','','🐦','/images/guide-icons/33.png',10),
('animals','校园灰喜鹊','','🐦','/images/guide-icons/34.png',11),
('animals','校园湖蛙类','','🐸','/images/guide-icons/35.png',12),

-- 植物图鉴 (20)
('plants','银杏','校园秋日名片！落叶大乔木，扇形叶片秋季变为金黄。教学区广场周围种植，秋天金黄大道是朋友圈摄影大赛主场。','🍂','/images/guide-icons/36.png',1),
('plants','法国梧桐','校园行道树主力军！落叶乔木，树皮灰绿色，叶掌状3~5裂。夏季提供良好遮阴，是绿色廊道的主要树种。','🌳','/images/guide-icons/37.png',2),
('plants','垂柳','校园湖畔杨柳依依垂，道旁鲜花欣欣迎。春天新叶嫩绿如丝，很有诗意。湖边最常见的景观树。','🌿','/images/guide-icons/38.png',3),
('plants','雪松','位于主教前面旗杆附近，常绿乔木，原产喜马拉雅山脉。树形优美，是黎巴嫩国树，常用于草坪或建筑物两侧列植。','🌲','/images/guide-icons/39.png',4),
('plants','海棠','教学区广场周围种植的观赏性乔木。春日粉白花朵缀满枝头，是校园春天最浪漫的打卡点。','🌺','/images/guide-icons/40.png',5),
('plants','月季','教学区乔木下配置的花草，形成美丽的立体林荫道。花色丰富，花期长，从春到秋持续绽放。','🌹','/images/guide-icons/41.png',6),
('plants','紫薇','小乔木或灌木，花期6~9月，又称「百日红」。树干愈老愈光滑，用手抚摸全株会微微颤动，故别名「痒痒树」。','🌸','/images/guide-icons/42.png',7),
('plants','红叶李','广场周边、中央草坪种植，独特的紫红色叶色一年四季都很美丽。群植成片构成风景林，美化效果远超单纯绿色林。','🍃','/images/guide-icons/43.png',8),
('plants','迎春','落叶灌木，冬末至早春先花后叶，花色金黄。配置在湖边、溪畔、桥头、墙隅，是校园春天的第一抹亮色。','🌼','/images/guide-icons/44.png',9),
('plants','龙柏','教学区广场种植的观赏性乔木，枝叶繁茂，树形优美。常用于草坪或建筑物两侧成排列状分布。','🌲','/images/guide-icons/45.png',10),
('plants','榆叶梅','教学区广场周围种植的观赏性乔木，春季开花，花朵娇艳。为校园增添丰富的色彩层次。','🌸','/images/guide-icons/46.png',11),
('plants','桂花','生活区上层乔木之一，秋季开花，香气扑鼻。丹桂飘香时节，整个生活区都弥漫着甜蜜的香味。','🌼','/images/guide-icons/47.png',12),
('plants','丁香','生活区下层灌木，春季开花，紫色/白色花序优雅芬芳。与桂花、银杏等形成复层群落。','💜','/images/guide-icons/48.png',13),
('plants','白玉兰','春季花木树种，白色花朵洁白如玉。教学区配置烘托春色，开花时满树银花，蔚为壮观。','🤍','/images/guide-icons/49.png',14),
('plants','元宝枫','秋色叶树种，秋季叶片变红。与银杏搭配，金黄配火红，是校园秋天最绚烂的色彩组合。','🍁','/images/guide-icons/36.png',15),
('plants','国槐','中国传统园林树种，落叶乔木，树冠广卵形。示例市地处示例省，国槐是本地常见行道树和庭荫树。','🌳','/images/guide-icons/37.png',16),
('plants','杨树','北方常见树种，耐干旱性能好。树干纹路像眼睛的形状，春季飘柳絮也是校园一景。','🌳','/images/guide-icons/38.png',17),
('plants','石榴','夏季花木树种，花色火红艳丽。教学区配置的观赏植物，花开时节为校园增添热情。','🔴','/images/guide-icons/39.png',18),
('plants','常春藤','蔓生植物，沿校园建筑或篱笆生长，增加绿意和美感。生活区墙面立体绿化的主力。','🌱','/images/guide-icons/40.png',19),
('plants','爬山虎','蔓生植物，覆盖在教学楼墙面上，秋天叶子变红。整面墙的红色爬山虎是校园另一道风景线。','🌿','/images/guide-icons/41.png',20),

-- 任职评优 (28)
('awards','班长/团支书','班级核心干部，负责日常管理与团组织工作。锻炼领导力的第一站。','👑','/images/guide-icons/50.png',1),
('awards','班级委员','学习委员、生活委员、文体委员等班委职务，班级运转的中坚力量。','📋','/images/guide-icons/51.png',2),
('awards','校/院学生会干事','学生会活动部、宣传部等部门成员，校园活动的策划者与执行者。','🏢','/images/guide-icons/52.png',3),
('awards','学生会部长','学生会部长级，统筹部门工作与活动策划，学生组织的中层骨干。','📊','/images/guide-icons/53.png',4),
('awards','学生会主席团','经选拔产生，全面统筹学生会工作。学生组织的最高学生管理岗位。','⭐','/images/guide-icons/54.png',5),
('awards','团委干部','校/院团委组织部、宣传部等干部岗位，思想政治工作的核心力量。','🔴','/images/guide-icons/55.png',6),
('awards','社团负责人','65个社团社长/会长，社团文化节百余场活动的组织者。','🎪','/images/guide-icons/56.png',7),
('awards','社联干部','社团联合会成员，统筹管理全校社团事务。','🤝','/images/guide-icons/57.png',8),
('awards','志愿服务骨干','志愿服务组织骨干，「小青橙」志愿者协会的核心成员。','❤️','/images/guide-icons/58.png',9),
('awards','班委联席会代表','学院班委联席会成员，参与学生事务决策。','🗣️','/images/guide-icons/59.png',10),
('awards','宿舍长','宿舍负责人，管理宿舍日常事务。最小的「官」，最贴近生活的责任。','🏠','/images/guide-icons/60.png',11),
('awards','教学信息员','协助教务处收集教学反馈信息，学生与教务之间的桥梁。','📝','/images/guide-icons/61.png',12),
('awards','国家奖学金','8000元，教育部下达指标，大学期间最高荣誉。每一分钱都是实力的证明。','💰','/images/guide-icons/50.png',13),
('awards','国家励志奖学金','5000元，面向家庭经济困难优秀学生。逆境中的光芒，格外耀眼。','🌟','/images/guide-icons/51.png',14),
('awards','校长奖学金','3000元，比例仅1‰，素质测评专业第一优先。全校最稀缺的奖学金之一。','🎓','/images/guide-icons/52.png',15),
('awards','一等优秀学生奖学金','1500元，比例5%。每个专业前几名才能拿到，期末周的终极动力。','🥇','/images/guide-icons/53.png',16),
('awards','二等优秀学生奖学金','1000元，比例10%。优秀是一种习惯，这笔奖学金是最好的证明。','🥈','/images/guide-icons/54.png',17),
('awards','三等优秀学生奖学金','500元，比例15%。虽然金额不多，但也是对一学期努力的肯定。','🥉','/images/guide-icons/55.png',18),
('awards','特殊贡献奖学金','2000元，为学校做出突出贡献或赢得特殊荣誉。不是每个人都能拿，但拿了一定很酷。','🏆','/images/guide-icons/56.png',19),
('awards','企业奖学金','由合作企业设立的社会奖学金，不同专业有不同的企业赞助。','🏛️','/images/guide-icons/57.png',20),
('awards','省级奖学金','示例省政府奖学金等省级奖励，站在全省舞台上与优秀者同行。','⭐','/images/guide-icons/58.png',21),
('awards','三好学生标兵','获校长/一等奖学金者授予，「三好」中的最高荣誉。','🏅','/images/guide-icons/59.png',22),
('awards','三好学生','获二三等奖学金者授予，德智体全面发展的象征。','🎖️','/images/guide-icons/60.png',23),
('awards','优秀学生干部','素质测评优良的班团干部，比例不超过5%。既要学习好，又要工作好。','📈','/images/guide-icons/61.png',24),
('awards','优秀毕业生','校级/省级优秀毕业生称号，求职简历上最闪亮的一行。','🎓','/images/guide-icons/50.png',25),
('awards','自强之星','中国大学生自强之星，校已有3名同学获此殊荣。困境中不屈不挠的最好证明。','💪','/images/guide-icons/51.png',26),
('awards','徐芝纶力学奖','全国徐芝纶力学优秀学生奖，校首次获得。力学界的「奥斯卡」。','📐','/images/guide-icons/52.png',27),
('awards','基层就业卓越奖','毕业生基层就业卓越奖学金，校首次获得。到祖国最需要的地方去。','🏔️','/images/guide-icons/53.png',28),

-- 证书图鉴 (18)
('certificates','CET-4','大学英语四级，425分及以上通过。大学毕业的基本门槛，也是考研求职的标配。','📖','/images/guide-icons/62.png',1),
('certificates','CET-6','大学英语六级，425分及以上通过。比四级更难的挑战，简历上的加分项。','📕','/images/guide-icons/63.png',2),
('certificates','计算机二级','全国计算机等级考试二级。Office、C语言、Python……选一个你擅长的。','💻','/images/guide-icons/64.png',3),
('certificates','计算机三级','全国计算机等级考试三级。比二级更专业，技术党的进阶之路。','🖥️','/images/guide-icons/65.png',4),
('certificates','普通话等级','普通话水平测试，二级乙等及以上。想当老师的同学必考。','🗣️','/images/guide-icons/66.png',5),
('certificates','教师资格证','中小学教师资格考试合格证明。师范生和非师范生都可以考，多一条路多一个选择。','👩‍🏫','/images/guide-icons/67.png',6),
('certificates','注册测绘师','测绘工程专业对应执业资格。校园测绘专业的金字招牌。','📐','/images/guide-icons/68.png',7),
('certificates','建造师','一级/二级建造师，土木工程、工程管理专业。工地上的「通行证」。','🏗️','/images/guide-icons/69.png',8),
('certificates','土木工程师','注册土木工程师/结构工程师。校园土木工程专业的终极目标之一。','🏢','/images/guide-icons/62.png',9),
('certificates','水利水电工程师','水利水电工程专业对应执业资格。校园拥有水利工程博士学位授权点！','💧','/images/guide-icons/63.png',10),
('certificates','注册建筑师','一级/二级注册建筑师，建筑学专业。会画图会设计，还要会考试。','🏛️','/images/guide-icons/64.png',11),
('certificates','安全工程师','注册安全工程师，安全工程专业。安全生产的守护者。','🦺','/images/guide-icons/65.png',12),
('certificates','岩土工程师','注册岩土工程师，地质工程专业。跟石头打交道的最高认证。','🪨','/images/guide-icons/66.png',13),
('certificates','医师资格证','临床医学专业对应执业医师资格。校园医学院的学生，这条路上要走的路很长。','⚕️','/images/guide-icons/67.png',14),
('certificates','初级会计','会计学专业，初级会计职称。财会人职业生涯的第一步。','🧮','/images/guide-icons/68.png',15),
('certificates','银行从业','银行业专业人员职业资格考试。想进银行工作的敲门砖。','🏦','/images/guide-icons/69.png',16),
('certificates','软考证书','软件设计师、系统分析师等软考。程序员的技术认证阶梯。','⚡','/images/guide-icons/62.png',17),
('certificates','驾驶证','机动车驾驶证（C1/C2等）。大学期间最实用的证书之一，没之一。','🚗','/images/guide-icons/63.png',18),

-- 限定图鉴 (12)
('limited','银杏金黄大道（秋季限定）','每年10月下旬至11月中旬，银杏叶全部变黄，铺满整条道路。错过等一年，校园秋天最壮观的限时打卡点。','🍂','/images/guide-icons/70.png',1),
('limited','海棠花开（春季限定）','每年3-4月，教学区广场的海棠花竞相绽放。粉白花朵缀满枝头，花期短暂但惊艳，是春天的限定礼物。','🌺','/images/guide-icons/71.png',2),
('limited','景观湖芦苇荡（秋季限定）','秋天的景观湖芦苇随风飘摇，银白色芦花如雪。藏在芦苇丛后的小径很少有人经过，适合一个人散步发呆。','🌾','/images/guide-icons/00.png',3),
('limited','校园湖天鹅幼崽（春夏限定）','春夏季节，校园湖的黑白天鹅偶尔会繁育后代。毛茸茸的小天鹅跟在大天鹅身后学游泳，这是限定版治愈画面。','🦢','/images/guide-icons/01.png',4),
('limited','冬日雪景（冬季限定）','雪后的校园银装素裹，景观湖白雪披身，教学楼屋顶积雪如毯。北方校园的冬天虽冷，但雪景值得每一个南方同学尖叫。','❄️','/images/guide-icons/02.png',5),
('limited','迎春初绽（早春限定）','冬末春初，校园角落里的迎春花率先绽放。金黄色小花在寒风中摇曳，是校园一年中最早的一抹亮色。','🌼','/images/guide-icons/03.png',6),
('limited','期末图书馆排队（期末限定）','期末周清晨，图书馆门口排起长队，开馆瞬间百米冲刺。示例省最大图书馆的限定名场面，经历过的都懂。','🏃','/images/guide-icons/04.png',7),
('limited','桂花飘香（秋季限定）','秋天生活区的桂花盛开，空气里弥漫着甜蜜的香味。从桂花树下走过，衣服都会沾上淡淡的香气。','🌼','/images/guide-icons/05.png',8),
('limited','白玉兰满树（春季限定）','早春时节，教学区的白玉兰一夜间全部绽放。满树银花如鸽子停落枝头，纯净而短暂，一阵风雨便落满一地。','🤍','/images/guide-icons/06.png',9),
('limited','元宝枫红叶（深秋限定）','深秋的元宝枫叶片变红，与金黄的银杏交相辉映。一黄一红，是校园秋天最绚烂的色彩组合，持续不到两周。','🍁','/images/guide-icons/07.png',10),
('limited','新生军训（九月限定）','九月开学季，操场上迷彩方阵齐步走。口号声、军歌声回荡校园，是每个本校学生入学第一课的限定记忆。','🪖','/images/guide-icons/08.png',11),
('limited','毕业季跳蚤市场（六月限定）','六月毕业季，毕业生在宿舍楼下摆摊卖旧物。课本、台灯、收纳箱……每件物品都带着四年的故事。','🎓','/images/guide-icons/09.png',12);

-- ========================
-- 5. 成就赛道定义
-- ========================
INSERT INTO `achievement_tracks` (`track_key`, `name`, `theme`, `icon`, `icon_img`, `description`, `sort_order`) VALUES
('leadership','学生干部','leadership','👔','/images/guide-icons/12.png','学生组织任职经历',1),
('certificate','证书考证','certificate','📜','/images/guide-icons/62.png','各类资格证书认证',2),
('academic','学业成绩','academic','📚','/images/guide-icons/04.png','课程成绩与学业表现',3),
('competition','竞赛荣誉','competition','🏅','/images/guide-icons/52.png','学科竞赛获奖经历',4);

-- ========================
-- 6. 成就项定义
-- ========================
INSERT INTO `achievement_items` (`track_key`, `item_key`, `name`, `description`, `icon`, `sort_order`) VALUES
('leadership','class-leader','班长/团支书','班级核心干部，负责日常管理与团组织工作','data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0OCIgaGVpZ2h0PSI0OCIgdmlld0JveD0iMCAwIDQ4IDQ4IiBmaWxsPSJub25lIiBzdHJva2U9IiNFNjdFMjIiIHN0cm9rZS13aWR0aD0iMS44IiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiPjxjaXJjbGUgY3g9IjI0IiBjeT0iMTUiIHI9IjYiLz48cGF0aCBkPSJNMTQgMzhjMC01LjUgNC41LTEwIDEwLTEwczEwIDQuNSAxMCAxMCIvPjxwYXRoIGQ9Ik0xOCAyNmwtMyA1TTMwIDI2bDMgNSIvPjwvc3ZnPg==',1),
('leadership','class-committee','班级委员','学习委员、生活委员、文体委员等班委职务','data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0OCIgaGVpZ2h0PSI0OCIgdmlld0JveD0iMCAwIDQ4IDQ4IiBmaWxsPSJub25lIiBzdHJva2U9IiNFNjdFMjIiIHN0cm9rZS13aWR0aD0iMS44IiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiPjxyZWN0IHg9IjgiIHk9IjEyIiB3aWR0aD0iMzIiIGhlaWdodD0iMjQiIHJ4PSIzIi8+PHBhdGggZD0iTTggMjBoMzJNMTYgMTJ2LTNNMzIgMTJ2LTNNMTQgMjhoNk0xNCAzMmgxME0yOCAyOGg2Ii8+PC9zdmc+',2),
('leadership','student-union','校/院学生会干事','学生会活动部、宣传部等部门成员','data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0OCIgaGVpZ2h0PSI0OCIgdmlld0JveD0iMCAwIDQ4IDQ4IiBmaWxsPSJub25lIiBzdHJva2U9IiNFNjdFMjIiIHN0cm9rZS13aWR0aD0iMS44IiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiPjxwYXRoIGQ9Ik0xMiAzOFYyMGwxMi04IDEyIDh2MTgiLz48cGF0aCBkPSJNMTggMzhWMjZoMTJ2MTJNMjQgMTJ2LTQiLz48cGF0aCBkPSJNMTAgMjJsMTQtMTAgMTQgMTAiLz48L3N2Zz4=',3),

('certificate','cet-4','CET-4','大学英语四级，425分及以上通过','data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0OCIgaGVpZ2h0PSI0OCIgdmlld0JveD0iMCAwIDQ4IDQ4IiBmaWxsPSJub25lIiBzdHJva2U9IiNFNjdFMjIiIHN0cm9rZS13aWR0aD0iMS44IiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiPjxjaXJjbGUgY3g9IjI0IiBjeT0iMTUiIHI9IjYiLz48cGF0aCBkPSJNMTQgMzhjMC01LjUgNC41LTEwIDEwLTEwczEwIDQuNSAxMCAxMCIvPjxwYXRoIGQ9Ik0xOCAyNmwtMyA1TTMwIDI2bDMgNSIvPjwvc3ZnPg==',1),
('certificate','cet-6','CET-6','大学英语六级，425分及以上通过','data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0OCIgaGVpZ2h0PSI0OCIgdmlld0JveD0iMCAwIDQ4IDQ4IiBmaWxsPSJub25lIiBzdHJva2U9IiNFNjdFMjIiIHN0cm9rZS13aWR0aD0iMS44IiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiPjxyZWN0IHg9IjgiIHk9IjEyIiB3aWR0aD0iMzIiIGhlaWdodD0iMjQiIHJ4PSIzIi8+PHBhdGggZD0iTTggMjBoMzJNMTYgMTJ2LTNNMzIgMTJ2LTNNMTQgMjhoNk0xNCAzMmgxME0yOCAyOGg2Ii8+PC9zdmc+',2),
('certificate','computer-level2','计算机二级','全国计算机等级考试二级','data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0OCIgaGVpZ2h0PSI0OCIgdmlld0JveD0iMCAwIDQ4IDQ4IiBmaWxsPSJub25lIiBzdHJva2U9IiNFNjdFMjIiIHN0cm9rZS13aWR0aD0iMS44IiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiPjxwYXRoIGQ9Ik0xMiAzOFYyMGwxMi04IDEyIDh2MTgiLz48cGF0aCBkPSJNMTggMzhWMjZoMTJ2MTJNMjQgMTJ2LTQiLz48cGF0aCBkPSJNMTAgMjJsMTQtMTAgMTQgMTAiLz48L3N2Zz4=',3),

('academic','gpa-top10','综合测评前10%','素质综合测评优秀等级','data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0OCIgaGVpZ2h0PSI0OCIgdmlld0JveD0iMCAwIDQ4IDQ4IiBmaWxsPSJub25lIiBzdHJva2U9IiNFNjdFMjIiIHN0cm9rZS13aWR0aD0iMS44IiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiPjxwYXRoIGQ9Ik0xMiAzOFYyMGwxMi04IDEyIDh2MTgiLz48cGF0aCBkPSJNMTggMzhWMjRoMTJ2MTRNMjQgMTJ2LTQiLz48Y2lyY2xlIGN4PSIyNCIgY3k9IjMwIiByPSIyLjUiIGZpbGw9IiNFNjdFMjIiIHN0cm9rZT0ibm9uZSIvPjxwYXRoIGQ9Ik0xMCAyMmwxNC0xMCAxNCAxMCIvPjwvc3ZnPg==',1),
('academic','gpa-top30','综合测评前30%','素质综合测评良好等级','data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0OCIgaGVpZ2h0PSI0OCIgdmlld0JveD0iMCAwIDQ4IDQ4IiBmaWxsPSJub25lIiBzdHJva2U9IiNFNjdFMjIiIHN0cm9rZS13aWR0aD0iMS44IiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiPjxwYXRoIGQ9Ik0xMiAzOFYyMGwxMi04IDEyIDh2MTgiLz48cGF0aCBkPSJNMTggMzhWMjRoMTJ2MTRNMjQgMTJ2LTQiLz48Y2lyY2xlIGN4PSIyNCIgY3k9IjI5IiByPSIzIi8+PC9zdmc+',2),
('academic','scholarship-national','国家奖学金','8000元，教育部下达指标，最高荣誉','data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0OCIgaGVpZ2h0PSI0OCIgdmlld0JveD0iMCAwIDQ4IDQ4IiBmaWxsPSJub25lIiBzdHJva2U9IiNFNjdFMjIiIHN0cm9rZS13aWR0aD0iMS44IiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiPjxjaXJjbGUgY3g9IjI0IiBjeT0iMTUiIHI9IjYiLz48cGF0aCBkPSJNMTQgMzhjMC01LjUgNC41LTEwIDEwLTEwczEwIDQuNSAxMCAxMCIvPjxwYXRoIGQ9Ik0xOCAyNmwtMyA1TTMwIDI2bDMgNSIvPjwvc3ZnPg==',3),

('competition','contest-school','校级竞赛','校级学科竞赛获奖','data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0OCIgaGVpZ2h0PSI0OCIgdmlld0JveD0iMCAwIDQ4IDQ4IiBmaWxsPSJub25lIiBzdHJva2U9IiNFNjdFMjIiIHN0cm9rZS13aWR0aD0iMS44IiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiPjxyZWN0IHg9IjgiIHk9IjEyIiB3aWR0aD0iMzIiIGhlaWdodD0iMjQiIHJ4PSIzIi8+PHBhdGggZD0iTTggMjBoMzJNMTYgMTJ2LTNNMzIgMTJ2LTNNMTQgMjhoNk0xNCAzMmgxME0yOCAyOGg2Ii8+PC9zdmc+',1),
('competition','contest-province','省级竞赛','示例省赛区竞赛获奖','data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0OCIgaGVpZ2h0PSI0OCIgdmlld0JveD0iMCAwIDQ4IDQ4IiBmaWxsPSJub25lIiBzdHJva2U9IiNFNjdFMjIiIHN0cm9rZS13aWR0aD0iMS44IiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiPjxwYXRoIGQ9Ik0xMiAzOFYyMGwxMi04IDEyIDh2MTgiLz48cGF0aCBkPSJNMTggMzhWMjZoMTJ2MTJNMjQgMTJ2LTQiLz48cGF0aCBkPSJNMTAgMjJsMTQtMTAgMTQgMTAiLz48L3N2Zz4=',2),
('competition','contest-national','国家级竞赛','全国总决赛获奖','data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0OCIgaGVpZ2h0PSI0OCIgdmlld0JveD0iMCAwIDQ4IDQ4IiBmaWxsPSJub25lIiBzdHJva2U9IiNFNjdFMjIiIHN0cm9rZS13aWR0aD0iMS44IiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiPjxwYXRoIGQ9Ik0xMiAzOFYyMGwxMi04IDEyIDh2MTgiLz48cGF0aCBkPSJNMTggMzhWMjRoMTJ2MTRNMjQgMTJ2LTQiLz48Y2lyY2xlIGN4PSIyNCIgY3k9IjMwIiByPSIyLjUiIGZpbGw9IiNFNjdFMjIiIHN0cm9rZT0ibm9uZSIvPjxwYXRoIGQ9Ik0xMCAyMmwxNC0xMCAxNCAxMCIvPjwvc3ZnPg==',3);

SET FOREIGN_KEY_CHECKS = 1;
