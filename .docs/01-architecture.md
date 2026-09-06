# 01 · 架构总览

> 读完本文你会理解三件事：route-forge 三包各自做什么、本项目「前后端分离」的请求链路长什么样、
> 以及 forge 摘要为什么要分层级（levels）。

---

## 目录

- [route-forge 是什么](#route-forge-是什么)
- [三包协作模型](#三包协作模型)
- [本项目的架构决策：前后端分离](#本项目的架构决策前后端分离)
- [请求链路图](#请求链路图)
- [层级（levels）设计](#层级levels设计)
- [核心概念速查](#核心概念速查)

---

## route-forge 是什么

route-forge 的一句话定义：

> **让后端框架的命名路由在前端也能被类型安全地消费。**

没有 route-forge 时，前后端分离项目的前端导航与请求充满隐患：

```js
// ❌ 传统写法：硬编码 URL，改了路由就崩
fetch('/api/catalogs/company-2026');
navigate('/catalogs/company-2026');
```

```php
// 后端早已命名
Route::get('/catalogs/{slug}', ...)->name('api.catalogs.show');
```

```jsx
// ✅ route-forge：名字引用，参数类型安全
call('api.catalogs.show', { params: { slug: 'company-2026' } });
navigate(href('api.catalogs.show', { slug: 'company-2026' }));
```

收益：

- 路由改名 → 只有后端一处改动，前端跟随类型提示自动适配（过渡期可用别名兼容）
- 参数漏传 / 拼错 → TS 编译报错或运行时明确报错，拒绝静默忽略
- 新成员看 `route('xxx')` / `call('xxx')` → 知道这是后端命名路由，不是随意的 URL

## 三包协作模型

```
┌────────────────────────────────────────────────────────────────────┐
│                         route-forge 生态                            │
│                                                                     │
│  ┌───────────────────┐   forge 摘要 JSON    ┌────────────────────┐ │
│  │ route-forge/laravel │ ─────────────────▶ │  @route-forge/core  │ │
│  │   （后端 PHP 包）    │  @forgeSummary 指令 │   （前端 TS 核心）   │ │
│  │                     │                     │                     │ │
│  │ · 层级路由归类       │                     │ · route() URL 生成  │ │
│  │ · 摘要 / 层级端点    │                     │ · forge 摘要解析    │ │
│  │ · @forgeSummary     │                     │ · HTTP 适配层       │ │
│  │ · 类型生成命令       │                     │ · 类型定义 / 推断   │ │
│  └───────────────────┘                     └──────────┬─────────┘ │
│                                                       │ 上层封装    │
│                                                       ▼            │
│                                            ┌────────────────────┐ │
│                                            │  @route-forge/react │ │
│                                            │   （React 适配器）   │ │
│                                            │                     │ │
│                                            │ · <RouteForgeProvider>     │
│                                            │ · useForge / useForgeApi   │
│                                            │ · useForgeRoute / ForgeLink│
│                                            │ · ForgeRoute（render-prop）│
│                                            └────────────────────┘ │
└────────────────────────────────────────────────────────────────────┘
```

| 包                    | 语言       | 职责                                                                                      | 本项目版本 |
|-----------------------|------------|-------------------------------------------------------------------------------------------|------------|
| `route-forge/laravel` | PHP        | 把命名路由按层级归类 → 生成 forge 摘要 → `@forgeSummary` 注入 → 类型生成命令              | ^1.4       |
| `@route-forge/core`   | TypeScript | 解析 forge 摘要 → 框架无关的 `route()` + 请求适配层 + 类型定义                            | ^2.2       |
| `@route-forge/react`  | TypeScript | 把 core 包装成 React Context Provider、Hooks（`useForge` / `useForgeApi` / `useForgeRoute`）与组件（`ForgeLink` / `ForgeRoute`） | ^2.2 |

> 💡 如果用 Vue 3，对应有 `@route-forge/vue`；不依赖框架的 SPA 直接用 `@route-forge/core`。

## 本项目的架构决策：前后端分离

本项目是 route-forge 的展示载体，架构刻意贴近真实业务形态：

| 决策                          | 内容                                                                                      | 理由                                                       |
|-------------------------------|-------------------------------------------------------------------------------------------|------------------------------------------------------------|
| **Laravel 只出一个 Blade 壳** | 所有 URL 都落到 `resources/views/index.blade.php`，它只注入 forge 摘要 + CSRF + 挂载 React | 页面路由归前端，后端不再为每个栏目写视图                    |
| **页面路由归 React Router**   | `createBrowserRouter`（history 模式）+ Laravel 回退路由兜底，刷新不 404                    | 前后端分离的标准做法                                       |
| **数据全部走 JSON API**       | 公开数据 `/api/*`，管理端 `/manage/api/*`                                                 | 数据契约清晰，前后端可并行开发                             |
| **路由按层级归类**            | `public`（eager）/ `manage`（lazy + 受保护）                                              | 首屏只带公开路由；管理端路由名在登录前不可见、不可调       |
| **URL 生成与组件映射解耦**    | React Router 管「URL → 组件」，route-forge 管「路由名 → URL」                             | 改后端 URI 不用动前端路由表，只改类型重新生成              |

## 请求链路图

```
浏览器请求 /catalogs/company-2026（任意 URL）
    │
    ▼
Laravel 回退路由 → 渲染 resources/views/index.blade.php
    │  <head> 里 @forgeSummary 展开：
    │  注入一次性 window.__ROUTE_FORGE__ 访问器（读后即删）
    │  内容 = public 层级的路由元信息（eager 预加载）
    ▼
完整 HTML 返回浏览器
    │
    ▼
Vite 加载 resources/js/app.jsx
    │
    ▼
<RouteForgeProvider> 建实例（内嵌摘要同步读取，无 ready 门闩）
    │  1. 读取 __ROUTE_FORGE__ 摘要
    │  2. 构建 public 层级路由表
    │  3. Context 注入，全树可用
    ▼
React Router 接管 URL
    │
    │  /catalogs/company-2026 → CatalogPage
    │  组件内：
    │  const { call } = useForgeApi({ level: 'public' })
    │  useForgeRoute('public', 'api.catalogs.show', { slug })  → "/api/catalogs/company-2026"
    │  call('api.catalogs.show', { params: { slug } })         → JSON 数据
    ▼
用户看到画册详情（React 渲染 + 类型安全导航与请求）
```

管理端（`/admin`）多一步懒加载：

```
登录成功 → useForgeApi({ level: 'manage' }) 首次调用
    │  自动请求 GET /_forge/routes/manage（受 manage 中间件保护）
    │  拿到 manage 层级路由明细 → 构建管理端路由表
    ▼
管理端组件凭 manage.api.* 路由名调接口
    未登录时连「后台有哪些路由」都拿不到 —— 这是层级保护的本意
```

## 层级（levels）设计

route-forge 不预设固定层级，层级完全由 `config/forge.php` 自定义。本项目规划两个：

| 层级      | load    | 归级方式                                    | endpoint_middleware | 用途                             |
|-----------|---------|---------------------------------------------|---------------------|----------------------------------|
| `public`  | `eager` | URI 前缀 `api` 自动命中（`match.prefix`）   | —                   | 前台画册数据，随首屏摘要注入     |
| `manage`  | `lazy`  | URI 前缀 `manage` + `manage` 中间件（OR）   | `['web', 'manage']` | 管理端接口，登录后懒加载         |

两个层级的关键差异：

- **eager vs lazy**：`public` 的路由元信息随 `@forgeSummary` 进首屏 HTML（前台首屏就要用）；
  `manage` 只在登录后由 `useForgeApi({ level: 'manage' })` 按需拉取，不占公开页面体积
- **端点保护**：`manage` 配了 `endpoint_middleware: ['web', 'manage']`，未登录者请求层级明细端点
  `GET /_forge/routes/manage` 直接被拒 —— 路由名本身也是信息，一并保护。
  **`web` 不可省**：它提供 `StartSession`；只挂 `manage` 时端点请求根本没有会话上下文，
  连已登录用户也会被判定未登录（恒 401），SPA 懒加载层级后又被 401 兜底踢回登录页，形成死循环
- **strict_mode**：本项目开启（`true`）。任何路由漏写归级直接抛异常（500），而不是静默掉进
  `unassigned` —— 宁可 fails-fast，也不要「路由明明在、类型和调用都不通」的暗坑

## 核心概念速查

| 概念                              | 说明                                                                               |
|-----------------------------------|------------------------------------------------------------------------------------|
| **命名路由 (Named Route)**        | Laravel 中 `->name('xxx')` 起的名字，route-forge 一切的起点                        |
| **层级 (Level)**                  | 路由的归组单位，在 `config/forge.php` 的 `levels` 中自定义                         |
| **forge 摘要 (Forge Summary)**    | 后端生成的路由元信息 JSON，含各层级路由的 URI、方法、参数签名                      |
| **@forgeSummary**                 | Blade 指令，注入一次性 `window.__ROUTE_FORGE__` 访问器（读后即删）                 |
| **摘要端点**                      | `GET /_forge/routes`，前端运行时拉取摘要的 HTTP 入口（Blade 注入之外的备选通道）   |
| **层级明细端点**                  | `GET /_forge/routes/{level}`，懒加载层级按需拉取；可配 `endpoint_middleware` 保护  |
| **RouteForgeProvider**            | `@route-forge/react` 的 Context Provider，创建并注入 forge 实例                    |
| **useForgeRoute(level, name)**    | 响应式 URL 生成 Hook；层级未加载或解析出错降级 `''`，渲染不中断                    |
| **ForgeLink / ForgeRoute**        | 链接组件 / render-prop 组件，封装「先空串、后更新」的懒加载行为                    |
| **route('name', params)**         | 由 `@route-forge/core` 实现的 URL 生成函数                                         |
| **useForgeApi({ level })**        | 按层级发请求的 Hook（pending 引用计数 + error 状态），懒加载层级自动拉明细          |
| **类型下发**                      | `route:forge:types` 生成 `forge-routes.d.ts`，让路由名与参数被 TS 约束             |
| **别名 (Alias)**                  | 路由改名过渡手段：旧名继续可用，指向新路由（宏 `->forgeAlias()` 或 config 声明）   |

---

继续阅读：[02 · 后端接入](02-backend-integration.md) →
