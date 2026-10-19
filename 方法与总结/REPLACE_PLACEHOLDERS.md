# 部署前请替换以下占位符

本源码在交付前已对个人、账号与学校相关信息做脱敏处理。配置项使用 `{{...}}`、`change_me...` 或“示例”数据表示。
部署前请全文搜索 `{{`、`change_me`、`示例` 和 `touristappid`，逐项替换。**请勿直接使用示例值上线。**

| 占位符 | 含义 | 示例 |
|--------|------|------|
| `app.suyu.ink` | 保留的演示域名，仅作链接示例，部署前统一替换 | `your-campus-app.com` |
| `{{OLD_DOMAIN}}` | 旧域名占位（可忽略或删除） | — |
| `{{BRAND}}` | 品牌/项目标识 | `campus` |
| `{{PM2_PROCESS_NAME}}` | PM2 进程名 | `campus-server` |
| `{{SERVER_IP}}` | 服务器公网 IP | `0.0.0.0` |
| `change_me_to_a_random_long_string` | JWT 签名密钥，请用随机长字符串 | `openssl rand -hex 32` |
| `touristappid` / `change_me_to_your_wechat_appid` | 微信小程序 AppID | `wx........` |
| `change_me_to_your_wechat_secret` | 微信小程序 AppSecret | — |
| `change_me_to_a_database_password` | 数据库密码 | — |
| `{{DEVELOPER_PHONE}}` | 隐私保护指引中的开发者联系手机号 | — |
| `{{DEVELOPER_EMAIL}}` | 开发者反馈邮箱 | — |
| `{{USER_HOME}}` | 本地项目路径前缀 | `/home/developer` |
| `示例大学` | 演示学校名称 | 你的学校名称 |
| `{{SCHOOL_EMAIL_DOMAIN}}` | 学校邮箱域名 | — |
| `{{SCHOOL_ADDRESS}}` | 学校地址 | — |
| `{{SCHOOL_HOSPITAL_ADDRESS}}` | 附属医院地址 | — |
| `示例市` / `示例省` | 演示城市与省份 | 你的学校所在地 |
| `0000` | 学校所在地区号 | — |
| `{{BRAND_NAME}}` | 产品版权 / 品牌署名（原开发者个人署名，已脱敏） | `CampusHub` |
| `{{WECHAT_TEMPLATE_ID}}` | 微信订阅消息模板 ID（需在你自己的小程序后台申请） | — |
| `{{SCHOOL_OFFICIAL_WECHAT}}` | 校园黄页中「学校官方微信」 | — |
| `{{SCHOOL_QQ_GROUPS}}` | 校园黄页中「学校官方 QQ 群」 | — |
| `{{DEMO_CONTACT}}` | H5 演示页中的示例联系方式 | — |
| `change_me_to_a_strong_password` | 树洞管理后台密码（见 backend/.env 的 TREEHOLE_ADMIN_PASSWORD） | 强密码 |
| `/images/qr-placeholder.png` | 新生群、联系名片与全景入口的不可扫描占位图 | 你的二维码图片 |
| `campus-map_2k.jpg` / `campus-map_8k.jpg` | 示例校园地图路径，原真实校园地图未交付 | 你的校园地图图片 |

> **默认管理员账号**：`admin` / 默认密码 `Admin@123456`（bcrypt 哈希已直接写入 `backend/schema.sql` 的 `admins` 表，建库后即可用该账号密码登录管理端，**开箱即用**）。
> 出于安全，**上线前请务必修改默认密码**（可在管理端「系统设置 / 管理员」中修改，或重新生成哈希替换 `schema.sql` 中的值）：
> ```bash
> cd backend && npm i bcryptjs
> node -e "console.log(require('bcryptjs').hashSync('你的新强密码', 14))"
> ```

## 其他交付注意事项
- 源码目录下的 `.git`（版本历史）和 `node_modules/`（依赖）**不应**随源码一并发出：历史中可能残留早期密钥，依赖可让买家自行 `npm install`。
- 微信小程序 `project.config.json` 中的 `appid` 已替换为 `touristappid`，买家需填入自己的小程序 AppID。
- 交付目录不包含 `backend/.env`；请复制 `backend/.env.example` 为 `.env` 后再填写真实配置。
- 原个人二维码、真实校园地图、私有配置和本地备份均不应加入交付包。
