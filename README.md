<p align="center">
  <strong>route-forge × Laravel</strong>
  <br>
  <sub>一套完整的「命名路由 → 类型安全 → 前后端联动」企业画册示例</sub>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/PHP-8.5%2B-777BB4?style=flat-square&logo=php" alt="PHP" />
  <img src="https://img.shields.io/badge/Laravel-13.x-FF2D20?style=flat-square&logo=laravel" alt="Laravel" />
  <img src="https://img.shields.io/badge/Vue-3.x-4FC08D?style=flat-square&logo=vuedotjs" alt="Vue" />
  <img src="https://img.shields.io/badge/route--forge-laravel%401.4-1668AC?style=flat-square" alt="route-forge/laravel" />
  <img src="https://img.shields.io/badge/license-MIT-green?style=flat-square" alt="License" />
</p>

---

## 目录

- [这是什么](#这是什么)
- [项目亮点](#项目亮点)
- [快速开始](#快速开始)
- [技术栈](#技术栈)
- [项目结构](#项目结构)
- [route-forge 在本项目中的用法](#route-forge-在本项目中的用法)
- [文档导航](#文档导航)
- [Roadmap](#roadmap)
- [License](#license)

---

## 这是什么

这是一个 **Laravel + Vue 3 企业画册**，同时也是 **route-forge 生态的官方整合示例**。

route-forge 解决的核心问题： **让 Laravel 的命名路由在前端也能被类型安全地消费**。后端写
`Route::name('admin.users.edit')`，前端就能用 `route('admin.users.edit', { id: 3 })` ——
参数缺了、名字拼错了，TypeScript / 运行时都会及时报错。

本项目把这套链路从「路由定义」→「forge 上下文生成」→「Blade 注入」→「Vue 插件消费」→「TypeScript
类型下发」完整走通，同时用一份真正可浏览的企业画册作为展示载体，让你既能看到代码，也能看到最终效果。

## 项目亮点

| # | 亮点                        | 说明                                                                                                                                                        |
|---|-----------------------------|-------------------------------------------------------------------------------------------------------------------------------------------------------------|
| 1 | **route-forge 全链路**      | 后端 `route-forge/laravel` + 前端 `@route-forge/vue` + `@route-forge/core`，Blade 指令 `@forgeSummary` 注入上下文，Vue 插件 `createRouteForgePlugin()` 消费 |
| 2 | **类型安全的命名路由**      | 前端调用 `route('admin.users.edit', { id: 3 })`，参数缺省 / 名称拼写错误即时报错                                                                            |
| 3 | **Vue 3 + UnoCSS + Pug**    | 模板缩进语法、原子化 CSS、Element Plus 按需引入，是现代化前端基座的标杆组合                                                                                 |
| 4 | **Element Plus 按需引入**   | `unplugin-vue-components` + `ElementPlusResolver`，组件、指令、函数式 API 零 import，产物 tree-shake                                                        |
| 5 | **Blade 模板也扫 UnoCSS**   | `uno.config.js` 的 `content.filesystem` 覆盖 `resources/views/**/*.blade.php`，原子类跨层复用                                                               |
| 6 | **Composer & NPM 一键安装** | `composer setup` 走完 PHP 依赖 + key + migrate + 前端 build                                                                                                 |

## 快速开始

### 环境要求

| 依赖       | 最低版本 |
|------------|----------|
| PHP        | 8.5+     |
| Composer   | 2.x      |
| Node.js    | 20+      |
| NPM / PNPM | 任意     |

### 一键安装

```bash
composer setup
```

这一条会依次执行：

1. `composer install` — PHP 依赖（含 `route-forge/laravel`）
2. 复制 `.env`、生成 `APP_KEY`
3. `php artisan migrate --force` — SQLite 默认数据库
4. `npm install --ignore-scripts` + `npm run build` — 前端构建（含 `@route-forge/vue`）

### 本地开发

```bash
# 后端 + Vite 双进程（laravel/pail）
composer dev

# 或分开跑
php artisan serve
npm run dev
```

### 运行测试

```bash
composer test
```

## 技术栈

### 后端

| 组件                    | 版本     | 职责                                     |
|-------------------------|----------|------------------------------------------|
| PHP                     | ^8.5     | 运行时                                   |
| Laravel                 | ^13.17   | Web 框架                                 |
| **route-forge/laravel** | **^1.4** | **命名路由 → forge 上下文 → Blade 指令** |
| laravel/tinker          | ^3.0     | REPL                                     |
| PHPUnit                 | ^12.5    | 测试框架                                 |

### 前端

| 组件                    | 版本     | 职责                            |
|-------------------------|----------|---------------------------------|
| Vue                     | ^3.5     | UI 框架                         |
| **@route-forge/core**   | **^2.2** | **route() 核心实现 + 类型定义** |
| **@route-forge/vue**    | **^2.2** | **Vue 插件 + 组合式 API**       |
| Vite                    | ^8.2     | 构建工具                        |
| UnoCSS                  | ^66.9    | 原子化 CSS（含 `presetUno`）    |
| Pug                     | ^3.0     | 模板缩进语法                    |
| Element Plus            | ^2.14    | UI 组件库（按需引入）           |
| @element-plus/icons-vue | ^2.3     | 图标库（显式引入）              |

## 项目结构

```
route-forge-laravel-example/
├── app/                          # Laravel 应用
│   ├── Http/Controllers/         # 控制器（后续接入 route-forge 命名路由）
│   ├── Models/                   # Eloquent 模型
│   └── Providers/                # 服务提供者
├── resources/
│   ├── views/                    # Blade 模板（含 @forgeSummary 指令）
│   │   ├── layout.blade.php      # 全站布局，注入 forge 上下文
│   │   └── home.blade.php        # 企业画册首页入口
│   ├── js/
│   │   ├── app.js                # Vue 入口，挂载 createRouteForgePlugin
│   │   ├── App.vue               # 根组件（Pug 模板）
│   │   └── components/           # 自动注册的业务组件
│   └── css/app.css               # 前端样式入口
├── routes/                       # Laravel 路由定义（即将接入 route-forge 命名）
├── config/                       # Laravel 配置
├── .docs/                        # 📖 完整文档（见下方「文档导航」）
├── composer.json                 # PHP 依赖（含 route-forge/laravel）
├── package.json                  # 前端依赖（含 @route-forge/vue, @route-forge/core）
├── vite.config.js                # Vite 插件链（含 UnoCSS / Vue / AutoImport / Components）
└── README.md
```

## route-forge 在本项目中的用法

这是你打开这个仓库最该关注的部分 —— 三行代码看懂整条链路。

### 1. 后端：Blade 指令注入 forge 上下文

`resources/views/layout.blade.php:42`

```blade
@forgeSummary
```

这一行由 `route-forge/laravel` 包注册的 Blade 指令展开，把 Laravel 路由表中所有命名路由的元信息（URI、HTTP
方法、参数签名）序列化成 JSON，注入到 HTML 中供前端消费。

### 2. 前端：Vue 插件初始化

`resources/js/app.js:16-28`

```js
import { createRouteForgePlugin } from '@route-forge/vue';

const app = createApp(App);
const forge = createRouteForgePlugin({});
app.use(forge);
forge.ready().then(() => app.mount('#app'));
```

`createRouteForgePlugin` 会在 `ready()` 阶段解析 `@forgeSummary` 注入的 JSON，构建前端路由表。之后在任何组件里都可以安全调用
`route('name', params)`。

### 3. 后续：命名路由定义（即将接入）

`routes/web.php`（待落地）

```php
Route::name('home')->get('/', [HomeController::class, 'index']);
Route::name('admin.users.index')->get('/admin/users', [UserController::class, 'index']);
Route::name('admin.users.edit')->get('/admin/users/{user}', [UserController::class, 'edit']);
```

命名 → 自动出现在 forge 上下文 → 前端 `route('admin.users.edit', { user: 3 })` 可直接用 → 类型同步下发到
`resources/js/types/forge.d.ts`。

> 💡 这三步目前第 1、2 步已在仓库中就绪，第 3 步「命名路由 +
> 类型下发」是下一轮的落地目标。详见 [Roadmap](#roadmap)。

## 文档导航

完整文档集中在 `.docs/` 目录，按阅读顺序排列：

| 序号 | 文档                                                                    | 适合谁      | 内容                                                               |
|------|-------------------------------------------------------------------------|-------------|--------------------------------------------------------------------|
| 01   | [架构总览](.docs/01-architecture.md)                                    | 所有人      | route-forge 三包协作模型、请求链路图、本项目集成全景               |
| 02   | [后端接入：route-forge/laravel](.docs/02-backend-integration.md)        | PHP 开发者  | 安装、命名路由定义、`@forgeSummary` 指令、forge 上下文结构         |
| 03   | [前端接入：@route-forge/vue](.docs/03-frontend-integration.md)          | 前端开发者  | Vue 插件初始化、`route()` 组合式 API、类型推断、错误处理           |
| 04   | [企业画册：栏目结构与内容模型](.docs/04-catalog-structure.md)           | 产品 / 全栈 | 画册栏目划分、路由表设计、前后端字段约定                           |
| 05   | [前端工程化：UnoCSS + Pug + Element Plus](.docs/05-frontend-tooling.md) | 前端开发者  | Vite 插件链详解、按需引入配置、Blade 与 Vue 的样式边界             |
| 06   | [开发指南](.docs/06-development.md)                                     | 贡献者      | 本地环境、代码规范、调试技巧、常见坑                               |
| 07   | [FAQ](.docs/07-faq.md)                                                  | 所有人      | 类型不更新怎么办？Blade 里能用 route() 吗？如何在 API 路由上使用？ |

## Roadmap

| 阶段                  | 状态      | 交付物                                                                                            |
|-----------------------|-----------|---------------------------------------------------------------------------------------------------|
| **P0 · 前端基座**     | ✅ 完成   | Vue 3 + UnoCSS + Pug + Element Plus 按需引入 + `@forgeSummary` + `createRouteForgePlugin`         |
| **P1 · 命名路由落地** | 🔨 进行中 | `routes/web.php` 定义画册栏目路由、forge 上下文完整生成、`resources/js/types/forge.d.ts` 自动产出 |
| **P2 · 画册内容模型** | 📋 待开始 | Eloquent 模型 + Seeder + 后台管理（或静态数据），前后端字段契约                                   |
| **P3 · Vue 页面组件** | 📋 待开始 | 首页 Hero、栏目列表、详情页、联系我们，全部用 `route()` 做导航                                    |
| **P4 · 测试覆盖**     | 📋 待开始 | 路由测试、控制器测试、前端单元测试                                                                |

## License

MIT © route-forge 
