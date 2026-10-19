# 校园信息服务平台

> 校园综合服务平台 v2.0 — 以拼车出行为核心，扩展 12 个校园生活模块

**线上地址**：[https://app.suyu.ink](https://app.suyu.ink)

---

## 功能特性

### 核心功能：拼车出行
- 发布拼车信息（出发地/目的地/时间/人数/费用）
- 浏览同行大厅，搜索、筛选拼车信息
- 申请加入拼车、管理同行成员
- 拼车完成后互相评价（信用分机制）
- 热门路线推荐、出行偏好（抽烟/听歌/聊天/安静/宠物/行李）

### 12 个综合服务模块
| 模块 | 标识 | 说明 |
|------|------|------|
| 快递代取 | express | 代拿快递、代寄快递 |
| 悬赏任务 | task | 找人帮忙、悬赏代办 |
| 失物招领 | lost | 拾到/丢失物品发布 |
| 校园论坛 | forum | 校园话题讨论交流 |
| 二手交易 | secondhand | 二手物品买卖 |
| 闲置租赁 | rental | 物品租借/短租 |
| 代课代跑 | substitute | 代课、代跑腿 |
| 打印服务 | print | 打印/复印代办 |
| 校园黄页 | yellowpage | 校园服务电话本 |
| 公告板 | bulletin | 活动公告/通知 |
| 公益捐赠 | charity | 闲置物品捐赠 |
| 树洞 | treehole | 匿名倾诉 |

### 用户系统
- 微信一键登录 / 手机号验证码登录 / 密码登录
- 个人资料管理（头像、昵称、学校、院系、年级、学号）
- 信用分机制（初始 100 分，发布+5、参与+2、好评+3、差评-5、爽约-10）
- 实时私信聊天、群聊（基于拼车）
- 投诉/反馈/联系我们

### 管理后台
- 数据概览仪表盘
- 用户管理（搜索、封禁、解封）
- 拼车管理、公告管理、帖子管理
- 投诉处理、反馈管理、评价管理
- 聊天记录查看、操作日志
- IP 风控、敏感词管理

---

## 技术栈

| 层级 | 技术 | 版本 |
|------|------|------|
| 后端框架 | Node.js + Express.js | 4.x |
| 数据库 | MySQL | 5.7+ |
| 数据库驱动 | mysql2 (promise) | 3.x |
| 认证 | JWT (jsonwebtoken + bcryptjs) | 9.x |
| 前端平台 | 微信小程序原生框架 | WXML + WXSS |
| H5 前端 | 单文件 HTML/CSS/JS SPA | — |
| 管理后台 | 原生 HTML/CSS/JS SPA | ES Modules |
| 部署 | PM2 + Nginx 反向代理 | — |
| 服务器 | 阿里云 ECS | CentOS |
| SSL | Let's Encrypt (certbot) | — |

### 后端依赖
| 包名 | 用途 |
|------|------|
| express | Web 框架 |
| mysql2 | MySQL 连接池 |
| jsonwebtoken | JWT 签发与验证 |
| bcryptjs | 密码哈希 |
| multer | 文件上传 |
| helmet | 安全头 |
| cors | 跨域 |
| morgan | 请求日志 |
| express-rate-limit | API 限流 |
| express-validator | 参数校验 |
| axios | HTTP 客户端（微信 API） |
| dayjs | 日期处理 |
| dotenv | 环境变量 |

---

## 项目结构

```
app.suyu.ink/
├── README.md                         # 本文档
├── DEPLOY.md                         # 部署指南
├── 小程序修改工作流程.md               # 小程序修改参考（可喂给 AI）
│
├── backend/                          # 后端服务
│   ├── .env                          # 环境变量（开发环境，勿提交 Git）
│   ├── .env.example                  # 环境变量模板
│   ├── .gitignore
│   ├── package.json                  # npm 依赖
│   ├── package-lock.json
│   ├── schema.sql                    # MySQL 建表脚本（18 张核心表）
│   ├── schema-module.sql            # 模块系统建表脚本（3 张模块表）
│   │
│   ├── admin/                        # 管理后台 SPA
│   │   ├── index.html                # 主页面（登录 + 15 个功能模块）
│   │   ├── app.js                    # 入口 JS
│   │   ├── api.js                    # API 封装
│   │   ├── styles.css                # 样式
│   │   ├── utils.js                  # 工具函数
│   │   └── modules/                  # 功能模块（13 个）
│   │       ├── dashboard.js          # 数据概览
│   │       ├── users.js              # 用户管理
│   │       ├── carpools.js           # 拼车管理
│   │       ├── announcements.js      # 公告管理
│   │       ├── complaints.js         # 投诉处理
│   │       ├── feedback.js           # 反馈管理
│   │       ├── reviews.js            # 评价管理
│   │       ├── messages.js           # 聊天管理
│   │       ├── modulePosts.js        # 模块帖子管理
│   │       ├── contact.js            # 留言管理
│   │       ├── stats.js              # 数据统计
│   │       ├── ipmanage.js           # IP 风控 + 敏感词
│   │       ├── admins.js             # 管理员管理
│   │       └── logs.js               # 操作日志
│   │
│   ├── public/
│   │   └── h5/
│   │       └── index.html            # H5 移动端前端（单文件 ~1150 行）
│   │
│   ├── uploads/                      # 用户上传文件目录
│   │
│   └── src/                          # 后端源代码
│       ├── app.js                    # Express 主入口
│       ├── config/
│       │   └── db.js                 # MySQL 连接池配置（最大 20 连接）
│       ├── middleware/
│       │   ├── auth.js               # JWT 认证中间件
│       │   ├── adminAuth.js          # 管理员认证 + 权限 + 操作日志
│       │   ├── errorHandler.js       # 全局错误处理
│       │   └── privacy.js            # 隐私脱敏 + 敏感词 + 频率限制
│       ├── models/                   # 数据模型（19 个，纯 SQL 查询）
│       │   ├── index.js              # 模型统一导出
│       │   ├── mysql.js              # 基础查询工具
│       │   ├── User.js               # 用户模型
│       │   ├── Admin.js              # 管理员模型
│       │   ├── Carpool.js            # 拼车模型
│       │   ├── Message.js            # 消息模型
│       │   ├── Notification.js       # 通知模型
│       │   ├── Review.js             # 评价模型
│       │   ├── Complaint.js          # 投诉模型
│       │   ├── Feedback.js           # 反馈模型
│       │   ├── Announcement.js       # 公告模型
│       │   ├── Favorite.js           # 收藏模型
│       │   ├── SensitiveWord.js      # 敏感词模型
│       │   ├── IpRecord.js           # IP 记录模型
│       │   ├── HotRoute.js           # 热门路线模型
│       │   ├── DailyStat.js          # 每日统计模型
│       │   ├── OperationLog.js       # 操作日志模型
│       │   ├── ContactMessage.js     # 联系我们消息模型
│       │   ├── ModulePost.js         # 模块帖子模型
│       │   └── Remark.js             # 备注模型
│       ├── controllers/              # 控制器（业务逻辑，14 个）
│       │   ├── authController.js     # 认证（微信/手机号/验证码登录）
│       │   ├── userController.js     # 用户（资料/搜索/统计/信用分）
│       │   ├── carpoolController.js  # 拼车 CRUD + 加入/退出/收藏
│       │   ├── messageController.js  # 私信/会话
│       │   ├── messageEnhancedController.js  # 在线状态/陌生人限制
│       │   ├── groupChatController.js  # 群聊
│       │   ├── notificationController.js  # 通知
│       │   ├── reviewController.js    # 评价
│       │   ├── complaintController.js # 投诉
│       │   ├── feedbackController.js  # 反馈
│       │   ├── announcementController.js # 公告
│       │   ├── contactController.js   # 联系我们
│       │   ├── moduleController.js    # 模块帖子（10 模块统一）
│       │   ├── recommendController.js # 热门推荐
│       │   └── adminController.js     # 管理后台
│       ├── routes/                   # 路由（17 个文件）
│       │   ├── auth.js, user.js, carpool.js, message.js,
│       │   ├── messageEnhanced.js, groupChat.js, notification.js,
│       │   ├── review.js, complaint.js, feedback.js,
│       │   ├── announcement.js, contact.js, module.js,
│       │   ├── recommend.js, remark.js, upload.js, admin.js
│       └── services/                 # 服务层
│           ├── dailyStats.js         # 每日统计查询
│           ├── dailyStatsJob.js      # 每日统计定时任务（每小时更新）
│           ├── ipGuard.js            # IP 风控
│           ├── sensitiveFilter.js    # 敏感词过滤
│           ├── smsProvider.js        # 短信发送（阿里云/腾讯云/Mock）
│           └── wechatNotify.js       # 微信订阅消息推送
│
├── mini-program/                     # 微信小程序
│   ├── project.config.json           # 开发者工具项目配置
│   ├── project.private.config.json   # 私有配置
│   ├── API接口文档.md                # API 接口文档
│   ├── 部署文档.md                   # 部署文档
│   ├── 隐私保护指引.txt               # 隐私保护指引
│   │
│   └── miniprogram/                  # 小程序主体
│       ├── app.js                    # 入口（登录恢复/静默刷新/未读轮询）
│       ├── app.json                  # 全局配置（48 个页面 + 自定义 tabbar）
│       ├── app.wxss                  # 全局样式
│       ├── privacy.json              # 隐私协议配置
│       ├── sitemap.json              # 站点地图
│       ├── utils/
│       │   └── api.js                # API 封装（~1125 行，完整 REST 客户端）
│       ├── custom-tab-bar/           # 自定义底部导航栏
│       ├── components/               # 复用组件
│       │   ├── hall-view/            # 同行大厅视图
│       │   ├── mine-view/            # 我的页面视图
│       │   ├── msg-view/             # 消息视图
│       │   └── publish-view/         # 发布视图
│       ├── images/                   # 图片资源
│       │   ├── default-avatar.png    # 默认头像
│       │   ├── brand-logo.png        # 品牌 Logo
│       │   ├── banner-*.jpg          # 横幅图片
│       │   └── tabbar/               # 底部导航图标（8 个 PNG）
│       └── pages/                    # 页面目录（48 个页面）
│           ├── _shared/              # 共享基础组件
│           │   ├── base.js           # 页面基类
│           │   ├── base.wxss         # 基础样式
│           │   ├── nav-bar.wxml      # 导航栏模板
│           │   └── pull-refresh.js   # 下拉刷新逻辑
│           ├── index/                # 首页（带 tabbar）
│           ├── hall/                 # 同行大厅
│           ├── carpool/              # 拼车详情
│           ├── search/               # 搜索
│           ├── publish/              # 发布拼车
│           ├── publish-center/       # 发布中心（多模块入口）
│           ├── login/                # 登录
│           ├── message/              # 消息页（通知 + 私信）
│           ├── chat/                 # 私信聊天
│           ├── group-chat/           # 群聊
│           ├── mine/                 # 我的
│           ├── profile/              # 个人资料
│           ├── profile-edit/         # 编辑资料
│           ├── favorites/            # 收藏
│           ├── notification/         # 通知列表
│           ├── complaint/            # 投诉
│           ├── feedback/             # 反馈
│           ├── review/               # 评价
│           ├── announcement/         # 公告
│           ├── recommend/            # 热门推荐
│           ├── credit/               # 信用分
│           ├── contact/              # 联系我们
│           ├── bind-phone/           # 绑定手机
│           ├── agreement/            # 用户协议
│           ├── location-picker/      # 地点选择器
│           ├── webview/              # WebView 容器
│           ├── express/              # 快递代取
│           ├── task/                 # 悬赏任务
│           ├── lost/                 # 失物招领
│           ├── forum/                # 校园论坛
│           ├── secondhand/           # 二手交易
│           ├── rental/               # 闲置租赁
│           ├── substitute/           # 代课代跑
│           ├── print/                # 打印服务
│           ├── yellowpage/           # 校园黄页
│           ├── bulletin/             # 公告板
│           ├── charity/              # 公益捐赠
│           └── treehole/             # 树洞
│
└── 方法与总结/                        # 开发参考文档
    └── 微信订阅消息通知接入指南.md
```

---

## 快速开始（本地开发）

### 前置要求
- Node.js 18+
- MySQL 5.7+
- 微信开发者工具（用于小程序调试）

### 1. 克隆项目
```bash
git clone <repo-url>
cd app.suyu.ink/backend
```

### 2. 创建数据库
```bash
mysql -u root -p < schema.sql
mysql -u root -p < schema-module.sql
```

### 3. 配置环境变量
```bash
cp .env.example .env
# 编辑 .env 填入你的数据库密码和微信小程序 AppID/Secret
```

### 4. 启动后端
```bash
npm install
npm run dev    # nodemon 热重载
# 或
npm start      # 生产模式
```

服务运行在 `http://localhost:3000`

### 5. 小程序开发
```bash
# 用微信开发者工具打开 mini-program/ 目录
# 确保 project.config.json 中 appid 正确
# 需要将 API_BASE 指向本地后端（修改 miniprogram/utils/api.js）
```

### 6. 管理后台
浏览器访问 `http://localhost:3000/admin`

---

## API 概览

所有 API 前缀：`/api`

| 路由 | 说明 | 认证 |
|------|------|------|
| `/api/auth` | 登录/注册/Token | 部分 |
| `/api/user` | 用户资料/搜索/统计 | JWT |
| `/api/carpools` | 拼车 CRUD | JWT |
| `/api/messages` | 私信/群聊 | JWT |
| `/api/messages/enhanced` | 在线状态/消息增强 | JWT |
| `/api/notifications` | 通知列表/已读 | JWT |
| `/api/reviews` | 评价 | JWT |
| `/api/upload` | 文件上传 | JWT |
| `/api/feedback` | 反馈 | JWT |
| `/api/announcements` | 公告 | 部分 |
| `/api/complaints` | 投诉 | JWT |
| `/api/recommend` | 热门推荐 | 无 |
| `/api/contact` | 联系我们 | 无 |
| `/api/module` | 模块帖子（10 模块统一） | JWT |
| `/api/remarks` | 备注 | JWT |
| `/api/admin` | 管理后台（所有管理功能） | 管理员 |
| `/api/health` | 健康检查 | 无 |

### 认证方式
```
Authorization: Bearer <JWT_TOKEN>
```

---

## 数据库

共 **21 张表**：

### 核心业务表
- `users` — 用户表（微信信息 + 信用分 + 偏好 + 统计）
- `carpools` — 拼车信息表
- `carpool_participants` — 拼车参与者关联表
- `messages` — 私信消息表
- `notifications` — 通知表
- `reviews` — 评价表
- `complaints` — 投诉表
- `complaint_timeline` — 投诉处理时间线
- `feedbacks` — 反馈表
- `announcements` — 公告表
- `favorites` — 拼车收藏表

### 模块系统表
- `module_posts` — 统一模块帖子表（10 个模块共用）
- `module_favorites` — 模块收藏表
- `module_replies` — 模块评论/回复表

### 辅助表
- `admins` — 管理员表
- `sensitive_words` — 敏感词库
- `ip_records` — IP 行为记录
- `hot_routes` — 热门路线统计
- `daily_stats` — 每日运营统计
- `operation_logs` — 管理员操作日志
- `sms_codes` — 短信验证码
- `contact_messages` — 联系我们留言

---

## 环境变量

| 变量名 | 说明 | 示例 |
|--------|------|------|
| `PORT` | 服务端口 | `3000` |
| `MYSQL_HOST` | MySQL 地址 | `127.0.0.1` |
| `MYSQL_PORT` | MySQL 端口 | `3306` |
| `MYSQL_USER` | MySQL 用户名 | `root` |
| `MYSQL_PASSWORD` | MySQL 密码 | `your_password` |
| `MYSQL_DATABASE` | MySQL 数据库名 | `campus_service` |
| `JWT_SECRET` | JWT 签名密钥 | `随机字符串` |
| `JWT_EXPIRES_IN` | Token 过期时间 | `7d` |
| `JWT_REFRESH_EXPIRES_IN` | 刷新 Token 过期 | `30d` |
| `WECHAT_APPID` | 微信小程序 AppID | `wx...` |
| `WECHAT_SECRET` | 微信小程序 Secret | — |

---

## 相关文档

- [DEPLOY.md](./DEPLOY.md) — 详细部署指南
- [小程序修改工作流程.md](./小程序修改工作流程.md) — 修改小程序的参考文档（可喂给 AI）
- [API接口文档.md](./mini-program/API接口文档.md) — API 接口详细文档
- [部署文档.md](./mini-program/部署文档.md) — 历史部署记录

---

## 许可证

内部项目，未开源
