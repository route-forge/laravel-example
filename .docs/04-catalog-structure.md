# 04 · 企业画册：栏目结构与内容模型

> 本文是画册的「产品设计 + 数据规划」文档 —— 前台四页（含 404 兜底）、管理端七个界面、完整路由表、
> 数据库 Schema、前后端字段契约一次性定下来。route-forge 的价值在这里最直观：路由表即产品结构。

---

## 目录

- [产品定位](#产品定位)
- [页面规划](#页面规划)
- [完整路由表](#完整路由表)
- [数据模型](#数据模型)
- [前后端字段契约](#前后端字段契约)
- [目录结构对应](#目录结构对应)

---

## 产品定位

企业宣传画册：对外展示公司形象与业务能力的线上翻页画册。前台给访客「看」，管理端给运营 「维护」——
画册内容全部后台可配置，不写死在前端。


```
┌──────────────────────────────────────────────────────────┐
│  前台（访客，无需登录）                                   │
│    首页      · 品牌区 + 分类导览 + 最新画册入口            │
│    画册列表  · 按分类筛选，卡片入口，分页                  │
│    画册详情  · PageFlip 翻页阅读（整本一次取回）           │
│    联系页    · 联系方式 + 在线留言                         │
│    404       · 未匹配地址兜底（仍带页头页脚）              │
├──────────────────────────────────────────────────────────┤
│  管理端（/manage，登录 + is_manager）                      │
│    登录 · 仪表盘 · 基础资料 · 分类 · 画册 · 画册页 · 留言   │
└──────────────────────────────────────────────────────────┘
```

## 页面规划

### 前台（vue-router 页面路由，数据走 `useForgeApi('public')`）

页面地址与数据端点是两套名字：跳转用下表的 vue-router `name`，取数用 `api.*` ——
边界见 [03 · 与 vue-router 配合](03-frontend-integration.md#与-vue-router-配合)。

| 页面       | vue-router name  | 路径              | 数据来源                                                          | 核心交互                           |
|------------|------------------|-------------------|-------------------------------------------------------------------|------------------------------------|
| 首页       | `home`           | `/`               | `api.site.show` + `api.categories.index` + `api.catalogs.index` | 品牌区、分类导览、最新 3 本        |
| 画册列表   | `catalogs`       | `/catalogs`       | `api.categories.index` + `api.catalogs.index?category=&page=`   | 分类筛选（状态进 URL query）+ 分页 |
| 画册详情   | `catalog.detail` | `/catalogs/:slug` | `api.catalogs.show`                                               | PageFlip 翻页，翻阅过程零请求      |
| 联系页     | `contact`        | `/contact`        | `api.site.show` + `api.contact.store`                             | 前端校验后提交留言                 |
| 404        | `not-found`      | `:pathMatch(.*)*`  | —                                                                 | 给出去向（画册列表 / 首页）        |

站点资料被页头、页脚、首页、联系页同时需要，故收在 `composables/useSiteSettings.js` 做模块级单例：
首屏只发一次 `api.site.show`；它是展示型数据，取不到时降级为默认站名，不白屏。

### 管理端（`/manage` 下异步 chunk，数据走 `useForgeApi('manage', 'api.manage')`）

| 模块       | 功能                                                 |
|------------|------------------------------------------------------|
| 登录       | JSON 登录（成功后由前端决定跳转，服务端不 redirect） |
| 仪表盘     | `api.manage.bootstrap` 一次返回身份 + 统计          |
| 基础资料   | 站点级单条配置的查看与更新                           |
| 分类管理   | 列表 / 新增 / 编辑 / 删除 / 拖拽排序                 |
| 画册管理   | 列表 / 新增 / 编辑 / 删除 / 发布状态 / 归属分类      |
| 画册页管理 | 选中画册后的内页列表 / 新增 / 编辑 / 删除 / 排序     |
| 留言管理   | 关键词与状态筛选、标记处理状态                        |

## 完整路由表

全部路由有命名，由 `route-forge/laravel`
归入层级（归级方式见 [02](02-backend-integration.md#路由归级的三条通道)）：


路由只有一个来源：`routes/api.php`（数据端点）与 `routes/web.php`（SPA 壳）。归级靠显式 `tier()`
（优先级最高，见 [02](02-backend-integration.md#路由归级的三条通道)），`match.prefix` 只作为漏写时的兜底。

```php
// ── routes/web.php —— level: public ──
$r->get('/', IndexController::class)->name('index');       // 唯一 Blade 壳
$r->fallback(IndexController::class)->name('fallback');     // 其余路径全交给 vue-router

// ── routes/api.php —— level: public（eager，随首屏摘要下发）──
$r->tier('public')->name('api.')->group(function (Router $r) {
    $r->get('/site', [SiteSettingController::class, 'show'])->name('site.show');
    $r->get('/categories', [CategoryController::class, 'index'])->name('categories.index');
    $r->get('/catalogs', [CatalogController::class, 'index'])->name('catalogs.index');
    $r->get('/catalogs/{slug}', [CatalogController::class, 'show'])->name('catalogs.show');
    $r->post('/contact', [ContactController::class, 'store'])->name('contact.store');
});

// 登录必须在 public：此时还没有会话（要挂 web 拿 session，CSRF 由 SPA 拦截器供 token）
$r->post('/auth/login', [AuthController::class, 'store'])->name('api.auth.login')
  ->middleware('web')->tier('public');

// ── 管理端 —— level: manage（lazy + 受保护），组属性 as = api.manage. ──
$r->group(['tier' => 'manage', 'middleware' => ['web', 'manage'], 'as' => 'api.manage.'], function (Router $r) {
    $r->post('/manage/auth/logout', [AuthController::class, 'destroy'])->name('logout');
    $r->get('/manage/bootstrap', BootstrapController::class)->name('bootstrap');

    $r->get('/manage/catalogs', [ManageCatalogController::class, 'index'])->name('catalogs.index');
    $r->post('/manage/catalogs', [ManageCatalogController::class, 'store'])->name('catalogs.store');
    $r->get('/manage/catalogs/{catalog}', [ManageCatalogController::class, 'show'])->name('catalogs.show');
    $r->put('/manage/catalogs/{catalog}', [ManageCatalogController::class, 'update'])->name('catalogs.update');
    $r->delete('/manage/catalogs/{catalog}', [ManageCatalogController::class, 'destroy'])->name('catalogs.destroy');

    $r->get('/manage/catalogs/{catalog}/pages', [PageController::class, 'index'])->name('catalogs.pages.index');
    $r->post('/manage/catalogs/{catalog}/pages', [PageController::class, 'store'])->name('catalogs.pages.store');
    $r->post('/manage/catalogs/{catalog}/pages/reorder', [PageController::class, 'reorder'])->name('catalogs.pages.reorder');
    $r->put('/manage/pages/{page}', [PageController::class, 'update'])->name('pages.update');
    $r->delete('/manage/pages/{page}', [PageController::class, 'destroy'])->name('pages.destroy');

    // 分类（含 reorder）、站点资料（PUT /manage/site）、留言（index + update）同理
});
```

forge 摘要里的公开侧（`GET /_forge/routes/public` 的明细，8 条）：

| 路由名                 | URI                      | 方法     | 必填参数 | 消费方                 |
|------------------------|--------------------------|----------|----------|------------------------|
| `api.site.show`        | `/api/site`              | GET      | —        | 页头 / 页脚 / 首页 / 联系页 |
| `api.categories.index` | `/api/categories`        | GET      | —        | 首页分类导览、列表页筛选条 |
| `api.catalogs.index`   | `/api/catalogs`          | GET      | —        | 首页最新、画册列表        |
| `api.catalogs.show`    | `/api/catalogs/{slug}`   | GET      | `slug`   | 画册详情（含整本 pages）  |
| `api.contact.store`    | `/api/contact`           | POST     | —        | 联系页留言表单            |
| `api.auth.login`       | `/api/auth/login`        | POST     | —        | 登录页                   |
| `index` / `fallback`   | `/` / `{any}`            | GET      | —        | 服务端只出壳页           |

管理端 17 条走 `api.manage.*` 前缀（如 `api.manage.catalogs.show`），`load = lazy` +
`endpoint_middleware = ['web','manage']`：未登录者连「后台有哪些路由」都读不到。
懒加载可用。

## 数据模型

五张表（SQLite 起步，字段以 `database/migrations/` 为准）：

### catalogs（画册）

```sql
create table catalogs
(
    id           integer primary key autoincrement,
    slug         varchar not null unique,           -- 前台详情页地址用它
    category_id  integer null references categories on delete set null, -- 空 = 未分类
    title        varchar not null,
    subtitle     varchar null,
    cover_image  varchar null,                      -- 空 → 前台用主题色装饰面板
    theme_color  varchar default '#1668ac' not null,-- 卡片/翻页进度条/书脊取此色
    summary      text null,
    status       varchar default 'draft' not null,  -- draft | published
    published_at datetime null,                     -- 与 status 同时满足才算已发布
    sort_order   integer default 0 not null,
    created_at   datetime null,
    updated_at   datetime null
);
create index catalogs_status_sort_order_index on catalogs (status, sort_order);
create index catalogs_category_id_status_index on catalogs (category_id, status);
```

「精选」不是一个字段：首页取的是 `Catalog::published()` 的前 N 本（按 `published_at` 倒序 +
`sort_order` 升序）。`status` 与 `published_at` 两个条件都由 `scopePublished()` 单点定义，
前台与后台统计都复用它，避免「列表可见、详情 404」这类口径分叉。

### catalog_pages（画册页）

```sql
create table catalog_pages
(
    id         integer primary key autoincrement,
    catalog_id integer not null references catalogs on delete cascade,
    sort_order integer default 1 not null,  -- 翻页顺序
    title      varchar null,
    body       text null,                   -- 纯文本，前台按空行分段（不 v-html）
    image      varchar null,                -- 空 → 装饰面板
    layout     varchar default 'text' not null, -- cover|text|split|image|quote|back
    tone       varchar default 'light' not null, -- light|dark
    created_at datetime null,
    updated_at datetime null
);
create index catalog_pages_catalog_id_sort_order_index on catalog_pages (catalog_id, sort_order);
```

内页独立成表而非 JSON 列：它要逐条编辑与拖拽排序。

### categories / site_settings / contact_messages

- `categories`：`name` + `slug`(unique) + `sort_order`；画册删除时 `category_id` 置 null（`nullOnDelete`）
- `site_settings`：singleton（迁移即种下 id=1 的默认行），字段见下文契约
- `contact_messages`：`name/email/phone/company/subject/message` + `status`(`new|handled`) +
  `handled_at`；`status` 与 `created_at` 有联合索引，供后台留言列表筛选
- `users`：追加 `is_manager` 布尔位，管理端准入 = 登录 + `is_manager`（`EnsureManageAccess`）

## 前后端字段契约

后端 Resource 输出即前端消费形状（`app/Http/Resources/`）。三层信封的拆包见
[support/api.js](03-frontend-integration.md#useforgeapi按层级发请求)。

### CatalogResource —— 列表项（`api.catalogs.index`）

```json
{
  "id": 1,
  "slug": "xingye-brand-2026",
  "title": "星野智能 · 2026 品牌画册",
  "subtitle": "把工业现场的数据，变成可执行的判断",
  "summary": "……",
  "cover_image": null,
  "theme_color": "#1668ac",
  "status": "published",
  "published_at": "2026-07-03T13:17:24+00:00",
  "category": { "id": 1, "name": "公司宣传", "slug": "company", "published_count": 1 },
  "page_count": 8
}
```

- `cover_image` 为 null 时前台用 `theme_color` 生成装饰面板（示例数据全部留 null，不内置版权素材）
- 列表**不下发 `pages`**（`whenLoaded` 未命中则键整个消失），前端因此不能假设列表里有内页
- `page_count` 恒在：`withCount` 命中时读原始聚合列，否则退化为一次 count 查询

### CatalogResource —— 详情（`api.catalogs.show`）

在列表项之上多一个 `pages` 数组，按 `sort_order` 升序，一次给全整本：

```json
{
  "slug": "xingye-brand-2026",
  "page_count": 8,
  "pages": [
    { "id": 1, "catalog_id": 1, "sort_order": 1, "title": "星野智能", "body": "2026 品牌画册 / 边缘智能 · 工业现场", "image": null, "layout": "cover", "tone": "dark" },
    { "id": 2, "catalog_id": 1, "sort_order": 2, "title": "我们做什么", "body": "工厂里最不缺的就是数据……", "image": null, "layout": "text", "tone": "light" }
  ]
}
```

`layout` 白名单 `cover / text / split / image / quote / back`，`tone` 白名单 `light / dark`；
前台 `PageSheet` 对未知 layout 降级为 `text`、未知 tone 降级为 `light`，与后端注释同一口径。
翻阅是纯前端行为：详情一次取完，翻页不再发请求。

### CategoryResource（`api.categories.index`）

`{ id, name, slug, published_count }`。公开侧只统计已发布画册（管理端另有 `catalogs_count`
统计全部）。前台筛选条隐藏 `published_count = 0` 的分类——点进去必然空列表，那是误导。

### SiteSettingResource（`api.site.show`）

`{ site_name, brand_slogan, logo_url, intro, contact_phone, contact_email, contact_address, icp }`，
singleton（`SiteSetting::current()` 行丢失时兜底重建），字段可空，前台逐项判断是否渲染。

### 留言（`api.contact.store`）

请求体 `{ name*, email*, phone, company, subject, message* }`（* 为必填，`message` 10~5000 字），
成功返回 `201 { "message": "留言已收到，我们会尽快联系你。" }`。服务端校验规则与前台表单
逐条对齐：HTTPError 目前不带响应体，422 的字段级错误到不了前端，所以**前台校验是唯一防线**。

## 目录结构对应

```
resources/js/
├── app.js                       # 入口：forge + router，forge.ready() 后 mount
├── forge.js                     # createRouteForgePlugin + CSRF/401 拦截器
├── route.js                     # vue-router 表（前台四页 + 404 + /manage/*）
├── App.vue                      # 根组件（只有 router-view）
├── layout/
│   ├── index.vue                # 前台布局：SiteHeader + 内容 + SiteFooter，顺带维护 document.title
│   └── admin.vue                # 管理端布局：bootstrap 门闩（未登录不渲染框架）
├── pages/                       # 目录名即路由段，全部异步 chunk
│   ├── home/index.vue           # 首页：品牌区 + 分类导览 + 最新画册
│   ├── catalogs/index.vue       # 画册列表：分类筛选 + 分页
│   ├── catalogs/detail.vue      # 画册详情：PageFlip + 404/失败分开处理
│   ├── contact/index.vue        # 联系页：联系方式 + 留言表单
│   ├── not-found/index.vue      # 404 兜底
│   └── admin/                   # 后台：login / dashboard / catalogs(+pages) / categories / messages / site
├── components/                  # unplugin-vue-components 自动按需注册（模板里直接写标签）
│   ├── SiteHeader.vue           # 品牌位 + 导航 + 移动端折叠
│   ├── SiteFooter.vue           # 简介 / 联系方式 / 备案号 / 管理入口
│   ├── CatalogCard.vue          # 画册卡片（首页与列表复用）
│   ├── PageSheet.vue            # 单页渲染：6 种 layout × light/dark
│   └── PageFlip.vue             # 翻页器：PC 对开 / 移动单页 + 键盘、滑动、目录
├── composables/
│   └── useSiteSettings.js       # api.site.show 的模块级单例（页头/页脚/首页/联系页共用）
├── support/
│   ├── api.js                   # call() 三层拆包：bodyOf / pageOf / messageOf
│   └── display.js               # 展示层小工具：formatDate / toParagraphs / resolveAccent
└── types/                       # 生成物（gitignore）：auto-imports / components / route-forge.d.ts
```

继续阅读：[05 · 前端工程化](05-frontend-tooling.md) →
