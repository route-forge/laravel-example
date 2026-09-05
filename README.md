<p align="center">
  <strong>route-forge × Laravel · 企业画册</strong>
  <br>
  <sub>前后端分离架构下「命名路由 → 类型安全 → 前后端联动」的官方整合示例</sub>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/PHP-8.5%2B-777BB4?style=flat-square&logo=php" alt="PHP" />
  <img src="https://img.shields.io/badge/Laravel-13.x-FF2D20?style=flat-square&logo=laravel" alt="Laravel" />
  <img src="https://img.shields.io/badge/Vue-3.x-4FC08D?style=flat-square&logo=vuedotjs" alt="Vue" />
  <img src="https://img.shields.io/badge/route--forge-laravel%401.4-1668AC?style=flat-square" alt="route-forge/laravel" />
  <img src="https://img.shields.io/badge/license-MIT-green?style=flat-square" alt="License" />
</p>

---

## 目录

- [这是什么](#这是什么)
- [整体架构](#整体架构)
- [功能规划](#功能规划)
- [快速开始](#快速开始)
- [技术栈](#技术栈)
- [route-forge 在本项目中的用法](#route-forge-在本项目中的用法)
- [文档导航](#文档导航)
- [Roadmap](#roadmap)
- [License](#license)

---

## 这是什么

这是一个 **企业宣传画册**，同时也是 **route-forge 生态的官方整合示例**，覆盖三包：

| 包                    | 侧  | 作用                                    |
|-----------------------|-----|-----------------------------------------|
| `route-forge/laravel` | PHP | 命名路由 → forge 摘要 → Blade 指令注入  |
| `@route-forge/core`   | JS  | `route()` 核心实现 + 类型定义 + HTTP 层 |
| `@route-forge/vue`    | JS  | Vue 3 插件、组合式 API、请求门闩        |

route-forge 解决的核心问题： **让 Laravel 的命名路由在前端也能被类型安全地消费**。后端写
`Route::name('api.catalogs.show')`，前端就能用 `route('api.catalogs.show', { slug })` ——
参数缺了、名字拼错了，TypeScript / 运行时都会及时报错，拒绝静默 404。

## 整体架构

**前后端分离**：Laravel 不再为每个栏目渲染页面，只负责两件事 —— 输出一个唯一的 Blade 壳页和一套 JSON
API；页面路由全部由前端 vue-router 接管。

```
浏览器 ── 任意 URL ──▶ Laravel
                        │  唯一 Blade 壳 resources/views/index.blade.php
                        │  <head> 里 @forgeSummary 注入 window.__ROUTE_FORGE__
                        ▼
                   Vue 3 SPA（Vite 构建，vue-router history 模式）
                        │  页面切换全在前端完成，不再回源
                        │
                        │  useForgeApi('public')   ← 公开数据，摘要已预加载
                        │  useForgeApi('manage')   ← 登录后懒加载的管理端接口
                        ▼
                   Laravel JSON API
                        ├── /api/*          level: public（eager）
                        └── /manage/api/*   level: manage（lazy，需登录）
```

route-forge 在其中的角色：

- **后端**把命名路由按 **层级（level）** 归类：公开接口归 `public`（eager，随首屏注入）， 管理接口归
  `manage`（lazy，登录后才按需拉取明细，且明细端点本身受中间件保护）
- **前端**凭路由名生成 URL（`route()`）、凭层级发请求（`useForgeApi(level)`），全程不硬编码一个 URL

## 功能

### 前台（公开访问，4 页 + 404 兜底）

| 页面     | 说明                                                    |
|----------|---------------------------------------------------------|
| 首页     | 品牌区（站点资料）+ 分类导览 + 最新画册入口             |
| 画册列表 | 按分类筛选（筛选态进 URL query）、卡片式入口、分页      |
| 画册详情 | 翻页式阅读（PageFlip：PC 对开 / 移动单页），整本一次取回 |
| 联系页   | 联系方式 + 在线留言，写入后台留言管理                   |
| 404      | 未匹配地址兜底，仍带页头页脚与去向                      |

### 管理端（登录后访问，`/manage`）

| 模块       | 说明                                     |
|------------|------------------------------------------|
| 登录       | JSON 登录，跳转由前端决定                |
| 仪表盘     | 身份 + 统计一次返回（manage 层级懒加载） |
| 基础资料   | 站点名称、品牌信息、联系方式等站点级配置 |
| 分类       | 画册分类的增删改查与排序                 |
| 画册列表   | 画册的增删改查、发布状态、归属分类       |
| 画册页数据 | 单本画册内页的增删改查与排序             |
| 留言管理   | 关键词与状态筛选、标记处理状态           |

## 快速开始

### 环境要求

| 依赖       | 最低版本 |
|------------|----------|
| PHP        | 8.5+     |
| Composer   | 2.x      |
| Node.js    | 20+      |
| pnpm / npm | 任意     |

### 一键安装

```bash
composer setup
```

这一条会依次执行：

1. `composer install` — PHP 依赖（含 `route-forge/laravel`）
2. 复制 `.env`、生成 `APP_KEY`
3. `php artisan migrate --force` — SQLite 默认数据库
4. `npm install --ignore-scripts` + `npm run build` — 前端构建

### 本地开发

```bash
# 后端 + Vite 双进程
composer dev

# 或分开跑
php artisan serve
npm run dev
```

### 运行测试

```bash
composer test
```

## 技术栈

### 后端

| 组件                    | 版本     | 职责                                          |
|-------------------------|----------|-----------------------------------------------|
| PHP                     | ^8.5     | 运行时                                        |
| Laravel                 | ^13.17   | Web 框架（JSON API + 唯一 Blade 壳）          |
| **route-forge/laravel** | **^1.4** | **层级路由 → forge 摘要 → Blade 指令 → 类型** |
| PHPUnit                 | ^12.5    | 测试框架                                      |

### 前端

| 组件                    | 版本     | 职责                                |
|-------------------------|----------|-------------------------------------|
| Vue                     | ^3.5     | UI 框架                             |
| **@route-forge/core**   | **^2.2** | **route() 核心 + HTTP 适配 + 类型** |
| **@route-forge/vue**    | **^2.2** | **Vue 插件 + useForgeApi 组合式**   |
| vue-router              | ^4       | SPA 页面路由（history 模式）        |
| Vite                    | ^8.2     | 构建工具                            |
| UnoCSS                  | ^66.9    | 原子化 CSS（`presetUno`）           |
| Pug                     | ^3.0     | 模板缩进语法                        |
| Element Plus            | ^2.14    | UI 组件库（按需引入）               |
| @element-plus/icons-vue | ^2.3     | 图标库（显式引入）                  |

## route-forge 在本项目中的用法

三步看懂整条链路：

### 1. 后端：Blade 壳注入 forge 摘要

`resources/views/index.blade.php`（放在 `<head>`，必须早于前端 bundle 求值）：

```blade
@forgeSummary
```

这行指令注入一段一次性访问器脚本：前端第一次读 `window.__ROUTE_FORGE__` 即取到 forge 摘要 （各层级路由的
URI、方法、参数签名），读取后自动删除，不留全局残留。

### 2. 前端：Vue 插件初始化 + vue-router 接管页面

`resources/js/app.js`：

```js
import forge from './forge.js';
import router from './route.js';

const app = createApp(App);
app.use(forge);
app.use(router);
forge.ready().then(() => app.mount('#app'));   // 摘要解析完成才挂载
```

之后在组件里：

```vue
<script setup>
const { route } = useForgeRoute();
const { call } = useForgeApi('public');

// 用路由名跳转（vue-router 只管组件映射，URL 生成归 route-forge）
router.push(route('api.catalogs.show', { slug: 'company-2026' }));

// 用层级发请求（useForgeApi 内部按路由名构造 API 调用）
const res = await call('api.catalogs.index');
</script>
```

### 3. 后端：类型下发

路由变更后重新生成前端类型：

```bash
php artisan route:forge:types --out=resources/js/types/forge-routes.d.ts
```

`route()` 的路由名与参数从此被 TS 约束：名字拼错、参数漏传，编译期即报错。

> 详细用法见 [02 · 后端接入](.docs/02-backend-integration.md) 与
> [03 · 前端接入](.docs/03-frontend-integration.md)。

## 文档导航

完整文档集中在 `.docs/` 目录，按阅读顺序排列：

| 序号 | 文档                                                                    | 适合谁      | 内容                                                               |
|------|-------------------------------------------------------------------------|-------------|--------------------------------------------------------------------|
| 01   | [架构总览](.docs/01-architecture.md)                                    | 所有人      | 三包协作模型、前后端分离链路图、层级（levels）设计                 |
| 02   | [后端接入：route-forge/laravel](.docs/02-backend-integration.md)        | PHP 开发者  | levels 配置、tier 归级、`@forgeSummary`、端点体系、类型生成        |
| 03   | [前端接入：@route-forge/vue](.docs/03-frontend-integration.md)          | 前端开发者  | 插件初始化、vue-router 集成、`useForgeApi`、懒加载层级、错误处理   |
| 04   | [企业画册：栏目结构与内容模型](.docs/04-catalog-structure.md)           | 产品 / 全栈 | 前台四页 + 404、管理端七模块、路由表、数据模型、字段契约           |
| 05   | [前端工程化：UnoCSS + Pug + Element Plus](.docs/05-frontend-tooling.md) | 前端开发者  | Vite 插件链、按需引入、Pug 约定、样式分层                          |
| 06   | [开发指南](.docs/06-development.md)                                     | 贡献者      | 本地环境、代码规范、调试技巧、常见坑                               |
| 07   | [FAQ](.docs/07-faq.md)                                                  | 所有人      | 懒加载、类型不更新、别名、与 Laravel 原生 route() 的关系、故障排查 |

## Roadmap

| 阶段                    | 内容                                                                    | 状态       |
|-------------------------|-------------------------------------------------------------------------|------------|
| **P1 · 前后端分离基座** | 唯一 Blade 壳 + vue-router SPA + forge 双层级（public / manage）        | 已完成     |
| **P2 · 公开 API**       | 画册列表 / 画册详情 / 站点基础资料 / 留言，前台四页 + 404 消费          | 已完成     |
| **P3 · 管理端**         | 登录 + 仪表盘 / 基础资料 / 分类 / 画册 / 画册页 / 留言，manage 懒加载   | 已完成     |
| **P4 · 类型与测试**     | `route:forge:types` 已接入工作流，后端路由 / API / 权限测试 31 例；前端自动化测试仍缺 | 部分完成 |

## License

MIT © route-forge
