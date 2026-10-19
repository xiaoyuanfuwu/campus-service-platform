-- ============================================================
-- 随机昵称 / 随机头像 表结构 + 种子数据
-- 用途：新用户注册时自动分配昵称与头像（免填写资料）
-- 执行：mysql -u root -p < schema-random-profile.sql
-- ============================================================

CREATE TABLE IF NOT EXISTS `random_nicknames` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `nickname` VARCHAR(100) NOT NULL COMMENT '昵称',
  `used_count` INT UNSIGNED NOT NULL DEFAULT 0 COMMENT '已被使用次数（分配时优先取次数少的，尽量不重名）',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_nickname` (`nickname`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='随机昵称池（大学生网名风格）';

CREATE TABLE IF NOT EXISTS `random_avatars` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `url` VARCHAR(500) NOT NULL COMMENT '头像地址（相对路径 /uploads/...，前端自动拼接域名）',
  `used_count` INT UNSIGNED NOT NULL DEFAULT 0 COMMENT '已被使用次数',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_url` (`url`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='随机头像池（程序生成的呆萌卡通头像）';

-- ========================
-- 昵称种子（120 个：呆萌可爱 40 + 文艺 40 + 搞怪 40）
-- ========================
INSERT INTO `random_nicknames` (`nickname`) VALUES
-- 呆萌可爱系
('芝士桃桃'),('奶盖啵啵'),('芋泥啵啵'),('草莓味的小熊'),('芒果布丁'),('椰椰拿铁'),('珍珠奶茶不加糖'),('小鹿乱撞'),
('兔兔那么可爱'),('橘猫大侠'),('柴犬修勾'),('布偶猫软软'),('企鹅摇摇晃晃'),('仓鼠囤囤'),('刺猬团子'),('考拉抱抱'),
('熊猫滚滚'),('松鼠跳跳'),('小海豚嘟嘟'),('柯基短腿基'),('麻薯团子'),('糯米年糕'),('汤圆滚滚'),('蛋挞挞'),
('泡芙小姐'),('曲奇饼干'),('马卡龙少女'),('棒棒糖超人'),('爆米花看戏'),('冰淇淋化了'),('甜筒尖尖'),('糖果超甜'),
('汽水冒泡'),('彩虹糖'),('云朵棉花糖'),('月亮软糖'),('星星果冻'),('布丁摇晃'),('奶糖大白兔'),('芝士就是力量'),
-- 文艺系
('晚风轻语'),('北巷长歌'),('南风知我意'),('山月不知心底事'),('星河入梦'),('月色温柔'),('清风徐来'),('半盏流年'),
('一纸荒年'),('时光煮雨'),('岁月缝花'),('风起时想你'),('云深不知处'),('林间有鹿'),('岛屿来信'),('落日余晖'),
('晚霞收藏家'),('银河修理员'),('月亮邮递员'),('星星收纳员'),('宇宙快递员'),('云端漫步'),('雾里看花'),('听风说梦'),
('枕边书'),('雨过天晴'),('白昼流星'),('微光城市'),('拾光者'),('麦田守望者'),('小王子与玫瑰'),('独角兽之梦'),
('向日葵的约定'),('雏菊与诗'),('春水煎茶'),('秋酿'),('冬眠的熊'),('山间清风'),('海上明月'),('长夜微光'),
-- 搞怪系
('干饭第一名'),('今天也不想早八'),('在逃早八人'),('图书馆钉子户'),('摸鱼大师'),('期末复习中勿扰'),('高数使我快乐'),('四六级一次过'),
('减肥明天开始'),('再吃一口就睡'),('网课划水选手'),('宿舍修仙中'),('外卖常驻嘉宾'),('快递代取找我'),('拼车去高铁站'),('作业写完了吗'),
('图书馆靠窗位'),('干饭不积极思想有问题'),('早八人早八魂'),('摆烂但不完全摆'),('爱学习的小饼干'),('图书馆常驻人口'),('实验报告写不完'),('挂柯南'),
('锦鲤本鲤'),('欧气满满'),('咸鱼翻身中'),('摸鱼小能手'),('干饭魂'),('奶茶续命'),('咖啡因依赖者'),('躺平选手'),
('卷王本王'),('佛系青年'),('养生朋克'),('早睡失败选手'),('熬夜冠军'),('睡眠不足但快乐'),('好想睡觉啊'),('明天开始学习');

-- ========================
-- 头像种子（30 个：scripts/generate-random-avatars.js 生成的呆萌卡通头像）
-- ========================
INSERT INTO `random_avatars` (`url`) VALUES
('/uploads/avatars/random/avatar-01.png'),('/uploads/avatars/random/avatar-02.png'),('/uploads/avatars/random/avatar-03.png'),
('/uploads/avatars/random/avatar-04.png'),('/uploads/avatars/random/avatar-05.png'),('/uploads/avatars/random/avatar-06.png'),
('/uploads/avatars/random/avatar-07.png'),('/uploads/avatars/random/avatar-08.png'),('/uploads/avatars/random/avatar-09.png'),
('/uploads/avatars/random/avatar-10.png'),('/uploads/avatars/random/avatar-11.png'),('/uploads/avatars/random/avatar-12.png'),
('/uploads/avatars/random/avatar-13.png'),('/uploads/avatars/random/avatar-14.png'),('/uploads/avatars/random/avatar-15.png'),
('/uploads/avatars/random/avatar-16.png'),('/uploads/avatars/random/avatar-17.png'),('/uploads/avatars/random/avatar-18.png'),
('/uploads/avatars/random/avatar-19.png'),('/uploads/avatars/random/avatar-20.png'),('/uploads/avatars/random/avatar-21.png'),
('/uploads/avatars/random/avatar-22.png'),('/uploads/avatars/random/avatar-23.png'),('/uploads/avatars/random/avatar-24.png'),
('/uploads/avatars/random/avatar-25.png'),('/uploads/avatars/random/avatar-26.png'),('/uploads/avatars/random/avatar-27.png'),
('/uploads/avatars/random/avatar-28.png'),('/uploads/avatars/random/avatar-29.png'),('/uploads/avatars/random/avatar-30.png');
