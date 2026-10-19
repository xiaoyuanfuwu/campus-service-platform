# 校园服务小程序 / bby 迁移项目 · 长期约定

## 项目关系
- **源项目**：`/Users/wangxiaoming/Desktop/校园服务小程序/mini-program/miniprogram`
  微信小程序原生（WXML/WXSS/JS），5 个主包页 + 63 个分包页，共 **68 页**。
  演示接口：`https://app.suyu.ink`（源 `utils/api.js` 的 `API_BASE`）。
- **目标项目**：`/Users/wangxiaoming/Desktop/bby/bby-front/bangbangya`
  uni-app x 蒸汽模式（`manifest.json` → `uni-app-x.vapor=true`，`flex-direction: column`），
  68 个 `.uvue` 页；分包目录由 `subpkg` 改为 `pages-sub`。
- 后端 `bby-server`（Java）另在 `/Users/wangxiaoming/Desktop/bby/bby-server`。

## 硬性约定（后续改动必须遵守）
1. **数据源集中管理**：任何地址/开关一律走 `config/datasource.uts`
   （`getApiBase()` / `allowNetwork()` / `resolveAssetUrl()` /
   `setDataSourceMode('mock'|'live'|'auto')`）。禁止在页面内再写 `https://app.suyu.ink`。
2. **运行时切换**：`uni.setStorageSync('bby.dataSource','mock')` 可覆盖编译期默认值，
   免重打包；`DEFAULT_DATA_SOURCE` 默认 `auto`（先远端、失败回落本地）。
3. **样式不要按选择器对齐**：迁移时新版类名统一加了页面前缀（`ct-`/`ch-`/`msg-`/`rec-`…），
   逐类名比对会产生大量假阴性；应比对**设计令牌值域**（颜色/字号/圆角/字重/间距）。
4. **uni-app x 默认 flex-direction 是 column**，与小程序 row 不同，写横向布局务必显式
   `flex-direction: row`（已有 codemod `tools/codemod/inject-flex-direction.py`）。

## 验证方式（已建好，直接用）
- 启动：`node preview/server.mjs`（端口 5180），路由 `/` 清单、`/c/<page>` 双栏对比、
  `/raw/n|o/<page>` 独立文档。
- 截图体检：`node preview/shot.mjs [page...]`（省略参数跑全部 68 页）。
- 样式差异：`node preview/diff.mjs [page...]` → `preview/screenshots/diff-report.md`。
- 令牌对齐：`node preview/token-diff.mjs` → `preview/screenshots/token-diff.md`。
- 注入演示数据：`preview/fixtures/<page 的 / 换成 __>.json`。
- playwright 装在隔离工作区，脚本用 `createRequire` 加载，不要 npm install 到工程内。

## 已知判断边界
- 静态渲染管线拿不到 `store/*-repository.uts`（本地持久化）与 onLoad 里计算的
  `navBarHeight` 之类运行期值，**细粒度 computed style 差异多为管线噪声，不等于回归**。
  判定真实偏差优先看：① 结构性缺失区块；② 控制台报错/资源 404；③ 令牌值域缺口。
