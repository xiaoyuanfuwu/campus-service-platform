# 校园信息服务平台 - 后端 API 接口文档

> 基础地址: `https://app.suyu.ink/api`
> 全局限流: 15分钟内最多2000次请求
> 所有接口返回格式: `{ success: boolean, message?: string, data?: any }`

---

## 目录

- [1. 认证模块 `/api/auth`](#1-认证模块-apiauth)
- [2. 用户模块 `/api/user`](#2-用户模块-apiuser)
- [3. 拼车模块 `/api/carpools`](#3-拼车模块-apicarpools)
- [4. 消息模块 `/api/messages`](#4-消息模块-apimessages)
- [5. 消息增强模块 `/api/messages/enhanced`](#5-消息增强模块-apimessagesenhanced)
- [6. 通知模块 `/api/notifications`](#6-通知模块-apinotifications)
- [7. 评价模块 `/api/reviews`](#7-评价模块-apireviews)
- [8. 公告模块 `/api/announcements`](#8-公告模块-apiannouncements)
- [9. 投诉模块 `/api/complaints`](#9-投诉模块-apicomplaints)
- [10. 反馈模块 `/api/feedback`](#10-反馈模块-apifeedback)
- [11. 推荐模块 `/api/recommend`](#11-推荐模块-apirecommend)
- [12. 文件上传模块 `/api/upload`](#12-文件上传模块-apiupload)
- [13. 管理后台模块 `/api/admin`](#13-管理后台模块-apiadmin)
- [14. 联系我们模块 `/api/contact`](#14-联系我们模块-apicontact)
- [15. 模块帖子系统 `/api/module`](#15-模块帖子系统-apimodule)
- [16. 公共接口](#16-公共接口)
- [附录: 通用响应格式](#附录-通用响应格式)

---

## 1. 认证模块 `/api/auth`

### 1.1 微信登录

```
POST /api/auth/wechat-login
```

**请求体:**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| code | string | 是 | 微信登录 code |
| nickName | string | 否 | 用户昵称 |
| avatarUrl | string | 否 | 头像地址 |
| gender | string | 否 | 性别: `male` / `female` / `secret` |
| platform | string | 否 | 平台: `wechat` / `h5` / `ios` / `android` |
| brand | string | 否 | 手机品牌 |
| model | string | 否 | 手机型号 |
| version | string | 否 | 应用版本号 |

**响应 data:**

```json
{
  "token": "JWT Token",
  "refreshToken": "Refresh Token",
  "isNewUser": true,
  "user": {
    "_id": "用户ID",
    "nickName": "昵称",
    "avatarUrl": "头像地址",
    "gender": "secret",
    "school": "示例大学",
    "creditScore": 100,
    "status": "active",
    "createTime": "2024-01-01T00:00:00.000Z"
  }
}
```

---

### 1.2 手机号登录

```
POST /api/auth/phone-login
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| phone | string | 是 | 手机号 |
| password | string | 是 | 密码 |

---

### 1.3 注册

```
POST /api/auth/register
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| phone | string | 是 | 手机号 |
| password | string | 是 | 密码（至少6位） |
| nickName | string | 否 | 昵称 |
| school | string | 否 | 学校 |
| realName | string | 否 | 真实姓名 |
| studentId | string | 否 | 学号 |
| department | string | 否 | 院系 |
| grade | string | 否 | 年级 |
| gender | string | 否 | 性别 |

---

### 1.4 刷新 Token

```
POST /api/auth/refresh-token
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| refreshToken | string | 是 | 刷新令牌 |

---

### 1.5 退出登录

```
POST /api/auth/logout
```
**需要登录**

---

## 2. 用户模块 `/api/user`

> 所有接口需要登录: `Authorization: Bearer <token>`

### 2.1 搜索用户

```
GET /api/user/search?keyword=xxx&page=1&pageSize=20
```

### 2.2 获取个人统计

```
GET /api/user/statistics
```

返回 `tripCount`, `publishCount`, `joinCount`, `creditScore`, `goodRate` 等。

### 2.3 获取个人信息

```
GET /api/user/profile
```

### 2.4 获取指定用户公开资料

```
GET /api/user/profile/:userId
```

### 2.5 更新个人信息

```
PUT /api/user/profile
```

可更新字段: `nickName`, `avatarUrl`, `realName`, `gender`, `birthday`, `bio`, `school`, `studentId`, `department`, `grade`, `role`, `preferences`

### 2.6 绑定手机号

```
PUT /api/user/bind-phone
```

### 2.7 绑定微信

```
PUT /api/user/bind-wechat
```

### 2.8 更新信用分

```
PUT /api/user/credit
```

---

## 3. 拼车模块 `/api/carpools`

### 3.1 获取拼车列表

```
GET /api/carpools?type=find&status=active&from=示例市&to=北京&page=1&pageSize=10
```

| 参数 | 类型 | 说明 |
|------|------|------|
| type | string | `find`(找同行) / `offer`(有空位) |
| status | string | `active` / `full` / `ended` |
| from | string | 出发地（模糊匹配） |
| to | string | 目的地（模糊匹配） |
| keyword | string | 关键词搜索 |
| sortBy | string | `createTime` / `departureTime` / `price` / `remainSeats` / `creditScore` |
| page | number | 页码 |
| pageSize | number | 每页条数 |

### 3.2 获取拼车详情

```
GET /api/carpools/:id
```

返回完整拼车对象 + `isJoined`, `isCreator`, `isFavorited` 字段。

### 3.3 发布拼车

```
POST /api/carpools
```
**需要登录**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| from | string | 是 | 出发地 |
| to | string | 是 | 目的地 |
| fromDetail | string | 否 | 出发地详细信息 |
| toDetail | string | 否 | 目的地详细信息 |
| departureTime | string | 是 | 出发时间（ISO格式） |
| deadlineTime | string | 否 | 报名截止时间 |
| totalSeats | number | 是 | 总人数（1-20） |
| type | string | 是 | `find` / `offer` |
| contact | string | 是 | 联系方式 |
| contactType | string | 否 | `phone` / `wechat` / `qq` / `other` |
| note | string | 否 | 备注 |
| tags | string[] | 否 | 标签 |
| price | number | 否 | 费用（元） |
| priceNote | string | 否 | 费用说明 |
| vehicleInfo | object | 否 | 车辆信息 `{ plateNumber, brand, color }` |
| images | string[] | 否 | 图片（最多9张） |

### 3.4 更新拼车

```
PUT /api/carpools/:id
```
**需要登录**。只能更新自己发布的 `active` 状态拼车。

### 3.5 删除（取消）拼车

```
DELETE /api/carpools/:id
```
**需要登录**。可传 `{ reason: "取消原因" }`。

### 3.6 加入拼车

```
POST /api/carpools/:id/join
```
**需要登录**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| contact | string | 否 | 联系方式 |
| note | string | 否 | 备注 |

### 3.7 取消加入

```
POST /api/carpools/:id/cancel
```
**需要登录**

### 3.8 结束拼车

```
POST /api/carpools/:id/end
```
**需要登录**，仅发布者可操作。

### 3.9 收藏拼车

```
POST /api/carpools/:id/favorite
```

### 3.10 取消收藏

```
DELETE /api/carpools/:id/favorite
```

### 3.11 我发布的拼车

```
GET /api/carpools/my/published?status=active&page=1&pageSize=10
```

### 3.12 我参与的拼车

```
GET /api/carpools/my/joined?status=active&page=1&pageSize=10
```

### 3.13 我收藏的拼车

```
GET /api/carpools/my/favorites?page=1&pageSize=10
```

---

## 4. 消息模块 `/api/messages`

> 所有接口需要登录

### 4.1 获取未读消息总数

```
GET /api/messages/unread-count
```

### 4.2 获取会话列表

```
GET /api/messages/conversations
```

### 4.3 获取聊天记录

```
GET /api/messages/:conversationId?page=1&pageSize=50
```

### 4.4 发送消息

```
POST /api/messages
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| receiverId | string | 是 | 接收者用户ID |
| content | string | 是 | 消息内容 |
| type | string | 否 | `text` / `image` / `voice` |
| imageUrl | string | 否 | 图片地址 |
| voiceUrl | string | 否 | 语音地址 |
| voiceDuration | number | 否 | 语音时长（秒） |
| relatedCarpool | string | 否 | 关联拼车ID |

### 4.5 标记已读

```
PUT /api/messages/:id/read
```

### 4.6 撤回消息

```
PUT /api/messages/:id/recall
```
仅发送者可撤回，2分钟内有效。

---

## 5. 消息增强模块 `/api/messages/enhanced`

> 所有接口需要登录

### 5.1 获取会话列表（含在线状态）

```
GET /api/messages/enhanced/conversations
```

### 5.2 发送消息（含陌生人限制）

```
POST /api/messages/enhanced/send
```
限流: 每分钟最多30条。陌生人24小时内最多5条。

### 5.3 标记已读

```
PUT /api/messages/enhanced/read
```

### 5.4 获取在线用户列表

```
GET /api/messages/enhanced/online
```

### 5.5 检查陌生人状态

```
GET /api/messages/enhanced/stranger-status/:userId
```

---

## 6. 通知模块 `/api/notifications`

> 所有接口需要登录

### 6.1 获取通知列表

```
GET /api/notifications?type=system&isRead=false&page=1&pageSize=20
```

**通知类型:** `new_message` / `new_participant` / `participant_left` / `carpool_cancelled` / `carpool_ended` / `new_review` / `credit_change` / `system` / `module_new_reply` / `module_favorited` / `module_status_change`

### 6.2 获取未读通知数量

```
GET /api/notifications/unread-count
```

### 6.3 标记单条已读

```
PUT /api/notifications/:id/read
```

### 6.4 全部标记已读

```
PUT /api/notifications/read-all
```

### 6.5 删除通知

```
DELETE /api/notifications/:id
```

---

## 7. 评价模块 `/api/reviews`

> 所有接口需要登录

### 7.1 创建评价

```
POST /api/reviews
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| targetUserId | string | 是 | 被评价者 |
| carpoolId | string | 是 | 关联拼车 |
| rating | number | 是 | 评分（1-5） |
| content | string | 否 | 评价内容 |
| tags | string[] | 否 | 评价标签 |
| reviewType | string | 是 | `driver` / `passenger` |
| isAnonymous | boolean | 否 | 是否匿名 |

限制: 不能评价自己；必须参与同一拼车；每个拼车只能评价一次。

### 7.2 查看用户评价

```
GET /api/reviews/user/:userId?page=1&pageSize=20
```

### 7.3 我的评价

```
GET /api/reviews/my?page=1&pageSize=20
```

### 7.4 删除评价

```
DELETE /api/reviews/:id
```
只能删除自己发出的评价。

---

## 8. 公告模块 `/api/announcements`

### 8.1 获取公告列表（可选登录）

```
GET /api/announcements?type=notice&isTop=true&page=1&pageSize=10
```

### 8.2 获取公告详情（可选登录）

```
GET /api/announcements/:id
```

### 8.3 点赞公告（需要登录）

```
POST /api/announcements/:id/like
```

### 8.4 创建公告（管理端）

```
POST /api/announcements/admin
```
**需要登录**（⚠️ 生产环境需补充管理员认证）

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| type | string | 是 | 公告类型 |
| title | string | 是 | 标题 |
| content | string | 是 | 内容（支持富文本） |
| summary | string | 否 | 摘要 |
| coverImage | string | 否 | 封面图 |
| status | string | 否 | `draft` / `published` / `recalled` |
| isTop | boolean | 否 | 是否置顶 |
| isPopup | boolean | 否 | 是否弹窗 |
| isImportant | boolean | 否 | 是否重要 |
| publishTime | string | 否 | 发布时间 |
| expireTime | string | 否 | 过期时间 |
| tags | string[] | 否 | 标签 |

### 8.5 管理端公告列表

```
GET /api/announcements/admin/list?status=published&page=1&pageSize=20
```

### 8.6 更新公告

```
PUT /api/announcements/admin/:id
```

### 8.7 删除公告（撤回）

```
DELETE /api/announcements/admin/:id
```

---

## 9. 投诉模块 `/api/complaints`

> 所有接口需要登录

### 9.1 提交投诉

```
POST /api/complaints
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| targetType | string | 是 | `user` / `carpool` / `review` / `message` |
| targetUserId | string | 否 | 被投诉用户 |
| targetCarpoolId | string | 否 | 关联拼车 |
| category | string | 是 | 投诉类型 |
| title | string | 是 | 标题 |
| content | string | 是 | 内容 |
| evidence | string[] | 否 | 证据图片 |
| severity | string | 否 | `low` / `medium` / `high` / `urgent` |

### 9.2 我的投诉列表

```
GET /api/complaints/my?status=pending&page=1&pageSize=20
```

### 9.3 投诉详情

```
GET /api/complaints/:id
```

### 9.4 提交申诉

```
POST /api/complaints/:id/appeal
```

### 9.5 管理员投诉列表

```
GET /api/complaints/admin/list?status=pending&page=1&pageSize=20
```

### 9.6 处理投诉（管理员）

```
PUT /api/complaints/admin/:id/handle
```

### 9.7 处理申诉（管理员）

```
PUT /api/complaints/admin/:id/appeal-review
```

---

## 10. 反馈模块 `/api/feedback`

> 所有接口需要登录

### 10.1 提交反馈

```
POST /api/feedback
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| category | string | 是 | 反馈类型 |
| title | string | 是 | 标题 |
| content | string | 是 | 内容 |
| images | string[] | 否 | 图片 |
| pagePath | string | 否 | 反馈来源页面路径 |

### 10.2 我的反馈列表

```
GET /api/feedback/my?status=pending&page=1&pageSize=20
```

### 10.3 反馈详情

```
GET /api/feedback/:id
```

### 10.4 对处理结果评分

```
PUT /api/feedback/:id/rate
```

### 10.5 关闭反馈

```
PUT /api/feedback/:id/close
```

### 10.6 管理员反馈列表

```
GET /api/feedback/admin/list?status=pending&page=1&pageSize=20
```

### 10.7 处理反馈（管理员）

```
PUT /api/feedback/admin/:id/handle
```

---

## 11. 推荐模块 `/api/recommend`

### 11.1 热门路线（无需登录）

```
GET /api/recommend/hot-routes?limit=10
```

### 11.2 距离与时长预估（无需登录）

```
GET /api/recommend/estimate?from=示例市东站&to=北京
```

### 11.3 地点坐标库（无需登录）

```
GET /api/recommend/locations
```

### 11.4 就近匹配（无需登录）

```
GET /api/recommend/nearby?from=示例市东站&radius=10&limit=20
```

### 11.5 个人推荐（需要登录）

```
GET /api/recommend/for-me
```

---

## 12. 文件上传模块 `/api/upload`

> 所有接口需要登录
> 限制: JPEG/PNG/GIF/WebP，单文件最大 5MB（本地）/ 20MB（生产）

### 12.1 上传头像

```
POST /api/upload/avatar
```
`multipart/form-data`，字段名 `file`

### 12.2 上传图片

```
POST /api/upload/image
```
`multipart/form-data`，字段名 `file`

### 12.3 多图上传

```
POST /api/upload/images
```
`multipart/form-data`，字段名 `files`，最多9张

---

## 13. 管理后台模块 `/api/admin`

> 除登录外，需要管理员认证: `Authorization: Bearer <adminToken>`

### 13.1 管理员登录

```
POST /api/admin/login
```

### 13.2 获取管理员个人信息

```
GET /api/admin/profile
```

### 13.3 修改密码

```
PUT /api/admin/change-password
```

### 13.4 创建管理员（仅超管）

```
POST /api/admin/admins
```
权限: `admin.manage`

### 13.5 管理员列表（仅超管）

```
GET /api/admin/admins
```

### 13.6 更新管理员

```
PUT /api/admin/admins/:id
```

### 13.7 用户列表

```
GET /api/admin/users?keyword=张&status=active&page=1&pageSize=20
```
权限: `user.manage`

### 13.8 用户详情

```
GET /api/admin/users/:id
```

### 13.9 封禁/解封用户

```
PUT /api/admin/users/:id/ban
```
权限: `user.ban`

### 13.10 重置用户信用分

```
PUT /api/admin/users/:id/credit
```
权限: `user.credit`

### 13.11 拼车列表（管理端）
> ⚠️ 拼车已并入模块帖系统，以下接口为兼容别名，内部统一走 /api/admin/modules

```
GET /api/admin/carpools?keyword=示例市&status=active&page=1&pageSize=20
```
权限: `carpool.audit`

### 13.12 拼车审核
> ⚠️ 内部统一走 PUT /api/admin/modules/:id/audit

```
PUT /api/admin/carpools/:id/audit
```

### 13.13 下架拼车
> ⚠️ 内部统一走 PUT /api/admin/modules/:id/takedown

```
PUT /api/admin/carpools/:id/takedown
```

### 13.14 投诉列表（管理端）

```
GET /api/admin/complaints?status=pending&page=1&pageSize=20
```
权限: `complaint.handle`

### 13.15 处理投诉（管理端）

```
PUT /api/admin/complaints/:id/handle
```

### 13.16 反馈列表（管理端）

```
GET /api/admin/feedback?status=pending&page=1&pageSize=20
```

### 13.17 处理反馈（管理端）

```
PUT /api/admin/feedback/:id/handle
```

### 13.18 仪表盘概览

```
GET /api/admin/dashboard
```
权限: `stats.view`

### 13.19 数据趋势

```
GET /api/admin/stats/trend?days=30
```

### 13.20 热门路线报表

```
GET /api/admin/stats/hot-routes?days=30&limit=20
```

### 13.21 用户增长报表

```
GET /api/admin/stats/user-growth?days=30
```

### 13.22 拼车类型分布

```
GET /api/admin/stats/type-distribution
```

### 13.23 手动触发统计快照

```
POST /api/admin/stats/snapshot
```

### 13.24 操作日志

```
GET /api/admin/logs?module=user&page=1&pageSize=50
```
权限: `log.view`

### 13.25 IP 风控列表

```
GET /api/admin/ip-records
```

### 13.26 封锁/解封 IP

```
PUT /api/admin/ip-records/:ip/toggle
```

### 13.27 敏感词列表

```
GET /api/admin/sensitive-words
```

### 13.28 添加敏感词

```
POST /api/admin/sensitive-words
```

### 13.29 删除/禁用敏感词

```
DELETE /api/admin/sensitive-words/:id
```

---

## 14. 联系我们模块 `/api/contact`

> 所有接口需要登录

### 14.1 提交留言

```
POST /api/contact
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| name | string | 是 | 姓名 |
| email | string | 否 | 邮箱 |
| phone | string | 否 | 手机号 |
| subject | string | 是 | 主题 |
| message | string | 是 | 留言内容 |
| type | string | 否 | `general` / `business` / `suggestion` / `report` |

### 14.2 获取留言列表

```
GET /api/contact?page=1&pageSize=20
```

### 14.3 留言详情

```
GET /api/contact/:id
```

### 14.4 回复留言（管理员）

```
PUT /api/contact/:id/reply
```

---

## 15. 模块帖子系统 `/api/module`

> 统一处理 10 个功能模块，路由参数 `:module` 取值:
> `express` (快递代取) | `task` (悬赏任务) | `lost` (失物招领) | `forum` (校园论坛) | `secondhand` (二手交易) | `rental` (闲置租赁) | `substitute` (代课代跑) | `print` (打印服务) | `yellowpage` (校园黄页) | `charity` (公益捐赠)

### 15.1 首页模块统计（无需登录）

```
GET /api/module/stats
```

**响应 data:**

```json
{
  "express": 5,
  "task": 3,
  "lost": 2,
  "forum": 15,
  "secondhand": 8,
  "rental": 2,
  "substitute": 1,
  "print": 0,
  "yellowpage": 1,
  "charity": 0,
  "total": 37
}
```

### 15.2 帖子列表（可选登录）

```
GET /api/module/:module?type=offer&status=active&keyword=xxx&page=1&pageSize=20
```

**查询参数:**

| 字段 | 类型 | 说明 |
|------|------|------|
| type | string | `offer`(提供) / `find`(需求) / `info`(信息) |
| status | string | `active` / `closed` / `resolved` |
| keyword | string | 搜索关键词 |
| sortBy | string | `createTime`(默认) / `price` / `replyCount` / `viewCount` |
| page | number | 页码 |
| pageSize | number | 每页条数 |

**响应 data:**

```json
{
  "list": [
    {
      "_id": "帖子ID",
      "module": "express",
      "type": "offer",
      "title": "帮取快递",
      "summary": "圆通快递，小件",
      "content": "从圆通快递点取一个包裹...",
      "price": 5,
      "priceNote": "小件5元，大件10元",
      "contact": "13800138000",
      "contactType": "phone",
      "images": [],
      "tags": ["快递", "代取"],
      "location": "示例大学南门",
      "status": "active",
      "viewCount": 120,
      "favoriteCount": 3,
      "replyCount": 5,
      "isFeatured": false,
      "isTop": false,
      "creator": {
        "_id": "用户ID",
        "nickName": "昵称",
        "avatarUrl": "头像",
        "creditScore": 100,
        "school": "示例大学"
      },
      "extra": {
        "deadline": "2026-06-25T18:00:00.000Z"
      },
      "createTime": "2026-06-24T10:00:00.000Z"
    }
  ],
  "total": 20,
  "page": 1,
  "pageSize": 20,
  "totalPages": 1
}
```

### 15.3 我发布的（需要登录）

```
GET /api/module/:module/my?page=1&pageSize=20
```

### 15.4 我收藏的（需要登录）

```
GET /api/module/:module/favorites?page=1&pageSize=20
```

### 15.5 帖子详情（可选登录）

```
GET /api/module/:module/:id
```

返回完整帖子对象 + `isFavorited` 字段。

### 15.6 回复列表（可选登录）

```
GET /api/module/:module/:id/replies?page=1&pageSize=20
```

**响应 data:**

```json
{
  "list": [
    {
      "_id": "回复ID",
      "post_id": "帖子ID",
      "user": {
        "nickName": "昵称",
        "avatarUrl": "头像"
      },
      "content": "回复内容",
      "images": [],
      "likeCount": 3,
      "isLiked": false,
      "parent_id": null,
      "reply_to": null,
      "createTime": "2026-06-24T12:00:00.000Z"
    }
  ],
  "total": 5,
  "page": 1,
  "pageSize": 20
}
```

### 15.7 发布帖子（需要登录）

```
POST /api/module/:module
```

**请求体:**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| title | string | 是 | 标题（最长200字） |
| content | string | 是 | 正文内容 |
| type | string | 是 | `offer` / `find` / `info` |
| price | number | 否 | 价格/悬赏金额 |
| priceNote | string | 否 | 价格说明 |
| contact | string | 否 | 联系方式 |
| contactType | string | 否 | `phone` / `wechat` / `qq` / `other` |
| images | string[] | 否 | 图片数组 |
| tags | string[] | 否 | 标签 |
| location | string | 否 | 位置 |
| extra | object | 否 | 模块扩展字段（如 `deadline`, `courseName` 等） |

**响应:** 201

### 15.8 编辑帖子（需要登录）

```
PUT /api/module/:module/:id
```

请求体同发布，所有字段可选。只能编辑自己的帖子。

### 15.9 删除帖子（需要登录）

```
DELETE /api/module/:module/:id
```

只能删除自己的帖子。

### 15.10 关闭/结束帖子（需要登录）

```
POST /api/module/:module/:id/close
```

### 15.11 收藏/取消收藏（需要登录）

```
POST /api/module/:module/:id/favorite
```

**响应 data:**

```json
{ "favorited": true, "favoriteCount": 4 }
```

### 15.12 发表回复（需要登录）

```
POST /api/module/:module/:id/reply
```

**请求体:**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| content | string | 是 | 回复内容 |
| images | string[] | 否 | 图片 |
| replyToId | string | 否 | 被回复的回复ID（子回复用） |

**响应 data:**

```json
{
  "_id": "新回复ID",
  "content": "回复内容",
  "replyCount": 6
}
```

### 15.13 删除回复（需要登录）

```
DELETE /api/module/:module/:id/reply/:replyId
```

只能删除自己的回复。

### 15.14 回复点赞（需要登录）

```
POST /api/module/:module/:id/reply/:replyId/like
```

**响应 data:**

```json
{ "liked": true, "likeCount": 4 }
```

---

## 16. 公共接口

### 16.1 健康检查

```
GET /api/health
```

**响应:**

```json
{
  "success": true,
  "message": "校园信息服务平台 API 服务运行正常",
  "version": "2.0.0",
  "timestamp": "2026-06-24T10:00:00.000Z"
}
```

---

## 附录: 通用响应格式

### 成功响应

```json
{
  "success": true,
  "message": "操作成功",
  "data": { ... }
}
```

### 分页响应

```json
{
  "success": true,
  "data": {
    "list": [...],
    "total": 100,
    "page": 1,
    "pageSize": 20,
    "totalPages": 5
  }
}
```

### 错误响应

```json
{
  "success": false,
  "message": "错误描述"
}
```

### 常见 HTTP 状态码

| 状态码 | 说明 |
|--------|------|
| 200 | 成功 |
| 201 | 创建成功 |
| 400 | 参数错误 |
| 401 | 未登录或 Token 过期 |
| 403 | 无权限 |
| 404 | 资源不存在 |
| 409 | 冲突（如手机号已注册） |
| 429 | 请求过于频繁 |
| 500 | 服务器内部错误 |
