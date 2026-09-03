# 03 · 前端接入：@route-forge/react

> 读完本文你会知道：如何用 `<RouteForgeProvider>` 包裹 React 应用、如何用 `useRouteForge()` Hook 调用 `route()`、
> TypeScript 类型怎么联动、以及常见坑的规避方式。

---

## 目录

- [安装](#安装)
- [RouteForgeProvider 初始化](#routeforgeprovider-初始化)
- 在组件中使用 route() Hook](#在组件中使用-route-hook)
- TypeScript 类型推断](#typescript-类型推断)
- 错误处理与边界情况](#错误处理与边界情况)
- 进阶用法](#进阶用法)
- [常见问题](#常见问题)

---

## 安装

前端两个包已在 `package.json` 中声明：

```json
{
  "dependencies": {
    "@route-forge/core": "^2.2.0",
    "@route-forge/react": "^2.2.0"
  }
}
```

首次安装：

```bash
npm install @route-forge/core @route-forge/react
# 或 pnpm add @route-forge/core @route-forge/react
```

## RouteForgeProvider 初始化

这是本项目的实际代码，位于 `resources/js/main.tsx`：

```tsx
import { RouteForgeProvider } from '@route-forge/react';
import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import 'virtual:uno.css';

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <RouteForgeProvider>
      <App />
    </RouteForgeProvider>
  </React.StrictMode>
);
```

### 为什么用 Provider 模式

React 没有 Vue 的插件 / 全局属性机制。`@route-forge/react` 用 React Context + Provider 模式把 forge 实例注入到组件树，子组件通过 `useRouteForge()` Hook 消费。这是 React 生态中提供共享状态的标准做法。

Provider 在首次渲染时会读取 `window.__FORGE__` 并构建路由表。只要 Provider 挂载成功，所有子组件就能立即调用 `route()` —— 不需要像 Vue 那样等待 `ready()` 回调。

### Provider 配置项

`<RouteForgeProvider>` 接受以下可选 props：

```tsx
<RouteForgeProvider
  // 默认从 window.__FORGE__ 读取；如果后端改了变量名这里也要对应改
  globalVariableName="__FORGE__"

  // 开发模式下打印详细日志（路由注册、参数校验等）
  debug={import.meta.env.DEV}

  // 找不到路由时的行为
  // 'error'   → 抛出异常（开发推荐）
  // 'warn'    → console.warn 并返回空字符串
  // 'silent'  → 静默返回空字符串
  onMissingRoute="error"

  // 参数校验严格模式：类型不匹配也报错
  strictParams={true}
>
  <App />
</RouteForgeProvider>
```

## 在组件中使用 route() Hook

### 函数式组件中（推荐）

```tsx
import React from 'react';
import { useRouteForge } from '@route-forge/react';

export function CatalogList() {
  const { route, routes, hasRoute } = useRouteForge();

  return (
    <div>
      {/* 生成简单 URL */}
      <a href={route('home')}>首页</a>

      {/* 带参数 */}
      <a href={route('admin.users.edit', { user: 3 })}>编辑用户</a>

      {/* 可选参数留空 */}
      <a href={route('blog.posts.show', { slug: 'hello' })}>文章</a>

      {/* 带 query string */}
      <a href={route('products.index', {}, { query: { page: 2 } })}>下一页</a>

      {/* 绝对 URL */}
      <a href={route('home', {}, { absolute: true })}>外链首页</a>
    </div>
  );
}
```

### 配合 React Router

route-forge **不是** 路由管理器（那是 React Router / TanStack Router 的事），它只负责 **URL 生成**。两者配合：

```tsx
import { Link, useNavigate } from 'react-router-dom';
import { useRouteForge } from '@route-forge/react';

function NavBar() {
  const { route } = useRouteForge();
  const navigate = useNavigate();

  return (
    <nav>
      {/* 声明式：用 React Router 的 Link + route-forge 生成 URL */}
      <Link to={route('home')}>首页</Link>
      <Link to={route('catalog.show', { slug: 'company-intro' })}>公司画册</Link>

      {/* 编程式 */}
      <button onClick={() => navigate(route('products.show', { category: 'hardware', slug: 'router-x1' }))}>
        Router X1
      </button>
    </nav>
  );
}
```

### 返回值速查

`route(name, params, options)` → `string`

| 参数 | 类型 | 说明 |
|------|------|------|
| `name` | `string` | 路由名，如 `'admin.users.edit'` |
| `params` | `object` | 路由参数键值对 |
| `options` | `object` | 可选配置 |
| `options.query` | `object` | 追加的 query string，如 `{ page: 2, sort: 'name' }` |
| `options.absolute` | `boolean` | 是否返回绝对 URL（基于后端 `baseUrl`） |
| `options.signed` | `boolean` | 是否签名 URL（对应 Laravel 的 URL::signedRoute） |

`useRouteForge()` 返回：

| 属性 | 类型 | 说明 |
|------|------|------|
| `route(name, params?, options?)` | `function` | URL 生成函数 |
| `routes` | `ForgeRoute[]` | 当前所有已注册路由的只读列表 |
| `hasRoute(name)` | `(name: string) => boolean` | 判断某路由是否存在 |
| `forge` | `Forge` | 原始 Forge 实例（一般不需要直接用） |

## TypeScript 类型推断

如果项目中有 `forge:types` 生成的类型文件（见 [02 · 后端接入](02-backend-integration.md#生成-typescript-类型)），`route()` 的参数类型会自动联动。

### 配置 tsconfig.json

确保类型文件在 `tsconfig.json` 的 include 范围内：

```json
{
  "compilerOptions": {
    "include": [
      "resources/js/**/*.d.ts",
      "resources/js/**/*.ts",
      "resources/js/**/*.tsx"
    ]
  }
}
```

### 有类型 vs 无类型

```typescript
// ❌ 没有类型文件：params 是 any，完全无提示
route('admin.users.edit', { xxx: 3 });  // 编译通过，运行时报错

// ✅ 有 forge.d.ts：参数签名被约束
route('admin.users.edit', { user: 3 });     // ✅ OK
route('admin.users.edit', { xxx: 3 });      // ❌ TS 报错：Object literal may only specify known properties
route('blog.posts.show', { slug: 'hello' }); // ✅ category 是可选的
route('blog.posts.show', {});                // ❌ TS 报错：缺少必需的 slug
```

React + TypeScript 项目天然享受完整的类型提示，不需要额外的编辑器插件（不像 Vue 需要 Volar）。VS Code 的内置 TS 服务就能搞定。

## 错误处理与边界情况

### 路由名不存在

开发模式（`onMissingRoute: 'error'`）：

```
Uncaught Error: [route-forge] Route "admin.userz.edit" not found. Did you mean "admin.users.edit"?
```

注意它会做 **拼写建议**，帮你找到最可能的正确路由名。

### 缺少必填参数

```
Uncaught Error: [route-forge] Missing required param "user" for route "admin.users.edit".
```

### 参数值包含特殊字符

route-forge 会自动对参数值做 `encodeURIComponent`：

```ts
route('catalog.show', { slug: '企业画册 2024' });
// → "/catalog/%E4%BC%81%E4%B8%9A%E7%94%BB%E5%86%8C%202024"
```

### 可选参数未传

```ts
// 定义: /blog/{category?}/{slug}
route('blog.posts.show', { slug: 'hello' });
// → "/blog/hello"（可选参数段被移除）
```

## 进阶用法

### 在非 React 文件中使用

某些场景（如 React Router 导航守卫、工具函数、store）里没有组件上下文，可以直接用 `@route-forge/core`：

```ts
import { createForge } from '@route-forge/core';

// 手动创建 Forge 实例（必须已经有 window.__FORGE__）
const forge = createForge(window.__FORGE__);

forge.route('admin.users.edit', { user: 3 });
forge.hasRoute('home');
```

### 在 React Router 的 loader / action 中

```tsx
// routes.tsx
import { createBrowserRouter } from 'react-router-dom';
import { createForge } from '@route-forge/core';

const forge = createForge(window.__FORGE__);

export const router = createBrowserRouter([
  {
    path: forge.route('products.show', { category: ':category', slug: ':slug' }),
    element: <ProductDetail />,
    loader: async ({ params }) => {
      // ... 真正的参数在 params.category / params.slug 里
    },
  },
]);
```

或者更推荐的做法：**React Router 的 path 用 `/products/:category/:slug` 这种动态段**，而 `route()` 只在组件内用于生成具体的跳转 URL。两者职责分离。

### Zustand / Redux store 中调用

Store 没有 React Context，用 `@route-forge/core` 直接创建：

```ts
// stores/catalog.ts
import { create } from 'zustand';
import { createForge } from '@route-forge/core';

const forge = createForge(window.__FORGE__);

interface CatalogState {
  selectedSlug: string | null;
  goToDetail: (slug: string) => void;
}

export const useCatalogStore = create<CatalogState>((set, get) => ({
  selectedSlug: null,
  goToDetail: (slug) => {
    const url = forge.route('catalog.show', { slug });
    window.location.href = url; // 或用 navigate()
  },
}));
```

### 服务端渲染（SSR）

如果项目用了 Next.js 或 Vite SSR，`window.__FORGE__` 在服务端不可用。`@route-forge/react` 支持直接传入 forge 上下文对象：

```tsx
// Next.js app/layout.tsx 或 SSR 入口
import forgeContext from './forge.context.json';
import { RouteForgeProvider } from '@route-forge/react';

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <RouteForgeProvider forge={forgeContext}>
          {children}
        </RouteForgeProvider>
      </body>
    </html>
  );
}
```

forge 上下文 JSON 可以在构建时由后端预生成（`php artisan forge:export forge.context.json`）。

---

继续阅读：[04 · 企业画册栏目结构](04-catalog-structure.md) →
