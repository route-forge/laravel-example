# 07 · FAQ

> 收集 route-forge 使用过程中最常被问到的问题，按后端 / 前端 / 通用分类。

---

## 目录

- [后端相关](#后端相关)
- [前端相关](#前端相关)
- [通用问题](#通用问题)
- [故障排查速查](#故障排查速查)

---

## 后端相关

### Q: route-forge/laravel 和 Laravel 原生的 `route()` 辅助函数是什么关系？

完全无关。Laravel 的 PHP 侧 `route('name', ['param' => 'value'])` 在 Blade 或 Controller 中生成 URL；route-forge/laravel 把路由表元信息导出成 JSON 给前端 JS 消费。两者用同一套命名路由做数据源，但独立运行。

```blade
{{-- Blade 里用 Laravel 原生的（PHP 侧） --}}
<a href="{{ route('catalog.show', ['slug' => 'hello']) }}">链接</a>
```

```tsx
// React 里用 route-forge 的（JS 侧）
import { useRouteForge } from '@route-forge/react';

function Link() {
  const { route } = useRouteForge();
  return <a href={route('catalog.show', { slug: 'hello' })}>链接</a>;
}
```

### Q: 没有命名的路由会被纳入 forge 上下文吗？

不会。只有调用了 `->name()` 或 `Route::name('xxx')` 显式命名的路由才会出现在 forge 上下文中。这是设计选择 —— 没有名字意味着不可引用，前端也不需要知道它。

### Q: 我在路由定义里用了 `->where('param', 'pattern')`，这个约束会出现在 forge 上下文里吗？

会。它会被序列化成 forge 上下文 `params[].pattern` 字段。前端 `route()` 在 `strictParams: true` 模式下会校验参数值是否匹配 pattern。

### Q: `php artisan route:cache` 之后 forge 上下文是从缓存读还是实时读？

从缓存读。`@forgeSummary` 指令在渲染时会调用 `Route::getRoutes()`，Laravel 如果有路由缓存就返回缓存的 RouteCollection。所以：

- 新增路由 → `php artisan route:clear` 或 `php artisan route:cache` 重建
- 删除路由 → 同上

### Q: 我不想让所有 API 路由都被导出，怎么做？

```php
// config/route-forge.php
'include_api_routes' => false,
```

或者用 `exclude_patterns` 排除特定命名模式：

```php
'exclude_patterns' => ['api.v1.admin.*', 'debugbar.*'],
```

### Q: forge 上下文有大小限制吗？

技术上没有。但如果你的项目有几千条命名路由，生成的 JSON 可能达到几十 KB，会让每个页面多加载一份。建议：

- 用 `exclude_patterns` 排除前端不需要的路由
- 或者只在有需要的页面渲染 `@forgeSummary`（用 Blade `@if` 包裹）

---

## 前端相关

### Q: 我不用 React，用 Vue / 原生 JS，还能用 route-forge 吗？

可以。route-forge 提供了多个前端包：

| 框架 | 包 |
|------|---|
| React 18/19 | `@route-forge/react` |
| Vue 3 | `@route-forge/vue` |
| 框架无关 | `@route-forge/core` |

原生 JS 用 `@route-forge/core` 的 `createForge()`：

```js
import { createForge } from '@route-forge/core';

const forge = createForge(window.__FORGE__);
forge.route('catalog.show', { slug: 'hello' });
```

### Q: `route()` 和 React Router 的 `navigate()` / `Link` 该用哪个？

- `route()` —— 只负责 **URL 生成**，纯函数
- `navigate(route('xxx', params))` —— 生成 URL 并触发导航
- `<Link to={route('xxx', params)}>` —— 声明式导航

两者配合是最佳实践：

```tsx
import { Link, useNavigate } from 'react-router-dom';
import { useRouteForge } from '@route-forge/react';

function CatalogNav() {
  const { route } = useRouteForge();
  const navigate = useNavigate();

  return (
    <nav>
      <Link to={route('catalog.index')}>画册列表</Link>
      <button onClick={() => navigate(route('catalog.show', { slug: 'hello' }))}>
        画册详情
      </button>
    </nav>
  );
}
```

如果项目没有 React Router，`route()` 可以直接作为 `href`：

```tsx
<a href={route('home')}>首页</a>
```

### Q: 类型文件不更新怎么办？

每次路由变更后重新生成：

```bash
php artisan forge:types resources/js/types/forge.d.ts
# 或
composer forge
```

如果还不生效，检查：

1. 生成路径是否在 `tsconfig.json` 的 include 范围内
2. VS Code 是否需要重启 TS Server（`Cmd+Shift+P` → "TypeScript: Restart TS Server"）
3. 确认 `forge.d.ts` 文件确实被更新了（看文件的修改时间）

### Q: 我能在 store / 工具函数 / 非组件文件中调用 `route()` 吗？

`useRouteForge()` 是 React Hook，**只能在组件或自定义 Hook 顶层调用**，不能在普通函数、类、store 里调。非组件上下文用 `@route-forge/core` 直接创建实例：

```ts
// stores/catalog.ts（Zustand 示例）
import { create } from 'zustand';
import { createForge } from '@route-forge/core';

const forge = createForge(window.__FORGE__);

interface CatalogState {
  selectedSlug: string | null;
  goToDetail: (slug: string) => void;
}

export const useCatalogStore = create<CatalogState>((set) => ({
  selectedSlug: null,
  goToDetail: (slug) => {
    const url = forge.route('catalog.show', { slug });
    window.location.href = url;
  },
}));
```

### Q: SSR / Next.js 环境下 `window.__FORGE__` 不存在怎么办？

服务端渲染时没有 `window` 对象。`@route-forge/react` 支持通过 Provider props 直接传入 forge 上下文：

```tsx
// Next.js app/layout.tsx
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

### Q: 多个 Laravel 应用怎么路由隔离？

`globalVariableName` 配置解决：

```php
// 应用 A
'summary_variable_name' => '__FORGE_A__';

// 应用 B
'summary_variable_name' => '__FORGE_B__';
```

前端对应配置：

```tsx
<RouteForgeProvider globalVariableName="__FORGE_A__">
  <AppA />
</RouteForgeProvider>
```

---

## 通用问题

### Q: route-forge 和 Ziggy 有什么区别？

[Ziggy](https://github.com/tighten/ziggy) 是另一个 Laravel 路由 JS 包。核心差异：

| 维度 | route-forge | Ziggy |
|------|-------------|-------|
| 架构 | 三包分离（core + 框架适配器 + laravel） | 单 PHP 包 + 内联 JS |
| React 支持 | 原生 Provider + Hook | 有社区适配但非官方 |
| Vue 3 支持 | 原生插件 + 组合式 API | 有社区适配但非官方 |
| 类型生成 | 内置 `forge:types` 命令 | 需配合 ziggy-js-types |
| 多框架 | Vue / React / core 任选 | 主要面向 Laravel + 原生 / Alpine |
| 生态定位 | 完整的前后端路由类型安全方案 | Laravel 生态的 route() 到 JS 移植 |

两者解决的问题相同，选哪个取决于你项目的框架栈和团队偏好。

### Q: 路由参数和查询参数有什么区别？

- **路由参数**（Route Params）：URI 模板里的 `{slug}`，属于路由定义的一部分，影响路由匹配
- **查询参数**（Query Params）：`?page=2&sort=name`，附加在 URL 末尾，不影响路由匹配

```ts
// 路由参数（必填，forge 上下文有定义）
route('catalog.show', { slug: 'hello' });
// → /catalog/hello

// 查询参数（可选，通过 options.query 传入）
route('catalog.index', {}, { query: { page: 2 } });
// → /catalog?page=2

// 同时传
route('catalog.show', { slug: 'hello' }, { query: { preview: 1 } });
// → /catalog/hello?preview=1
```

### Q: 项目可以不依赖 route-forge 独立运行吗？

不行。一旦你在 Blade 布局里用了 `@forgeSummary`、在 `main.tsx` 里用了 `<RouteForgeProvider>`，它们就是启动路径的硬依赖。但你可以：

- 暂时不用 `route()` 做导航，退回硬编码 URL
- 或者在 Blade 里用 `@if` 条件渲染 `@forgeSummary`

### Q: 安全方面需要注意什么？

forge 上下文是公开的 HTML 内容，**不要在里面暴露敏感的后台路由名**。可能的风险和对策：

| 风险 | 对策 |
|------|------|
| 攻击者知道后台路由名后直接访问 | 后端路由有中间件保护（`Route::middleware('auth')`），名字知道了也进不去 |
| 枚举内部 API 路由 | `exclude_patterns` 排除，或前端根本不引入这些路由 |
| forge 上下文被爬取用于信息收集 | 这是普通 HTTP 响应的一部分，和暴露页面本身的风险相同 |

---

## 故障排查速查

### `RouteForgeProvider` 渲染时报 "window.__FORGE__ is undefined"

| 检查项 | 怎么查 |
|--------|--------|
| `@forgeSummary` 是否存在于 Blade 布局 | 搜索 `@forgeSummary` |
| 是否在 JS 之前加载 | Blade 里 `@forgeSummary` 在 `@vite` 之上 |
| 当前页面是否继承了布局 | 看 `home.blade.php` 有没有 `@extends('layout')` |
| `config/route-forge.php` 的 variable name | 和 Provider 的 `globalVariableName` prop 一致 |
| 路由是否被排除了 | `php artisan route:list` 确认有命名路由 |

### `route('xxx')` 报 "Route not found"

| 检查项 | 怎么查 |
|--------|--------|
| 路由名是否真的存在 | `php artisan route:list --name=xxx` |
| 是否有拼写错误 | 注意点分隔符、大小写 |
| 路由是否在 `exclude_patterns` 里 | 检查配置 |
| 有没有 `route:cache` 之后改了路由没重建 | `php artisan route:clear` 后刷新 |

### `route()` 参数类型 TS 不报错

| 检查项 | 怎么查 |
|--------|--------|
| `resources/js/types/forge.d.ts` 是否存在 | 文件系统里找 |
| 是否是自动生成的 | `composer forge` 重新生成 |
| `tsconfig.json` 是否 include 了这个路径 | 检查配置 |
| VS Code 是否用了正确的 TS 版本 | 底部状态栏看 TS 版本，确保是 Workspace 的 |

### 生成的 URL 和预期不符

| 检查项 | 怎么查 |
|--------|--------|
| `APP_URL` 是否正确 | `.env` 里确认 |
| 参数顺序 | `route()` 按名字匹配，和顺序无关 |
| 可选参数有没有传 | 没传的话对应段会被移除 |
| 是否传了 query 到 params 里 | query 要走 `options.query` |

---

有其他问题？欢迎在仓库 Issues 里提。
