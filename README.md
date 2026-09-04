<p align="center">
  <strong>route-forge × Laravel · 企业画册示例仓库</strong>
  <br>
  <sub>前后端分离架构下「命名路由 → 类型安全 → 前后端联动」的官方整合示例（分支分流：main 后端基座 + vue / react 前端）</sub>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/PHP-8.5%2B-777BB4?style=flat-square&logo=php" alt="PHP" />
  <img src="https://img.shields.io/badge/Laravel-13.x-FF2D20?style=flat-square&logo=laravel" alt="Laravel" />
  <img src="https://img.shields.io/badge/Vue-3.x-4FC08D?style=flat-square&logo=vuedotjs" alt="Vue" />
  <img src="https://img.shields.io/badge/React-19.x-61DAFB?style=flat-square&logo=react" alt="React" />
  <img src="https://img.shields.io/badge/route--forge-laravel%401.4-1668AC?style=flat-square" alt="route-forge/laravel" />
  <img src="https://img.shields.io/badge/license-MIT-green?style=flat-square" alt="License" />
</p>

---

## 目录

- [这是什么](#这是什么)
- [分支说明与前端差异](#分支说明与前端差异)
- [route-forge 生态](#route-forge-生态)
- [快速开始](#快速开始)
- [文档导航](#文档导航)
- [License](#license)

---

## 这是什么

这是 **route-forge 生态的官方整合示例仓库**，以一个企业宣传画册为载体，演示如何把 Laravel 的命名路由
变成前端也能类型安全消费的 `route()` —— 后端写 `Route::name('api.catalogs.show')`，前端就能用
`route('api.catalogs.show', { slug })`，参数缺了、名字拼错了，TypeScript / 运行时都会及时报错。

**架构：前后端分离**。Laravel 只输出一个唯一 Blade 壳页（`@forgeSummary` 注入 forge 摘要）和一套
JSON API（公开 `/api/*` + 管理端 `/manage/api/*`，按层级归类：`public` eager / `manage` lazy 受保护）；
页面路由全部由前端（Vue Router / React Router）接管。

**分支分流策略**：后端 Laravel 代码在 `main` 作为共享基座开发，Vue 和 React 两套前端方案分别在
独立分支完整实现 —— 两个分支本质只有前端不一样，后端可复用。

## 分支说明与前端差异

| 分支     | 前端栈                                | 说明                                                     |
|----------|---------------------------------------|----------------------------------------------------------|
| `main`   | （纯 Laravel 后端基座）               | 仓库入口：Laravel 骨架 + route-forge 后端接入 + 完整文档 |
| `vue`    | Vue 3 + Element Plus + UnoCSS + Pug + Vue Router | 完整的 Vue 版企业画册示例                  |
| `react`  | React 19 + Ant Design + UnoCSS + React Router | 完整的 React 版企业画册示例                |

```bash
git checkout vue    # Vue 版
git checkout react  # React 版
```

### 两套前端的差异一览

| 维度         | vue 分支                                            | react 分支                                            |
|--------------|-----------------------------------------------------|-------------------------------------------------------|
| 框架         | Vue 3（`<script setup>` + Pug 模板）                | React 19（函数组件 + JSX）                            |
| UI 组件库    | Element Plus（`unplugin` 按需引入）                 | Ant Design 5（`@ant-design/vite-plugin` 按需）        |
| 页面路由     | vue-router 4（`createRouter` history 模式）         | React Router 7（`createBrowserRouter`）               |
| forge 初始化 | `createRouteForgePlugin()` + `forge.ready()` 后 mount | `<RouteForgeProvider>`（内嵌摘要同步可用，无 ready 门闩） |
| URL 生成     | `useForgeRoute()`（响应式）                         | `useForgeRoute(level, name)` Hook + `ForgeLink` / `ForgeRoute` 组件 |
| 发请求       | `useForgeApi('public')`                             | `useForgeApi({ level: 'public' })`                    |
| 样式工程     | Pug 约定 + UnoCSS + Element Plus 样式分层           | JSX 约定 + UnoCSS + Ant Design 样式分层               |

> 前端细节差异详见各分支的 `.docs/03-frontend-integration.md` 与
> `.docs/05-frontend-tooling.md`（分别有 Vue / React 两个版本）。

## route-forge 生态

拆成三个包，覆盖后端 → 核心 → 前端适配三层：

| 包                     | 语言       | 职责                                                                      |
|------------------------|------------|---------------------------------------------------------------------------|
| `route-forge/laravel`  | PHP        | 命名路由按层级归类 → forge 摘要 → `@forgeSummary` 注入 → 类型生成命令     |
| `@route-forge/core`    | TypeScript | 解析 forge 摘要 → 框架无关 `route()` + HTTP 适配层 + 类型定义             |
| `@route-forge/vue` / `@route-forge/react` | TypeScript | 框架适配器：Vue 插件与组合式 API / React Provider 与 Hooks + 组件 |

```
route-forge/laravel (后端 PHP 包)
        │
        │  命名路由 → 层级归类 → forge 摘要 → Blade @forgeSummary 注入
        │  （一次性 window.__ROUTE_FORGE__ 访问器，读后即删）
        ▼
  @route-forge/core (前端 TS 核心库)
        │
        │  解析 forge 摘要 → route() 生成 + useForgeApi 按层级发请求
        ▼
  @route-forge/vue / @route-forge/react (框架适配器)
        Vue:   createRouteForgePlugin() + useForge / useForgeApi / useForgeRoute
        React: <RouteForgeProvider> + useForge / useForgeApi / useForgeRoute + ForgeLink
```

### route-forge/laravel（后端）

```php
// 1. 安装
composer require route-forge/laravel

// 2. 定义命名路由并归入层级（config/forge.php 的 levels 定义 public / manage）
Route::prefix('api')->name('api.')->group(function () {
    Route::get('/catalogs/{slug}', [CatalogController::class, 'show'])->name('catalogs.show');
});

// 3. 唯一 Blade 壳 resources/views/index.blade.php 的 <head> 里注入 forge 摘要
@forgeSummary

// 4. 路由变更后生成前端类型
php artisan route:forge:types --out=resources/js/types/forge-routes.d.ts
```

### @route-forge/core（前端 TS 核心）

框架无关的 `route()` 实现，负责解析 forge 摘要并提供 URL 生成与按层级发请求能力：

```ts
import { createForge } from '@route-forge/core';

// 手动创建（适用于纯 JS / 非组件上下文）
const forge = createForge(window.__ROUTE_FORGE__);
forge.route('api.catalogs.show', { slug: 'hello' }); // → "/api/catalogs/hello"
```

## 快速开始

```bash
# 1. 进入你想看的前端版本分支
git checkout react   # 或 vue

# 2. 一键安装（后端 + 前端）
composer setup

# 3. 本地开发
composer dev

# 4. 运行测试
composer test
```

## 文档导航

完整文档在 `.docs/` 目录（本分支即全套；vue / react 分支各有一份含自家前端细节的版本）：

| 序号 | 文档                                                       | 适合谁      | 内容                                                                | 分支差异            |
|------|------------------------------------------------------------|-------------|---------------------------------------------------------------------|---------------------|
| 01   | [架构总览](.docs/01-architecture.md)                       | 所有人      | 三包协作模型、前后端分离链路图、层级（levels）设计                  | —                   |
| 02   | [后端接入：route-forge/laravel](.docs/02-backend-integration.md) | PHP 开发者  | levels 配置、tier 归级、`@forgeSummary`、端点体系、类型生成         | —                   |
| 03   | [前端接入](.docs/03-frontend-integration.md)               | 前端开发者  | forge 初始化、页面路由集成、`useForgeApi`、懒加载、错误处理         | Vue / React 两版    |
| 04   | [企业画册：栏目结构与内容模型](.docs/04-catalog-structure.md) | 产品 / 全栈 | 前台三页 + 管理端四块、路由表规划、数据模型、字段契约               | —                   |
| 05   | [前端工程化](.docs/05-frontend-tooling.md)                 | 前端开发者  | Vite 插件链、按需引入、模板约定、样式分层                           | Vue / React 两版    |
| 06   | [开发指南](.docs/06-development.md)                        | 贡献者      | 本地环境、代码规范、调试技巧、常见坑                                | —                   |
| 07   | [FAQ](.docs/07-faq.md)                                     | 所有人      | 懒加载、类型不更新、别名、与 Laravel 原生 route() 的关系、故障排查  | —                   |

02 / 04 / 06 / 07 为前后端共享内容，两个前端分支与本分支保持一致；03 / 05 按分支各有一版。
改动后端相关文档请以本分支为源，前端分支跟随。

## License

MIT © route-forge
