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

-- ===== 通用演示种子数据；请按自己的校园地图坐标替换 =====
INSERT INTO map_pois (name, u, v, category, sort_order) VALUES
  ('图书馆', 1456, 1457, 'campus', 1),
  ('南门', 1456, 2050, 'campus', 2),
  ('第一教学楼', 900, 1350, 'campus', 3),
  ('学生服务中心', 2050, 1350, 'campus', 4),
  ('第一食堂', 1100, 900, 'campus', 5),
  ('运动场', 1900, 900, 'campus', 6),
  ('1号宿舍楼', 700, 700, 'dorm', 7),
  ('2号宿舍楼', 2200, 700, 'dorm', 8);
