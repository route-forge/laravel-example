# 01 · 架构总览

> 这是 route-forge 生态的全景图 —— 读完它你会理解「为什么要有这三个包」以及「请求从浏览器到数据库、再回到浏览器的完整链路」。

---

## 目录

- [route-forge 是什么](#route-forge-是什么)
- [三包协作模型](#三包协作模型)
- [请求链路图](#请求链路图)
- [本项目的集成全景](#本项目的集成全景)
- [核心概念速查](#核心概念速查)

---

## route-forge 是什么

route-forge 的一句话定义：

> **让后端框架的命名路由在前端也能被类型安全地消费。**

没有 route-forge 时，Laravel 项目的前端导航充满隐患：

```jsx
// ❌ 传统写法：硬编码 URL，改了路由就崩
<a href="/admin/users/3">编辑用户</a>
```

```php
// 后端早已命名
Route::name('admin.users.edit')->get('/admin/users/{user}', ...);
```

```jsx
// ✅ route-forge：名字引用，参数类型安全
<Link to={route('admin.users.edit', { user: 3 })}>编辑用户</Link>
```

收益：
- 路由改名 → 只有后端一处改动，前端跟着类型提示自动适配
- 参数漏传 / 拼错 → TS 编译报错或运行时明确报错，而不是 404
- 新成员看 `route('xxx')` → 知道这是一个后端命名路由，不是随意的 URL

## 三包协作模型

route-forge 拆成三个包，分别覆盖后端 → 上下文 → 前端三层：

```
┌─────────────────────────────────────────────────────────────┐
│                    route-forge 生态                          │
│                                                             │
│  ┌──────────────────┐    forge 上下文 JSON    ┌────────────┴──────────┐
│  │  route-forge/laravel │ ──────────────────▶ │   @route-forge/core    │
│  │  (后端 PHP 包)       │   Blade @forgeSummary│   (前端 TS 核心库)      │
│  │                     │                      │                        │
│  │ · 注册命名路由       │                      │ · route() 核心实现     │
│  │ · 生成 forge 上下文  │                      │ · 类型定义 / 推断       │
│  │ · @forgeSummary 指令 │                      │ · 路由表解析           │
│  └──────────────────┘                      └────────────┬──────────┘
│                                                          │
│                                                          │ 上层封装
│                                                          ▼
│                                               ┌──────────────────────┐
│                                               │   @route-forge/react │
│                                               │   (React 适配器)      │
│                                               │                      │
│                                               │ · <RouteForgeProvider>│
│                                               │ · useRouteForge() Hook│
│                                               │ · <ForgeLink> 组件   │
│                                               └──────────────────────┘
└─────────────────────────────────────────────────────────────┘
```

| 包 | 语言 | 职责 | 在本项目中的版本 |
|----|------|------|-----------------|
| `route-forge/laravel` | PHP | 从 Laravel 路由表提取命名路由 → 生成 forge 上下文 JSON → 通过 `@forgeSummary` Blade 指令注入 HTML | ^1.4 |
| `@route-forge/core` | TypeScript | 解析 forge 上下文 → 提供框架无关的 `route()` 函数 + 类型定义 | ^2.2 |
| `@route-forge/react` | TypeScript | 把 core 包装成 React Provider 和 Hook，适配 React 19 组件树 | ^2.2 |

> 💡 如果你用的是 Vue，对应有 `@route-forge/vue`；用的是纯 SPA 不依赖框架，直接用 `@route-forge/core` 即可。

## 请求链路图

一个 HTTP 请求从发起到渲染，route-forge 在其中的位置：

```
浏览器请求 / (首页)
    │
    ▼
Laravel 路由分发
    │
    ▼
HomeController::index()
    │
    ▼
Blade 渲染 resources/views/home.blade.php
    │  继承 layout.blade.php
    │  └── @forgeSummary 指令在此展开
    │      把 Route::getRoutes() 中所有命名路由
    │      序列化成 JSON 注入 <script> 标签
    ▼
完整 HTML 返回浏览器（内含 forge 上下文 JSON + <div id="root">）
    │
    ▼
Vite 加载 resources/js/main.tsx
    │
    ▼
createRoot() → <RouteForgeProvider> → 读取 window.__FORGE__
    │
    │ Provider 在首次渲染前：
    │  1. 读取 @forgeSummary 注入的 JSON
    │  2. 校验结构版本
    │  3. 构建内部路由表 Map<name, ForgeRoute>
    │  4. 通过 React Context 暴露 route()
    ▼
<App /> 渲染 → React 渲染 App.tsx
    │
    │ 任何子组件都可以：
    │  const { route } = useRouteForge();
    │  route('home')           → "/"
    │  route('admin.users.edit', { user: 3 })  → "/admin/users/3"
    ▼
用户看到完整页面（React 渲染 + 类型安全导航）
```

## 本项目的集成全景

用一张表把「本仓库里哪些文件负责什么」和 route-forge 三包对应起来：

| 文件 | 负责的包 | 做了什么 |
|------|---------|---------|
| `resources/views/layout.blade.php` | `route-forge/laravel` | `@forgeSummary` 注入 forge 上下文 |
| `resources/js/main.tsx` | `@route-forge/react` + `@route-forge/core` | `<RouteForgeProvider>` 包裹应用 |
| `resources/js/App.tsx` (及后续业务组件) | `@route-forge/react` | 通过 `useRouteForge()` / `route()` 做导航（待落地） |
| `routes/web.php`（待创建） | `route-forge/laravel` | 定义命名路由 → 自动进入 forge 上下文 |
| `resources/js/types/forge.d.ts`（自动产出） | `@route-forge/core` | 类型下发，让 TS 知道每个路由的参数签名 |

## 核心概念速查

| 概念 | 说明 |
|------|------|
| **命名路由 (Named Route)** | Laravel 中 `Route::name('xxx')` 给路由起的名字，是 route-forge 一切的起点 |
| **forge 上下文 (Forge Context)** | `route-forge/laravel` 从路由表中提取的 JSON 结构，包含每个命名路由的 URI、方法、参数签名 |
| **@forgeSummary** | Blade 指令，在 HTML 中注入 forge 上下文的 JSON 脚本标签 |
| **RouteForgeProvider** | `@route-forge/react` 导出的 React Context Provider，必须在根组件处包裹 |
| **useRouteForge()** | `@route-forge/react` 导出的 Hook，在任意子组件中获取 `route()` 等 API |
| **route('name', params)** | 框架无关的 URL 生成函数，由 `@route-forge/core` 实现 |
| **类型下发 (Type Generation)** | forge 上下文可被代码生成工具消费，产出 TypeScript 类型定义文件 |

---

继续阅读：[02 · 后端接入](02-backend-integration.md) →
