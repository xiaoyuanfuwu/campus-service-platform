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
