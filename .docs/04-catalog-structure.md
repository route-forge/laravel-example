# 04 · 企业画册：栏目结构与内容模型

> 本文是画册的「产品设计 + 数据规划」文档 —— 前台三页、管理端四块、完整路由表、数据库
> Schema、前后端字段契约一次性定下来。route-forge 的价值在这里最直观：路由表即产品结构。

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
┌──────────────────────────────────────────────────────┐
│  前台（访客）                                         │
│                                                      │
│  首页       · 品牌展示 + 精选画册入口                  │
│  画册列表   · 按分类浏览，卡片入口                     │
│  画册详情   · 翻页式阅读（PageFlip），逐页展示         │
│                                                      │
├──────────────────────────────────────────────────────┤
│  管理端（登录）                                       │
│                                                      │
│  基础资料    · 站点名称 / 品牌信息 / 联系方式          │
│  分类        · 画册分类增删改查与排序                  │
│  画册列表    · 画册增删改查、发布状态、归属分类        │
│  画册页数据  · 单本画册内页的增删改查与排序            │
└──────────────────────────────────────────────────────┘
```

## 页面规划

### 前台（vue-router 页面路由，数据走 `useForgeApi('public')`）

| 页面         | 路径              | 数据来源                                      | 核心交互                |
|--------------|-------------------|-----------------------------------------------|-------------------------|
| HomePage     | `/`               | `api.site.show` + `api.catalogs.index`        | 品牌区 + 精选画册卡片   |
| CatalogsPage | `/catalogs`       | `api.categories.index` + `api.catalogs.index` | 分类筛选 + 卡片列表     |
| CatalogPage  | `/catalogs/:slug` | `api.catalogs.show`                           | PageFlip 翻页，逐页阅读 |

### 管理端（`/admin` 下异步 chunk，数据走 `useForgeApi('manage')`）

| 模块       | 功能                                                 |
|------------|------------------------------------------------------|
| 登录       | JSON 登录（成功后由前端决定跳转，服务端不 redirect） |
| 基础资料   | 站点级单条配置的查看与更新                           |
| 分类管理   | 列表 / 新增 / 编辑 / 删除 / 排序                     |
| 画册管理   | 列表 / 新增 / 编辑 / 删除 / 发布状态 / 归属分类      |
| 画册页管理 | 选中画册后的内页列表 / 新增 / 编辑 / 删除 / 排序     |

## 完整路由表

全部路由有命名，由 `route-forge/laravel`
归入层级（归级方式见 [02](02-backend-integration.md#路由归级的三条通道)）：

```php
// ── routes/api.php —— level: public（eager，match.prefix = ['api'] 自动命中）──

Route::prefix('api')->name('api.')->group(function () {
    Route::get('/site',      [SiteController::class, 'show'])->name('site.show');
    Route::get('/categories', [CategoryController::class, 'index'])->name('categories.index');
    Route::get('/catalogs',  [CatalogController::class, 'index'])->name('catalogs.index');
    Route::get('/catalogs/{slug}', [CatalogController::class, 'show'])->name('catalogs.show');
});

// ── routes/manage.php —— level: manage（lazy，prefix 'manage' 自动命中）──
// 登录/登出例外：显式 ->tier('public')，登录页要在未登录时可用

Route::post('/login',  [AuthController::class, 'store'])->name('login')->tier('public');
Route::post('/logout', [AuthController::class, 'destroy'])->name('logout')->tier('public');

Route::middleware('manage')->prefix('api')->name('api.')->group(function () {
    // 基础资料
    Route::put('/site', [SiteController::class, 'update'])->name('site.update');

    // 分类
    Route::resource('categories', CategoryController::class)
        ->except('create', 'edit')->names('categories');

    // 画册
    Route::resource('catalogs', CatalogController::class)
        ->except('create', 'edit')->names('catalogs');

    // 画册页（嵌套在画册下）
    Route::get('/catalogs/{catalog}/pages',       [PageController::class, 'index'])->name('catalogs.pages.index');
    Route::post('/catalogs/{catalog}/pages',      [PageController::class, 'store'])->name('catalogs.pages.store');
    Route::post('/catalogs/{catalog}/pages/reorder', [PageController::class, 'reorder'])->name('catalogs.pages.reorder');
    Route::put('/pages/{page}',    [PageController::class, 'update'])->name('pages.update');
    Route::delete('/pages/{page}', [PageController::class, 'destroy'])->name('pages.destroy');
});
```

forge 摘要产出预览（公开侧）：

| 路由名                 | URI                    | 方法 | 必填参数 |
|------------------------|------------------------|------|----------|
| `api.site.show`        | `/api/site`            | GET  | —        |
| `api.categories.index` | `/api/categories`      | GET  | —        |
| `api.catalogs.index`   | `/api/catalogs`        | GET  | —        |
| `api.catalogs.show`    | `/api/catalogs/{slug}` | GET  | `slug`   |

管理端同名规则，前缀 `manage.`（如 `manage.api.catalogs.show`），登录后经 `useForgeApi('manage')`
懒加载可用。

## 数据模型

五张表（SQLite 起步，字段类型对 Laravel 迁移友好）：

### site_settings（基础资料）

站点级单行配置：

```sql
CREATE TABLE site_settings
(
    id             BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    site_name      VARCHAR(200) NOT NULL COMMENT '站点名称',
    brand_slogan   VARCHAR(300) NULL COMMENT '品牌口号（首页展示）',
    logo_url       VARCHAR(500) NULL COMMENT 'Logo 图片地址',
    intro          TEXT NULL COMMENT '公司简介（富文本）',
    contact_phone  VARCHAR(50)  NULL,
    contact_email  VARCHAR(200) NULL,
    contact_address VARCHAR(500) NULL,
    icp            VARCHAR(100) NULL COMMENT '备案号（页脚展示）',
    created_at     TIMESTAMP NULL,
    updated_at     TIMESTAMP NULL
);
```

### categories（分类）

```sql
CREATE TABLE categories
(
    id         BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name       VARCHAR(100) NOT NULL COMMENT '分类名称',
    slug       VARCHAR(100) NOT NULL UNIQUE,
    sort_order INT DEFAULT 0,
    created_at TIMESTAMP NULL,
    updated_at TIMESTAMP NULL
);
```

### catalogs（画册）

```sql
CREATE TABLE catalogs
(
    id           BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    category_id  BIGINT UNSIGNED NULL COMMENT '归属分类，可空 = 未分类',
    slug         VARCHAR(100) NOT NULL UNIQUE,
    title        VARCHAR(200) NOT NULL,
    summary      VARCHAR(500) NULL COMMENT '一句话简介（列表卡片用）',
    cover_url    VARCHAR(500) NULL COMMENT '封面图',
    is_featured  TINYINT(1) DEFAULT 0 COMMENT '是否精选（首页展示）',
    is_published TINYINT(1) DEFAULT 0 COMMENT '发布状态：未发布前台不可见',
    published_at DATE NULL,
    sort_order   INT DEFAULT 0,
    created_at   TIMESTAMP NULL,
    updated_at   TIMESTAMP NULL,
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
);
```

### catalog_pages（画册页）

单本画册的内页，独立成表而非 JSON 列 —— 内页需要独立排序与逐条编辑：

```sql
CREATE TABLE catalog_pages
(
    id         BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    catalog_id BIGINT UNSIGNED NOT NULL,
    title      VARCHAR(200) NOT NULL COMMENT '页标题',
    content    TEXT NULL COMMENT '页正文（富文本）',
    image_url  VARCHAR(500) NULL COMMENT '页主图',
    sort_order INT DEFAULT 0 COMMENT '页序（翻页顺序）',
    created_at TIMESTAMP NULL,
    updated_at TIMESTAMP NULL,
    FOREIGN KEY (catalog_id) REFERENCES catalogs(id) ON DELETE CASCADE
);
```

### users（管理账号）

在 users 表追加 `is_manager` 布尔位区分管理账号；管理端访问控制走 `manage` 中间件 （登录 + is_manager
校验），与 forge 层级的 `endpoint_middleware` 共用同一闸门。

## 前后端字段契约

后端 API Resource 输出，前端按此消费。

### CatalogListItem（列表卡片）

```json
{
    "id": 1,
    "slug": "company-2026",
    "title": "企业介绍画册 2026",
    "summary": "一份完整展示公司实力与产品矩阵的年度画册",
    "cover_url": "https://cdn.example.com/catalogs/company-2026/cover.jpg",
    "category": { "id": 2, "name": "公司宣传", "slug": "branding" },
    "is_featured": true,
    "published_at": "2026-03-15"
}
```

### CatalogDetail（详情 = 全部页数据）

```json
{
    "id": 1,
    "slug": "company-2026",
    "title": "企业介绍画册 2026",
    "summary": "一份完整展示公司实力与产品矩阵的年度画册",
    "cover_url": "https://cdn.example.com/catalogs/company-2026/cover.jpg",
    "pages": [
        { "id": 11, "title": "公司概览", "content": "<p>…</p>", "image_url": null, "sort_order": 1 },
        { "id": 12, "title": "产品矩阵", "content": "<p>…</p>", "image_url": "https://…", "sort_order": 2 }
    ]
}
```

详情一次带出全部内页：翻页阅读是纯前端行为，翻页不再发请求。

### SiteSettings（基础资料）

```json
{
    "site_name": "某某科技",
    "brand_slogan": "让每一页都有说服力",
    "logo_url": "https://cdn.example.com/logo.png",
    "intro": "<p>…</p>",
    "contact_phone": "400-000-0000",
    "contact_email": "hello@example.com",
    "contact_address": "…",
    "icp": "苏ICP备XXXXXXXX号"
}
```

## 目录结构对应

```
resources/js/
├── app.js                  # 入口：forge + router，ready 后 mount
├── forge.js                # createRouteForgePlugin + CSRF 拦截器
├── route.js                # vue-router（history 模式）
├── App.vue                 # 根组件（Pug 模板）
├── layout/
│   ├── index.vue           # 前台布局（SiteHeader / SiteFooter + router-view）
│   └── admin.vue           # 管理端布局（登录后懒加载 manage 层级）
├── pages/                  # 前台三页
│   ├── HomePage.vue
│   ├── CatalogsPage.vue
│   └── CatalogPage.vue
├── manage/                 # 管理端模块（异步 chunk）
│   ├── ManageApp.vue
│   ├── CatalogList.vue     # 画册列表管理
│   ├── PageManager.vue     # 画册页数据管理
│   └── MessageInbox.vue    # （预留扩展位）
├── components/
│   ├── CatalogCard.vue     # 画册卡片（首页/列表复用）
│   ├── PageFlip.vue        # 翻页阅读器
│   ├── PageSheet.vue       # 单页渲染
│   ├── SiteHeader.vue
│   └── SiteFooter.vue
├── composables/
│   └── useForgeLink.js     # 按层级生成 href 的组合式（含 levelLoaded 门闩）
├── support/
│   └── api.js              # call() 三层拆包（bodyOf / pageOf / messageOf）
└── types/
    └── forge-routes.d.ts   # route:forge:types 自动生成
```

---

继续阅读：[05 · 前端工程化](05-frontend-tooling.md) →
