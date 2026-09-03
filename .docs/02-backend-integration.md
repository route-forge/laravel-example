# 02 · 后端接入：route-forge/laravel

> 读完本文你会知道：如何安装 `route-forge/laravel`、如何定义命名路由、`@forgeSummary`
> 指令到底注入了什么、以及如何生成类型文件。
>
> ⚠️ **本文的后端内容与 Vue 版完全一致** —— `route-forge/laravel` 是框架无关的后端包，
> 只负责生成 forge 上下文 JSON，不关心前端是 Vue、React 还是原生 JS。

---

## 目录

- [安装](#安装)
- [定义命名路由](#定义命名路由)
- [@forgeSummary 指令](#forgesummary-指令)
- [forge 上下文结构](#forge-上下文结构)
- [生成 TypeScript 类型](#生成-typescript-类型)
- [路由缓存注意事项](#路由缓存注意事项)
- [常见问题](#常见问题)

---

## 安装

`route-forge/laravel` 已在 `composer.json` 中声明：

```json
{
  "require": {
    "route-forge/laravel": "^1.4"
  }
}
```

首次安装：

```bash
composer require route-forge/laravel
```

Laravel 11+ 的 Package Discovery 会自动注册服务提供者，无需手动配置。

### 发布配置（可选）

```bash
php artisan vendor:publish --tag=route-forge-config
```

会生成 `config/route-forge.php`，可配置：

```php
return [
    'inject_route_summary' => true,        // 是否自动注入 @forgeSummary
    'summary_variable_name' => '__FORGE__', // 前端读取的全局变量名
    'include_api_routes' => true,           // 是否包含 routes/api.php 的路由
    'exclude_patterns' => [                 // 要排除的路由名称 pattern
        'debugbar.*',
        'telescope.*',
    ],
];
```

## 定义命名路由

route-forge 的一切都始于 **命名路由**。没有名字的路由不会出现在 forge 上下文中。

### 基本写法

```php
// routes/web.php

use Illuminate\Support\Facades\Route;

// 单路由命名
Route::name('home')->get('/', [HomeController::class, 'index']);

// 分组前缀命名（推荐）
Route::name('about.')->group(function () {
    Route::get('/about', [AboutController::class, 'index']);      // → about.index
    Route::get('/about/team', [AboutController::class, 'team']);  // → about.team
});

// resource 路由自动命名
Route::resource('products', ProductController::class);
// → products.index, products.create, products.store, products.show,
//   products.edit, products.update, products.destroy
```

### 参数签名

路由参数会被自动解析并出现在 forge 上下文的 `params` 字段中：

```php
Route::name('admin.users.edit')->get('/admin/users/{user}', ...);
// params: [{ name: 'user', required: true, type: 'int|string' }]

Route::name('blog.posts.show')->get('/blog/{category?}/{slug}', ...);
// params: [
//   { name: 'category', required: false, type: 'string' },
//   { name: 'slug', required: true, type: 'string' }
// ]
```

### 本项目的画册路由规划

这是本项目 P1 阶段要落地的路由表设计，供你参考命名风格：

```php
// routes/web.php

// 品牌首页
Route::name('home')->get('/', ...);

// 画册主栏目
Route::name('catalog.')->group(function () {
    Route::name('index')->get('/catalog', ...);                    // 画册列表
    Route::name('show')->get('/catalog/{slug}', ...);              // 画册详情
});

// 关于我们
Route::name('about.')->group(function () {
    Route::name('company')->get('/about', ...);                    // 公司简介
    Route::name('team')->get('/about/team', ...);                  // 团队
    Route::name('contact')->get('/contact', ...);                  // 联系方式
});

// 产品展示
Route::name('products.')->group(function () {
    Route::name('index')->get('/products', ...);                   // 产品列表
    Route::name('category')->get('/products/{category}', ...);     // 分类筛选
    Route::name('show')->get('/products/{category}/{slug}', ...);  // 产品详情
});
```

## @forgeSummary 指令

在 Blade 布局中放一行：

```blade
{{-- resources/views/layout.blade.php --}}
@forgeSummary
```

这行指令在 Blade 编译时被展开，最终注入到 HTML 中的内容大致是：

```html
<script>
window.__FORGE__ = {
  routes: {
    "home": {
      uri: "/",
      methods: ["GET"],
      params: []
    },
    "admin.users.edit": {
      uri: "/admin/users/{user}",
      methods: ["GET"],
      params: [{ name: "user", required: true }]
    },
    // ... 所有命名路由
  },
  version: "1.4.0"
};
</script>
```

### 放置位置

**必须在前端 main.tsx 加载之前**。本项目放在 `</body>` 之前（Blade 中 `@forgeSummary` 之后紧接 `@vite` 的脚本）：

```blade
<body>
  <div id="root"></div>
  @forgeSummary          {{-- 注入 JSON --}}
  @vite(['resources/css/app.css', 'resources/js/main.tsx'])  {{-- 然后才加载 JS --}}
</body>
```

> ⚠️ 如果你把 `@forgeSummary` 放在 `<head>` 里或 JS 加载之后，React 的 `RouteForgeProvider` 会因为读不到 `window.__FORGE__` 而初始化失败。

### 自定义变量名

如果 `window.__FORGE__` 这个名字和你现有代码冲突，在 `config/route-forge.php` 中修改：

```php
'summary_variable_name' => '__MY_ROUTES__',
```

前端对应要在 `<RouteForgeProvider>` 里传同样的名字（见 [03 · 前端接入](03-frontend-integration.md)）。

## forge 上下文结构

完整的 forge 上下文 JSON 结构：

```json
{
  "routes": {
    "home": {
      "uri": "/",
      "methods": ["GET", "HEAD"],
      "params": []
    },
    "admin.users.edit": {
      "uri": "/admin/users/{user}",
      "methods": ["GET", "HEAD"],
      "params": [
        {
          "name": "user",
          "required": true,
          "type": "int|string",
          "pattern": null
        }
      ]
    },
    "blog.posts.show": {
      "uri": "/blog/{category?}/{slug}",
      "methods": ["GET", "HEAD"],
      "params": [
        {
          "name": "category",
          "required": false,
          "type": "string",
          "pattern": null
        },
        {
          "name": "slug",
          "required": true,
          "type": "string",
          "pattern": "[a-z0-9-]+"
        }
      ]
    }
  },
  "baseUrl": "https://example.com",
  "version": "1.4.0",
  "generatedAt": "2026-09-03T10:00:00Z"
}
```

| 字段 | 类型 | 说明 |
|------|------|------|
| `routes` | `Record<string, ForgeRoute>` | 以路由名为 key 的路由表 |
| `routes[name].uri` | `string` | Laravel 风格的 URI 模板，含 `{param}` 和 `{param?}` |
| `routes[name].methods` | `string[]` | 该路由响应的 HTTP 方法 |
| `routes[name].params` | `ForgeParam[]` | 参数签名列表 |
| `routes[name].params[].name` | `string` | 参数名（不含 `{}`） |
| `routes[name].params[].required` | `boolean` | 是否必填 |
| `routes[name].params[].type` | `string` | Laravel 推断的类型提示 |
| `routes[name].params[].pattern` | `string \| null` | `->where('param', 'pattern')` 定义的正则约束 |
| `baseUrl` | `string` | 应用的 APP_URL，用于生成绝对 URL |
| `version` | `string` | route-forge/laravel 版本 |
| `generatedAt` | `string` | ISO 8601 生成时间 |

## 生成 TypeScript 类型

`route-forge/laravel` 提供了 Artisan 命令，把 forge 上下文直接写成 `.d.ts` 文件：

```bash
php artisan forge:types resources/js/types/forge.d.ts
```

生成的文件大致长这样：

```typescript
// resources/js/types/forge.d.ts
// AUTO-GENERATED — DO NOT EDIT MANUALLY

export interface ForgeRouteParams {
  home: {};
  "admin.users.edit": { user: number | string };
  "blog.posts.show": { category?: string; slug: string };
  "products.show": { category: string; slug: string };
}

export type ForgeRouteName = keyof ForgeRouteParams;
```

之后在 React 组件里调用 `useRouteForge().route()` 时，TypeScript 就会根据路由名自动提示需要哪些参数：

```typescript
// ✅ 正确：参数完整
route("admin.users.edit", { user: 3 });

// ❌ 错误：缺少必填参数 slug —— TS 立即报错
route("blog.posts.show", { category: "tech" });
```

### 建议集成到开发流程

在 `composer.json` 的 scripts 里加一个钩子：

```json
{
  "scripts": {
    "forge": "@php artisan forge:types resources/js/types/forge.d.ts"
  }
}
```

以后改完路由跑一下：

```bash
composer forge
```

## 路由缓存注意事项

如果你的生产环境使用了 `php artisan route:cache`，需要知道：

| 场景 | forge 上下文是否正确 |
|------|---------------------|
| `php artisan route:cache` 之后访问页面 | ✅ 正确（从缓存的路由表生成） |
| 新增路由但忘了重新 cache | ❌ 缺失新路由 |
| `php artisan route:clear` 之后访问页面 | ✅ 正确（从实时路由表生成） |

**建议**：在部署脚本里，把 `forge:types` 放在 `route:cache` 之后执行。

## 常见问题

### Q: 我用了 route 分组前缀，子路由的名字是什么？

Laravel 的 `Route::name('prefix.')` 会给组内所有路由加上前缀，注意末尾的 `.`：

```php
Route::name('admin.')->group(function () {
    Route::get('/users', ...);  // 名为 admin.users
    Route::get('/roles', ...);  // 名为 admin.roles
});
```

### Q: 我不想某些调试路由出现在 forge 上下文里？

在 `config/route-forge.php` 配置 `exclude_patterns`：

```php
'exclude_patterns' => ['debugbar.*', 'telescope.*', 'horizon.*'],
```

支持通配符 `*` 匹配任意子路由。

### Q: API 路由也能被前端消费吗？

可以。在 `config/route-forge.php` 中：

```php
'include_api_routes' => true,
```

API 路由的 URI 会带上 `/api` 前缀，前端 `route('api.v1.users', ...)` 就能生成 `/api/v1/users`。

### Q: forge 上下文会暴露敏感路由吗？

会。**不要把带后台权限控制的路由名暴露在 forge 上下文里**。用 `exclude_patterns` 排除管理后台路由，或者只在有对应权限的页面里渲染 `@forgeSummary`（可以用 Blade 的 `@can` 包裹）。

---

继续阅读：[03 · 前端接入](03-frontend-integration.md) →
