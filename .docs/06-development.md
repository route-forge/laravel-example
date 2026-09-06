# 06 · 开发指南

> 本文面向贡献者和二次开发者 —— 本地环境搭建、代码风格规范、调试技巧、以及踩过的坑汇总。

---

## 目录

- [本地环境搭建](#本地环境搭建)
- [开发工作流](#开发工作流)
- [代码风格规范](#代码风格规范)
- [调试技巧](#调试技巧)
- [常见坑速查表](#常见坑速查表)

---

## 本地环境搭建

### 前置依赖

| 工具     | 最低版本 | 安装方式                                                     |
|----------|----------|--------------------------------------------------------------|
| PHP      | 8.5+     | `php -v` 检查；推荐用 [php.new](https://php.new) 或 Homebrew |
| Composer | 2.x      | `composer -V` 检查                                           |
| Node.js  | 20+      | `node -v` 检查；推荐 nvm / fnm                               |
| pnpm     | 9+       | `corepack enable` 或 `npm i -g pnpm`                         |
| SQLite   | 任意     | PHP 8.5 默认包含 pdo_sqlite 扩展                             |

### 一键安装

```bash
composer setup
```

这一条执行了（见 `composer.json` 的 scripts）：

```
1. composer install                    # PHP 依赖，含 route-forge/laravel
2. 复制 .env.example → .env            # 如果 .env 不存在
3. php artisan key:generate            # 生成 APP_KEY
4. php artisan migrate --force         # 建表（SQLite）
5. npm install --ignore-scripts        # 前端依赖，含 @route-forge/react、react-router
6. npm run build                       # Vite 构建
```

### 环境变量

`.env.example` 的关键项：

```env
APP_NAME="route-forge 画册"
APP_ENV=local
APP_KEY=
APP_DEBUG=true
APP_URL=http://localhost:8000

# 默认 SQLite，零配置可用
DB_CONNECTION=sqlite

# forge 端点前缀（可选覆盖，默认 /_forge/routes）
FORGE_ENDPOINT_PREFIX="/_forge/routes"
```

## 开发工作流

### 日常开发双进程

```bash
composer dev
```

并行跑：

- `php artisan serve` —— 后端 HTTP 服务，默认 `http://127.0.0.1:8000`
- `npm run dev` —— Vite dev server，HMR 生效

### 改了路由之后

1. 改路由定义（`routes/api.php` / `routes/manage.php`），注意归级（tier / match）
2. 刷新浏览器 —— Blade 壳重新渲染，`@forgeSummary` 注入最新 forge 摘要
3. 重新生成前端类型：

```bash
php artisan route:forge:types --out=resources/js/types/forge-routes.d.ts
```

### 跑测试

```bash
composer test
```

测试覆盖三类关注点：forge 摘要元信息、公开 API 行为、管理端访问控制。提交前必须全量通过。

### 代码格式化

```bash
# 后端（Laravel Pint）
./vendor/bin/pint

# 前端（Prettier，注意改配置后加 --no-cache）
npm run format
npm run format:check   # CI 用
```

> ⚠️ Prettier 3 CLI 的 `--write` 默认启用缓存，改了 prettier 配置后必须加
> `--no-cache` 才会真正重新格式化。

## 代码风格规范

### PHP 规范

- 遵循 Laravel 默认风格，由 Pint 强制执行
- 命名路由统一小写 + 点分隔：`api.catalogs.show`、`manage.api.pages.update`
- `->tier()` 宏必须 **后置链式**
  （先定义路由再归级），见 [02 · 路由归级](02-backend-integration.md#路由归级的三条通道)

### React / JS 规范

- 组件 PascalCase：`CatalogCard.jsx`、`PageFlip.jsx`
- 函数组件 + Hooks，不写 class 组件
- `useState` / `useMemo` 等显式 import
- 导航与请求只写路由名，不写 URL 字面量
- JSX 条件与列表直接用 JS（`&&` / `map`），见 [05 · JSX 约定](05-frontend-tooling.md#jsx-模板约定)

### 命名路由规范

```
{scope}.{resource}.{action}
```

| 场景     | 格式示例                                   | 说明                           |
|----------|--------------------------------------------|--------------------------------|
| 公开接口 | `api.catalogs.index` / `api.catalogs.show` | scope = `api`                  |
| 管理接口 | `manage.api.catalogs.store`                | scope = `manage` + 组内 `api.` |
| 嵌套资源 | `manage.api.catalogs.pages.reorder`        | 子资源动作用点继续下探         |
| 例外放行 | `manage.login`（显式 `->tier('public')`）  | 登录登出要在未登录时可用       |

禁止：大写、下划线、无意义数字后缀。

## 调试技巧

### 查看 forge 摘要

浏览器 DevTools Console 里一次性读取（访问器读后即删，先存变量）：

```js
const summary = window.__ROUTE_FORGE__;
console.log(summary);
```

或直接请求摘要端点：`GET /_forge/routes`；层级明细：`GET /_forge/routes/{level}`。

### 路由清单与归级核对

```bash
php artisan route:forge:list          # 含层级、别名（Alias Of）列
php artisan route:forge:list --aliases
php artisan route:list --path=catalogs
```

### 管理器页面（本地调试）

`/_forge/manager*` 仅在 `APP_DEBUG=true` 时注册，且有 `manager_allowed_ips` IP 白名单 （默认仅本机）。浏览器访问
localhost 可能解析为 IPv6 `::1`，白名单已一并放行。

### React DevTools 查看 forge 状态

安装 React DevTools 后，可检查 `<RouteForgeProvider>` 的 context 值（forge 实例），
或在组件里临时打印：

```jsx
const forge = useForge({ level: 'public' });
console.log(forge.levelLoaded);
```

## 常见坑速查表

| #  | 坑                                   | 症状                               | 解决方案                                                                          |
|----|--------------------------------------|------------------------------------|-----------------------------------------------------------------------------------|
| 1  | `@forgeSummary` 放在 bundle 求值之后 | 前端拿不到 `__ROUTE_FORGE__`       | 放 `<head>`、`@vite` 之前（见 [02](02-backend-integration.md#forgesummary-指令)） |
| 2  | `->tier()` 写在路由定义之前          | tier 被丢弃并抛异常，路由没归级    | 后置链式：`Route::get(...)->name(...)->tier('public')`                            |
| 3  | 路由漏归级（strict_mode=true）       | 500：RouteTierNotAssignedException | 补 tier 或确认 match 规则可命中；不要为绕错关 strict_mode                         |
| 4  | RouteForgeProvider 的 options 用内联字面量 | 每次渲染疑似重建实例              | 无需处理：options 浅比较，真正变化才重建；但别在渲染期构造新数组/对象再改内容      |
| 5  | ForgeLink 想用 react-router 的 Link        | 默认渲染原生 `<a>`，SPA 导航变整页刷新 | `as={Link}` 注入（见 [03](03-frontend-integration.md#forgelink-与-forgeroute-组件)） |
| 6  | UnoCSS 排在 Ant Design 之前                | `bg-brand-500` 等不生效           | 调整 CSS 注入顺序（见 [05](05-frontend-tooling.md#css-注入顺序陷阱)）             |
| 7  | UnoCSS 自定义 breakpoints 只写子集         | 所有 `md:` / `sm:` 变体静默失配   | theme.breakpoints 必须写全量 map（deep merge 被绕过）                              |
| 8  | 类型文件过期                               | `route()` TS 报错但运行时正常     | 重跑 `route:forge:types --out=...`，必要时重启 TS Server                          |
| 9  | 深链刷新 404                               | React Router history 模式直达失败 | 确认 `routes/web.php` 的 catch-all 回退把请求落到 `index.blade.php`               |
| 10 | CSRF 校验失败（419）                       | 管理端 PUT/POST 被拒              | 确认 forge-options.js 的 XSRF 拦截器生效（token 会随会话轮换）                    |
| 11 | level 在运行期被动态计算                   | useForgeRoute 抛 TypeError        | level 是静态快照契约：换层级请在新组件里另行调用                                   |
| 12 | Blade 壳缺 Fast Refresh preamble           | dev 白屏：`can't detect preamble`（报错指向某 JSX 文件尾），`vite build` 却全绿 | plugin-react 只往 Vite 处理的 index.html 注入，本项目须在 `index.blade.php` 自行补一段（仅 dev，见 [05 §3](05-frontend-tooling.md#3-vitejsplugin-react)） |
| 13 | `manage.endpoint_middleware` 漏 `web`      | 登录成功却永远进不去后台（明细端点恒 401 → 踢回登录页死循环） | 配成 `['web', 'manage']`：web 提供 StartSession，否则登录态也解析不出用户（见 [01](01-architecture.md) 端点保护） |

---

继续阅读：[07 · FAQ](07-faq.md) →
