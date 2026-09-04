# 02 · 后端接入：route-forge/laravel

> 读完本文你会知道：`route-forge/laravel` 如何安装与配置、路由怎么归入层级、`@forgeSummary`
> 注入的是什么、端点体系怎么工作、以及如何生成前端类型文件。所有 API 均以 1.4 版真实行为为准。

---

## 目录

- [安装与配置](#安装与配置)
- [层级（levels）配置](#层级levels配置)
- [路由归级的三条通道](#路由归级的三条通道)
- [本项目路由规划](#本项目路由规划)
- [@forgeSummary 指令](#forgesummary-指令)
- [端点体系](#端点体系)
- [生成 TypeScript 类型](#生成-typescript-类型)
- [strict_mode 与其他配置](#strict_mode-与其他配置)

---

## 安装与配置

`route-forge/laravel` 已在 `composer.json` 中声明：

```json
{
  "require": {
    "route-forge/laravel": "^1.4"
  }
}
```

```bash
composer require route-forge/laravel
```

Laravel 11+ 的 Package Discovery 自动注册服务提供者。配置文件发布到宿主项目后就是
`config/forge.php`（本仓库已含一份带完整注释的配置）：

```bash
php artisan vendor:publish --tag=forge-config
```

## 层级（levels）配置

route-forge 不预设固定层级，层级完全由 `config/forge.php` 的 `levels` 键自定义。本项目的规划：

```php
'levels' => [
    // 前台：公开数据接口，浏览器首屏就要用 → eager
    'public' => [
        'description' => '企业画册前台公开数据接口（无需登录）',
        'match' => [
            'prefix'     => ['api'],      // URI 以 /api 开头即命中
            'middleware' => [],
        ],
        'load' => 'eager',
    ],

    // 管理端：基础资料/分类/画册/画册页的维护接口 → lazy + 受保护
    'manage' => [
        'description' => '企业管理端接口（需登录）',
        'match' => [
            'prefix'     => ['manage'],   // 与 middleware 是 OR 关系，命中任一即归级
            'middleware' => ['manage'],
        ],
        'load' => 'lazy',
        'endpoint_middleware' => ['manage'],   // 层级明细端点本身也要登录
    ],
],
```

| 字段                     | 说明                                                    |
|--------------------------|---------------------------------------------------------|
| `description`            | 层级描述，仅用于文档与调试输出                          |
| `match.prefix`           | URI 前缀匹配列表，命中任一即归入此层级                  |
| `match.middleware`       | 中间件匹配列表，与 prefix 是 **OR** 关系                |
| `match.middleware_match` | 中间件匹配模式：`'any'`（OR）/ `'all'`（AND）/ DNF 数组 |
| `load`                   | `eager` = 随摘要注入首屏；`lazy` = 前端登录后按需拉取   |
| `endpoint_middleware`    | 访问该层级明细端点要求的中间件；未配置则不限制          |

## 路由归级的三条通道

优先级从高到低：

### ① 显式 tier（宏，最高优先级）

`->tier()` 是注册在 `Illuminate\Routing\Route` 上的宏， **必须后置链式**：

```php
// ✅ 正确：先定义路由，再链式归级
Route::post('/login', [AuthController::class, 'store'])->name('login')->tier('public');

// ❌ 错误：写成 Route::tier('public')->post(...)
//    会先进 RouteRegistrar，tier 连同名称前缀一起被丢弃并抛异常
```

组级归级：

```php
Route::group(['tier' => 'public'], function () {
    // 组内所有路由归 public
});
```

典型用途：把「不符合任何 match 规则」的个别路由单独捞出来。例如管理端的登录/登出接口虽然 URI 在
`/manage` 下，但登录页要在未登录时可用，就得显式 `->tier('public')`。

### ② classifier 回调

`config/forge.php` 的 `classifier`，签名 `fn(Route $r): ?string`，按任意逻辑返回层级名：

```php
'classifier' => fn (\Illuminate\Routing\Route $r): ?string =>
    str_contains($r->getAction()['controller'] ?? '', 'Admin\\') ? 'manage' : null,
```

### ③ match 规则（prefix / middleware）

见上文 levels 配置。适合成批路由（如 `/api` 前缀整批归 public）。

> ⚠️ 本项目开启 `strict_mode`：三条通道都没命中的路由直接抛
> `RouteTierNotAssignedException`（500）。宁可 fails-fast，也不要静默掉进 `unassigned`。

## 本项目路由规划

前后端分离下，后端只出 JSON API。路由分两组：

### 公开数据接口（routes/api.php，level: public）

| 路由名                 | 方法 | URI                    | 说明                     |
|------------------------|------|------------------------|--------------------------|
| `api.site.show`        | GET  | `/api/site`            | 站点基础资料             |
| `api.categories.index` | GET  | `/api/categories`      | 分类列表                 |
| `api.catalogs.index`   | GET  | `/api/catalogs`        | 画册列表（可按分类筛选） |
| `api.catalogs.show`    | GET  | `/api/catalogs/{slug}` | 画册详情（含全部页数据） |

### 管理端接口（routes/manage.php，level: manage，prefix `/manage`）

| 路由名                                                | 方法       | URI                                            | 说明                      |
|-------------------------------------------------------|------------|------------------------------------------------|---------------------------|
| `manage.login` / `manage.logout`                      | POST       | `/manage/login` / `/manage/logout`             | 登录登出（显式归 public） |
| `manage.api.site.update`                              | PUT        | `/manage/api/site`                             | 基础资料维护              |
| `manage.api.categories.*`                             | CRUD       | `/manage/api/categories`                       | 分类管理                  |
| `manage.api.catalogs.index/store/show/update/destroy` | CRUD       | `/manage/api/catalogs`                         | 画册管理                  |
| `manage.api.catalogs.pages.index/store`               | GET/POST   | `/manage/api/catalogs/{catalog}/pages`         | 画册页列表/新增           |
| `manage.api.catalogs.pages.reorder`                   | POST       | `/manage/api/catalogs/{catalog}/pages/reorder` | 页排序                    |
| `manage.api.pages.update/destroy`                     | PUT/DELETE | `/manage/api/pages/{page}`                     | 页编辑/删除               |

命名规范：`{scope}.{resource}.{action}`，点分隔、全小写。forge 摘要会收录全部命名路由并按 层级归类，前端凭名字调用。

## @forgeSummary 指令

前后端分离下，Blade 只剩一个壳页 `resources/views/index.blade.php`。指令放在 **`<head>` 里、
`@vite` 之前**：

```blade
<head>
  ...
  @forgeSummary
  @vite(['resources/css/app.css', 'resources/js/app.js'])
</head>
```

注入的不是完整 JSON，而是一段 **一次性访问器脚本**：用 `defineProperty` 定义
`window.__ROUTE_FORGE__`，前端第一次读取即返回 forge 摘要并自动删除属性 —— 不留全局残留， 也避免后续脚本误改。

> ⚠️ 顺序契约：`@forgeSummary` 必须早于前端 bundle 求值。放 `<head>` 且 `@vite` 里的 app.js
> 是 `type=module`（defer 语义），顺序天然成立；若改成非 defer 的普通脚本，会静默失效。

## 端点体系

Blade 注入之外的 HTTP 通道，前缀默认 `/_forge/routes`（`FORGE_ENDPOINT_PREFIX` 可覆盖）：

| 端点                            | 说明                                                                    |
|---------------------------------|-------------------------------------------------------------------------|
| `GET /_forge/routes`            | 摘要端点：全部 eager 层级 + 各层级状态                                  |
| `GET /_forge/routes/{level}`    | 层级明细端点：该层级全部路由元信息；受该层级 `endpoint_middleware` 保护 |
| `GET /_forge/routes/unassigned` | 仅 `strict_mode=false` 时存在，收容未归级路由                           |

懒加载层级（本项目 `manage`）正是靠明细端点工作：前端登录后首次调用 `useForgeApi({ level: 'manage' })`
时自动请求 `GET /_forge/routes/manage`，拿到路由明细后构建管理端路由表。

另有一个调试用的 **管理器页面** `/_forge/manager*`，仅在 `APP_DEBUG=true` 时注册，并有
`manager_allowed_ips` IP 白名单（默认仅本机）—— 生产环境双保险下不可见。

## 生成 TypeScript 类型

```bash
php artisan route:forge:types --out=resources/js/types/forge-routes.d.ts
```

| 选项       | 说明                                  |
|------------|---------------------------------------|
| `--out=`   | 写入指定文件路径；不传则输出到 stdout |
| `--level=` | 仅生成指定层级下的路由类型            |
| `--json`   | 输出 JSON 对象格式（键为路由名）      |

生成的类型让前端 `route()` 的路由名与参数被 TS 约束：

```typescript
// AUTO-GENERATED — DO NOT EDIT MANUALLY
route('api.catalogs.show', { slug: 'company-2026' });  // ✅
route('api.catalogs.show', {});                        // ❌ 缺 slug，编译报错
route('api.catalog.show', { slug });                   // ❌ 名字拼错，编译报错
```

配套命令：

```bash
php artisan route:forge:list              # 路由清单（含层级、Alias Of 列，--aliases 过滤）
php artisan route:forge:clear             # 清空 forge 缓存
```

## strict_mode 与其他配置

`config/forge.php` 其余关键项：

| 配置                  | 本项目取值 | 说明                                                                  |
|-----------------------|------------|-----------------------------------------------------------------------|
| `strict_mode`         | `true`     | 未归级路由抛异常（见上文）                                            |
| `endpoint_prefix`     | 默认       | `/_forge/routes`，可用 `FORGE_ENDPOINT_PREFIX` 覆盖                   |
| `cache_ttl`           | 3600       | 端点缓存秒数；`null` 不缓存，`0` 永久缓存                             |
| `aliases`             | `[]`       | 路由别名映射（旧名 → 新名），也可用宏 `->forgeAlias('旧名')` 显式声明 |
| `scheme_version`      | 1          | 摘要响应格式版本，前端据此做版本兼容                                  |
| `manager_allowed_ips` | 仅本机     | 管理器页面 IP 白名单（仅 APP_DEBUG 下有意义）                         |

别名是路由改名的过渡手段：旧名与真实路由指向完全相同的元信息，类型文件也会为别名生成条目。
改名稳定后应及时清理，避免两套名字长期并存。

---

继续阅读：[03 · 前端接入](03-frontend-integration.md) →
