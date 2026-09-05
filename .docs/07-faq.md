# 07 · FAQ

> 收集 route-forge 使用过程中最常被问到的问题，按后端 / 前端 / 通用分类。所有答案以
> route-forge/laravel 1.4 与 @route-forge/* 2.2 的真实行为为准。

---

## 目录

- [后端相关](#后端相关)
- [前端相关](#前端相关)
- [通用问题](#通用问题)
- [故障排查速查](#故障排查速查)

---

## 后端相关

### Q: route-forge/laravel 和 Laravel 原生的 `route()` 辅助函数是什么关系？

完全无关。Laravel 的 PHP 侧 `route('name', ['param' => 'value'])` 在 Blade 或 Controller 中生成
URL；route-forge/laravel 把路由表元信息按层级导出给前端 JS 消费。两者用同一套命名路由做数据源， 但独立运行。

```blade
{{-- Blade 壳里用 Laravel 原生的（PHP 侧）--}}
<a href="{{ route('home') }}">首页</a>
```

```vue
<!-- Vue 里用 route-forge 的（JS 侧）-->
<router-link :to="route('api.catalogs.show', { slug })">画册详情</router-link>
```

### Q: 没有命名的路由会被纳入 forge 摘要吗？

不会。只有显式命名的路由才进入 forge 摘要。没有名字意味着不可引用，前端也不需要知道它。

### Q: 路由忘记归级了会怎样？

本项目 `strict_mode = true`：直接抛 `RouteTierNotAssignedException`（500）。这不是缺陷而是设计 ——
未归级路由不进任何层级端点，也不进 `route:forge:types`，如果静默放行，症状会是「路由明明在、
类型和调用都不通」，排查成本远高于一次显式异常。开发期宁可让它炸出来。

### Q: 登录接口在管理端层级里，为什么未登录也能调？

管理端路由整体归 `manage` 层级受保护，但登录页本身要在未登录时可用。做法是给登录/登出显式
归级，把这两个入口从层级保护里捞出来：

```php
Route::post('/login', [AuthController::class, 'store'])->name('login')->tier('public');
```

被公开的只是这两个路由名与 URI，后台其余接口的元信息仍然拿不到。

### Q: `route:cache` 之后 forge 摘要是从缓存读还是实时读？

从缓存读。摘要生成时调用 `Route::getRoutes()`，Laravel 有路由缓存时返回缓存的 RouteCollection。
新增/删除路由后记得重建缓存（`route:cache` / `route:clear`）。端点响应另有 `cache_ttl` 缓存， 路由变更后可用
`route:forge:clear` 清掉 forge 侧缓存。

### Q: 路由改名了，前端要同步改吗？

过渡期不用。route-forge 提供别名机制：旧名继续可用，指向与新名完全相同的元信息，类型文件也会 为别名生成条目。

```php
// 方式一：路由宏（显式，优先）
Route::get(...)->name('api.items.index')->forgeAlias('api.products.index');

// 方式二：config/forge.php（批量、集中管理）
'aliases' => [
    'api.products.index' => 'api.items.index',
],
```

别名是过渡手段，改名稳定后应及时清理，避免两套名字长期并存。撞车时真实路由优先；别名指向不 存在的路由名会
fail-fast 抛异常。

## 前端相关

### Q: 我不用 Vue，用 React / 原生 JS，还能用 route-forge 吗？

可以。route-forge 提供多个前端包：Vue 3 用 `@route-forge/vue`，React 用 `@route-forge/react`， 不依赖框架直接用
`@route-forge/core`（`createForge()` 手动建实例，`forge.route()` /
`forge.api()` 全量可用）。

### Q: `route()` 和 vue-router 的 `router.push()` 该用哪个？

- `route()` —— 只负责 **URL 生成**，纯函数
- `router.push(route('xxx', params))` —— 生成 URL 并触发 SPA 导航

vue-router 管「URL → 组件」映射，route-forge 管「路由名 → URL」生成，两者路由名建议一一对应：

```js
// 编程式导航
router.push(route('api.catalogs.show', { slug }));

// 声明式导航
<router-link :to="route('api.catalogs.show', { slug })">画册详情</router-link>
```

### Q: 管理端路由名一调用就报错 / 返回空？

`manage` 层级是 `lazy` 的，路由明细要登录后由 `useForgeApi('manage')` 首次调用时自动拉取。 未就绪时：

- `useForgeRoute()` 生成的 URL 是 `''`（不抛错，模板不崩，就绪后自动补上）
- `useForge('manage').levelLoaded` 是 `Ref<boolean>`，可用它切换骨架屏

如果已登录仍报错，检查后端该层级是否配了 `endpoint_middleware` 且中间件把当前用户拒了。

### Q: 类型文件不更新怎么办？

每次路由变更后重新生成：

```bash
php artisan route:forge:types --out=resources/js/types/route-forge.d.ts
```

还不生效则检查：

1. 生成路径是否在 `jsconfig.json` / `tsconfig.json` 的 include 范围内
2. 编辑器 TS Server 是否需要重启（VS Code：`Cmd/Ctrl+Shift+P` → "TypeScript: Restart TS Server"）

### Q: 能在 pinia store / 非 Vue 文件里调用吗？

可以。`useForgeApi` / `useForge` 是组合式 API，依赖 provide/inject；非 Vue 上下文用
`@route-forge/core` 直接建实例：

```js
import { createForge } from '@route-forge/core';

const forge = createForge(summary);          // 摘要对象或摘要端点地址
forge.route('api.catalogs.show', { slug });
```

### Q: 多个后端应用怎么路由隔离？

层级名、端点前缀、摘要变量名都可配置：

```php
// 应用 A
'endpoint_prefix' => '/_forge/routes',
```

前端实例按应用各自创建即可，`@forgeSummary` 的访问器读后即删，同页多实例互不串味。

## 通用问题

### Q: route-forge 的能力边界是什么？

route-forge 专注做一件事： **命名路由从前端到后端的双向贯通**。它能提供的：

- 按层级归类与分发路由元信息（eager 注入 / lazy 拉取 / 端点保护）
- 类型安全的 URL 生成（`route()`），名字、参数、正则约束全程校验
- 按层级发请求的适配层（`api()` / `useForgeApi`），与 URL 生成共用同一套路由表
- 类型下发（`route:forge:types`）与改名过渡（别名）

它不做的：不是路由管理器（页面路由归 vue-router / React Router），不是状态管理，不是请求库的 替代（HTTP
适配层只为「按路由名调接口」这一件事服务）。

### Q: 路由参数和查询参数有什么区别？

- **路由参数**（Route Params）：URI 模板里的 `{slug}`，属于路由定义，影响匹配，forge 摘要有签名
- **查询参数**（Query Params）：`?page=2`，附加在 URL 末尾，不影响匹配，调用时走 options

```js
call('api.catalogs.index', { query: { category: 'branding', page: 2 } });
route('api.catalogs.show', { slug }, { query: { preview: 1 } });
```

### Q: 项目可以不依赖 route-forge 独立运行吗？

不行。`@forgeSummary` 与插件初始化是启动路径的硬依赖。可以暂时不用 `route()` 做导航退回硬编码
URL，但forge 摘要注入与解析链路保留 —— 这正是下一步迁移回类型安全调用的入口。

### Q: 安全方面需要注意什么？

forge 摘要与层级端点是按设计分级公开的：

| 风险                       | 对策                                                                         |
|----------------------------|------------------------------------------------------------------------------|
| 管理端路由名在登录前暴露   | `manage` 层级 `lazy` + `endpoint_middleware`，未登录连明细端点都进不来       |
| 层级明细端点被滥用         | `endpoint_middleware` 保护；`cache_ttl` 控制缓存；`route:forge:clear` 可清   |
| 调试管理器页面泄露         | 仅 `APP_DEBUG=true` 注册 + `manager_allowed_ips` IP 白名单，生产双保险不可见 |
| 个别路由必须公开但怕误归级 | 显式 `->tier()` 优先级最高，语义清晰                                         |

## 故障排查速查

### `ready()` 报 "window. __ROUTE_FORGE__ is undefined"

| 检查项                     | 怎么查                                                |
|----------------------------|-------------------------------------------------------|
| `@forgeSummary` 是否存在   | 在 `index.blade.php` 里搜                             |
| 是否早于 bundle 求值       | `<head>` 里、`@vite` 之前；app.js 须保持 module/defer |
| 摘要端点是否可用           | `curl http://localhost:8000/_forge/routes`            |
| 路由是否有命名且已归级     | `php artisan route:forge:list`                        |
| forge 端点缓存是否过期内容 | `php artisan route:forge:clear` 后刷新                |

### `route('xxx')` 报 "Route not found"

| 检查项                       | 怎么查                            |
|------------------------------|-----------------------------------|
| 路由名是否真的存在           | `php artisan route:forge:list`    |
| 拼写 / 点分隔 / 大小写       | 报错信息自带最接近名字建议        |
| 是否是 lazy 层级还没加载     | 看 `levelLoaded`；登录后重试      |
| 是否在别名清理期用了已删旧名 | `route:forge:list --aliases` 核对 |

### `route()` 参数类型 TS 不报错 / 报错不对

| 检查项                               | 怎么查                                 |
|--------------------------------------|----------------------------------------|
| `route-forge.d.ts` 是否存在且最新   | 重跑 `route:forge:types --out=...`     |
| 是否在 include 范围                  | 检查 `jsconfig.json` / `tsconfig.json` |
| 是否重跑了类型命令但没重启 TS Server | Restart TS Server                      |

### 生成的 URL 和预期不符

| 检查项                | 怎么查                           |
|-----------------------|----------------------------------|
| `APP_URL` 是否正确    | `.env` 里确认                    |
| 参数顺序              | `route()` 按名字匹配，与顺序无关 |
| 可选参数没传          | 对应 URL 段会被移除，属预期      |
| 查询参数传进了 params | query 要走 `options.query`       |

---

有其他问题？欢迎在仓库 Issues 里提。
