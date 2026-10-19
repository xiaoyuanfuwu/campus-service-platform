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
