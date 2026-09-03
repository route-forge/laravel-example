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
| NPM      | 9+       | 随 Node.js 自带                                              |
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
5. npm install --ignore-scripts        # 前端依赖，含 @route-forge/vue
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

`.prettierrc` 的配置（本项目根目录有）：

```json
{
    "semi": true,
    "singleQuote": true,
    "printWidth": 100,
    "plugins": [
        "@prettier/plugin-pug"
    ]
}
```

## 代码风格规范

### PHP 规范

- 遵循 Laravel 默认风格，由 Pint 强制执行
- 命名路由统一用小写 + 点分隔：`catalog.show`、`products.category`
- 控制器方法名与路由动作对齐：`index` / `show` / `create` / `store` / `edit` / `update` / `destroy`

### Vue / JS 规范

- 组件 PascalCase：`FeatureCard.vue`、`SiteHeader.vue`
- 组合式 API + `<script setup>`，不用 Options API
- 响应式变量 `ref` / `reactive` / `computed` 显式 import（不依赖 auto-import 的 vue 预设）
- 只有模板无法解析的 API（`ElMessage` 等函数式）才用 auto-import
- 模板用 Pug，但 class / 指令显式写 HTML
  属性形式（见 [05 · 前端工程化](05-frontend-tooling.md#pug-模板缩进语法)）

### 命名路由规范

```
{domain}.{resource}.{action}
```

| 命名     | 格式示例                           | 说明                   |
|----------|------------------------------------|------------------------|
| 单页面   | `home` / `about.company`           | 不需要 action 时可以省 |
| 资源列表 | `catalog.index` / `products.index` | —                      |
| 资源详情 | `catalog.show` / `products.show`   | —                      |
| 嵌套路由 | `products.category`                | 一个资源的子动作       |

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

### Vue DevTools 查看 forge 状态

```vue

<script setup>
    import { useRouteForge } from '@route-forge/vue';

    const { routes } = useRouteForge();
    console.table(routes);
</script>
```

### 查看 Vite 解析后的组件

在 Vite dev server 运行时，访问：

```
http://localhost:5173/@id/resources/js/App.vue
```

可以看到 Pug 编译后的实际 HTML 模板。

## 常见坑速查表

| # | 坑                                    | 症状                          | 解决方案                                                                               |
|---|---------------------------------------|-------------------------------|----------------------------------------------------------------------------------------|
| 1 | `@forgeSummary` 放在 JS 之后          | 前端 `forge.ready()` reject   | 移到 `@vite` 之前                                                                      |
| 2 | Pug 里用 `.md:py-20` 简写             | 编译失败：`Unexpected token`  | 改成 `div(class='md:py-20')`                                                           |
| 3 | Pug 里用 `each` / `if`                | 运行时数据不更新              | 用 Vue 的 `v-for` / `v-if`                                                             |
| 4 | UnoCSS 放在 Element Plus 之前         | `bg-brand-500` 等不生效       | 调整 CSS 注入顺序（见 [05 · CSS 注入顺序](05-frontend-tooling.md#css-注入顺序陷阱)）   |
| 5 | AutoImport 的 `dts` 用相对路径        | 类型文件被写到项目根目录      | 用 `fileURLToPath(new URL('./resources/js/types/auto-imports.d.ts', import.meta.url))` |
| 6 | `route('xxx')` 找不到但 DevTools 里有 | 类型不更新但运行时 OK         | 跑 `composer forge` 重新生成类型                                                       |
| 7 | `route()` 返回 404 页面               | URL 生成对了但 Laravel 找不到 | 检查 `routes/web.php` 是否正确注册路由                                                 |
| 8 | 自定义组件 `<FeatureCard>` 报未注册   | Components 插件没扫到         | 检查 `dirs: ['resources/js/components']` 和组件扩展名                                  |

---

继续阅读：[07 · FAQ](07-faq.md) →
