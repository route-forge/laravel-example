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

| 工具 | 最低版本 | 安装方式 |
|------|----------|---------|
| PHP | 8.5+ | `php -v` 检查；推荐用 [php.new](https://php.new) 或 Homebrew |
| Composer | 2.x | `composer -V` 检查 |
| Node.js | 20+ | `node -v` 检查；推荐 nvm / fnm |
| NPM | 9+ | 随 Node.js 自带 |
| SQLite | 任意 | PHP 8.5 默认包含 pdo_sqlite 扩展 |

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
5. npm install --ignore-scripts        # 前端依赖，含 @route-forge/react
6. npm run build                       # Vite 构建
```

### 手动分步安装（可选）

如果 `composer setup` 中间出错，可以手动分步执行：

```bash
# 后端
composer install
cp .env.example .env
php artisan key:generate
php artisan migrate

# 前端
npm install
npm run build
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
DB_DATABASE=F:\web\route-forge-laravel-example\database\database.sqlite
```

## 开发工作流

### 日常开发双进程

```bash
composer dev
```

这启动 `php artisan dev`（来自 `laravel/pail` 包），会并行跑：
- `php artisan serve` —— 后端 HTTP 服务，默认 `http://127.0.0.1:8000`
- `npm run dev` —— Vite dev server，处理 HMR 和 Blade 热更新

### 改了路由之后

1. 改 `routes/web.php`
2. 刷新浏览器页面（Blade 模板会重新渲染，`@forgeSummary` 会注入最新的 forge 上下文）
3. （可选）跑 `composer forge` 重新生成 `forge.d.ts` 类型文件

### 跑测试

```bash
composer test
```

执行 `php artisan config:clear` 后跑 `php artisan test`。目前项目还没有测试文件（P4 阶段交付），但框架已就绪。

### 代码格式化

```bash
# 后端（Laravel Pint）
./vendor/bin/pint

# 前端（Prettier）
npm run format
npm run format:check   # CI 用
```

## 代码风格规范

### PHP 规范

- 遵循 Laravel 默认风格，由 Pint 强制执行
- 命名路由统一用小写 + 点分隔：`catalog.show`、`products.category`
- 控制器方法名与路由动作对齐：`index` / `show` / `create` / `store` / `edit` / `update` / `destroy`

### React / TypeScript 规范

- 组件 PascalCase 命名文件：`FeatureCard.tsx`、`SiteHeader.tsx`
- 默认导出 vs 命名导出：**组件用默认导出**，hooks / 工具函数用命名导出
- 使用函数式组件 + Hooks，**禁止 class 组件**
- 每个组件文件 **一个主组件**；相关的小组件可以同文件导出
- Props 必须有 TypeScript 类型，定义在组件上方的 `interface` 里
- 事件处理函数命名：`handleClick` / `handleSubmit`（`handle` 前缀）
- 组件目录结构：

```
components/
├── FeatureCard.tsx          # 独立组件，默认导出
├── SiteHeader/
│   ├── index.tsx            # 主组件
│   ├── NavItem.tsx          # 子组件
│   └── types.ts             # 类型定义
```

### React Hooks 规范

```tsx
// ✅ 推荐：使用 useRouteForge()
function Header() {
  const { route } = useRouteForge();
  return <Link to={route('home')}>首页</Link>;
}

// ✅ 推荐：自定义 Hook 封装业务逻辑
function useProducts() {
  const { route } = useRouteForge();
  const navigate = useNavigate();
  // ...
  return { route, navigate, /* ... */ };
}

// ❌ 禁止：在事件处理器外调用 useRouteForge 后存到模块级变量
const globalForge = (() => { /* 不能这样 */ })();
```

### 命名路由规范

```
{domain}.{resource}.{action}
```

| 命名 | 格式示例 | 说明 |
|------|---------|------|
| 单页面 | `home` / `about.company` | 不需要 action 时可以省 |
| 资源列表 | `catalog.index` / `products.index` | — |
| 资源详情 | `catalog.show` / `products.show` | — |
| 嵌套路由 | `products.category` | 一个资源的子动作 |

禁止：
- 大写：`Products.Index`
- 下划线：`products_index`
- 无意义数字后缀：`catalog.show2`

## 调试技巧

### 查看 forge 上下文

在浏览器 DevTools Console 里：

```js
console.log(window.__FORGE__);
```

能看到后端注入的完整路由表。

### 打印所有已注册路由

```bash
php artisan route:list
```

本项目加上 route-forge 后，可以在末尾加一个 tag：

```bash
php artisan route:list --path=catalog
```

只看 catalog 相关的路由。

### React DevTools 查看 forge 状态

```tsx
import { useRouteForge } from '@route-forge/react';

function DebugPanel() {
  const { routes } = useRouteForge();
  console.table(routes);
  return null; // 或开发时渲染一个面板
}
```

### 查看 React 组件树中 Provider 的值

安装 **React Developer Tools** 浏览器扩展，在 Components 面板里找到 `RouteForgeProvider`，可以直接看到它的 Context 值（`forge` 实例、`routes` 列表等）。

## 常见坑速查表

| # | 坑 | 症状 | 解决方案 |
|---|-----|------|---------|
| 1 | `@forgeSummary` 放在 JS 之后 | React Provider 初始化报错 | 移到 `@vite` 之前 |
| 2 | Ant Design 组件样式不生效 | 按钮是裸的，没有 Ant Design 视觉 | 检查 `@ant-design/vite-plugin` 是否启用 |
| 3 | UnoCSS 的 `bg-brand-500` 等不生效 | 写了 class 但颜色没变 | 调整 CSS 注入顺序（见 [05 · CSS 注入顺序](05-frontend-tooling.md#css-注入顺序陷阱)） |
| 4 | Provider 嵌套层级混乱 | 子组件拿不到 forge | `<RouteForgeProvider>` 必须在根组件最外层，包裹所有需要用 `route()` 的组件 |
| 5 | `route('xxx')` 找不到但 DevTools 里有 | 类型不更新但运行时 OK | 跑 `composer forge` 重新生成类型 |
| 6 | `route()` 返回 404 页面 | URL 生成对了但 Laravel 找不到 | 检查 `routes/web.php` 是否正确注册路由 |
| 7 | TS 类型不报错但应该报 | `forge.d.ts` 不在 include 范围 | 检查 `tsconfig.json` 的 include 配置 |
| 8 | React Router 的 path 里用了 `route()` | 路由匹配不上 | React Router 的 path 用 `/products/:slug` 动态段，`route()` 只在组件内生成具体 URL |

---

继续阅读：[07 · FAQ](07-faq.md) →
