# 04 · 企业画册：栏目结构与内容模型

> 本文是画册的「产品设计文档」—— 把栏目划分、路由表设计、数据库 Schema、前后端字段契约一次性定下来。
> route-forge 的价值在这里最直观：**路由表即产品结构**。

> 💡 本文与 Vue 版 **完全相同** —— 路由表、数据库 Schema、API Response 都是后端定义的，和前端框架无关。

---

## 目录

- [画册栏目总览](#画册栏目总览)
- [完整路由表](#完整路由表)
- [数据库 Schema](#数据库-schema)
- [前后端字段契约](#前后端字段契约)
- [目录结构对应](#目录结构对应)

---

## 画册栏目总览

企业画册定位于「公司官网 + 产品展示 + 品牌故事」三位一体的单页多栏目应用。分为 **5 大栏目**：

```
┌─────────────────────────────────────────────────────────┐
│  画册导航                                                │
│                                                         │
│  首页 Home        · 品牌一句话介绍 + 核心亮点 + CTA       │
│  关于 About      · 公司简介 / 发展历程 / 团队            │
│  产品 Products   · 产品分类 → 产品详情                   │
│  案例 Catalog    · 画册列表 → 画册详情                   │
│  联系 Contact    · 表单 + 地图 + 联系方式                │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

## 完整路由表

所有路由都有命名，由 `route-forge/laravel` 自动纳入 forge 上下文：

```php
// routes/web.php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\HomeController;
use App\Http\Controllers\AboutController;
use App\Http\Controllers\ProductController;
use App\Http\Controllers\CatalogController;
use App\Http\Controllers\ContactController;

// ── 首页 ──────────────────────────────────────────────
Route::name('home')->get('/', [HomeController::class, 'index']);

// ── 关于 ──────────────────────────────────────────────
Route::name('about.')->group(function () {
    Route::name('company')->get('/about', [AboutController::class, 'company']);
    Route::name('timeline')->get('/about/timeline', [AboutController::class, 'timeline']);
    Route::name('team')->get('/about/team', [AboutController::class, 'team']);
});

// ── 产品 ──────────────────────────────────────────────
Route::name('products.')->group(function () {
    Route::name('index')->get('/products', [ProductController::class, 'index']);
    Route::name('category')->get('/products/{category}', [ProductController::class, 'category']);
    Route::name('show')->get('/products/{category}/{slug}', [ProductController::class, 'show']);
});

// ── 画册 ──────────────────────────────────────────────
Route::name('catalog.')->group(function () {
    Route::name('index')->get('/catalog', [CatalogController::class, 'index']);
    Route::name('show')->get('/catalog/{slug}', [CatalogController::class, 'show']);
});

// ── 联系 ──────────────────────────────────────────────
Route::name('contact.')->group(function () {
    Route::name('form')->get('/contact', [ContactController::class, 'form']);
    Route::name('submit')->post('/contact', [ContactController::class, 'submit']);
});
```

### forge 上下文产出预览

上面这 11 条路由会在 forge 上下文中生成：

| 路由名 | URI | 方法 | 必填参数 |
|--------|-----|------|---------|
| `home` | `/` | GET | — |
| `about.company` | `/about` | GET | — |
| `about.timeline` | `/about/timeline` | GET | — |
| `about.team` | `/about/team` | GET | — |
| `products.index` | `/products` | GET | — |
| `products.category` | `/products/{category}` | GET | `category` |
| `products.show` | `/products/{category}/{slug}` | GET | `category`, `slug` |
| `catalog.index` | `/catalog` | GET | — |
| `catalog.show` | `/catalog/{slug}` | GET | `slug` |
| `contact.form` | `/contact` | GET | — |
| `contact.submit` | `/contact` | POST | — |

前端可直接消费：

```tsx
import { Link } from 'react-router-dom';
import { useRouteForge } from '@route-forge/react';

function Header() {
  const { route } = useRouteForge();
  return (
    <nav>
      <Link to={route('home')}>首页</Link>
      <Link to={route('catalog.show', { slug: 'company-intro' })}>公司画册</Link>
      <Link to={route('products.show', { category: 'hardware', slug: 'router-x1' })}>产品</Link>
    </nav>
  );
}
```

## 数据库 Schema

### products（产品）

```sql
CREATE TABLE products (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  category VARCHAR(50) NOT NULL COMMENT '分类 slug: hardware / software / service',
  slug VARCHAR(100) NOT NULL COMMENT '产品 URL slug',
  name VARCHAR(200) NOT NULL COMMENT '产品名称',
  tagline VARCHAR(300) NULL COMMENT '一句话卖点',
  description TEXT NOT NULL COMMENT '详细描述（富文本）',
  cover_image VARCHAR(500) NULL COMMENT '封面图 URL',
  gallery JSON NULL COMMENT '图集',
  features JSON NULL COMMENT '特性列表 [{ icon, title, desc }]',
  specifications JSON NULL COMMENT '技术规格 { key: value }',
  sort_order INT DEFAULT 0,
  is_published TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP NULL,
  updated_at TIMESTAMP NULL,
  UNIQUE KEY unique_category_slug (category, slug)
);
```

### catalogs（画册）

```sql
CREATE TABLE catalogs (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  slug VARCHAR(100) NOT NULL UNIQUE,
  title VARCHAR(200) NOT NULL,
  summary VARCHAR(500) NULL,
  cover_image VARCHAR(500) NULL,
  pages JSON NOT NULL COMMENT '画册页面 [{ title, content, image }]',
  publish_date DATE NULL,
  sort_order INT DEFAULT 0,
  is_published TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP NULL,
  updated_at TIMESTAMP NULL
);
```

### team_members（团队成员）

```sql
CREATE TABLE team_members (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  role VARCHAR(100) NOT NULL COMMENT '职位',
  department VARCHAR(100) NULL COMMENT '部门',
  avatar VARCHAR(500) NULL,
  bio TEXT NULL,
  sort_order INT DEFAULT 0,
  is_active TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP NULL,
  updated_at TIMESTAMP NULL
);
```

### contact_messages（联系留言）

```sql
CREATE TABLE contact_messages (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(200) NOT NULL,
  company VARCHAR(200) NULL,
  phone VARCHAR(50) NULL,
  subject VARCHAR(200) NULL,
  message TEXT NOT NULL,
  status ENUM('new', 'read', 'replied', 'archived') DEFAULT 'new',
  created_at TIMESTAMP NULL,
  updated_at TIMESTAMP NULL
);
```

## 前后端字段契约

后端 Eloquent 模型返回的 JSON 结构，前端按这个契约消费。

### Product API Response

```json
{
  "id": 1,
  "category": "hardware",
  "slug": "router-x1",
  "name": "Router X1 企业级路由器",
  "tagline": "千兆性能，企业首选",
  "description": "<p>富文本描述...</p>",
  "cover_image": "https://cdn.example.com/products/router-x1/cover.jpg",
  "gallery": [
    "https://cdn.example.com/products/router-x1/gallery-1.jpg",
    "https://cdn.example.com/products/router-x1/gallery-2.jpg"
  ],
  "features": [
    { "icon": "Zap", "title": "千兆吞吐", "desc": "10/100/1000Mbps 全千兆端口" },
    { "icon": "Shield", "title": "企业安全", "desc": "内置防火墙 + VPN 透传" }
  ],
  "specifications": {
    "ports": "8 × 千兆 RJ45",
    "cpu": "双核 1.2GHz",
    "ram": "512MB"
  }
}
```

### Catalog API Response

```json
{
  "id": 1,
  "slug": "company-intro-2024",
  "title": "企业介绍画册 2024",
  "summary": "一份完整展示公司实力、产品矩阵和成功案例的年度画册",
  "cover_image": "https://cdn.example.com/catalogs/company-2024/cover.jpg",
  "pages": [
    { "title": "公司概览", "content": "<p>...</p>", "image": null },
    { "title": "产品矩阵", "content": "<p>...</p>", "image": "https://..." }
  ],
  "publish_date": "2024-03-15"
}
```

### 团队成员 API Response

```json
[
  {
    "id": 1,
    "name": "张三",
    "role": "CEO",
    "department": "管理层",
    "avatar": "https://cdn.example.com/team/zhangsan.jpg",
    "bio": "2010 年创立公司..."
  }
]
```

## 目录结构对应

| 栏目 | 后端 Controller | 前端页面组件 | 路由名前缀 |
|------|----------------|-------------|-----------|
| 首页 | `HomeController` | `pages/Home.tsx` | `home` |
| 关于 | `AboutController` | `pages/AboutCompany.tsx`, `pages/AboutTimeline.tsx`, `pages/AboutTeam.tsx` | `about.*` |
| 产品 | `ProductController` | `pages/ProductsIndex.tsx`, `pages/ProductsCategory.tsx`, `pages/ProductsShow.tsx` | `products.*` |
| 画册 | `CatalogController` | `pages/CatalogIndex.tsx`, `pages/CatalogShow.tsx` | `catalog.*` |
| 联系 | `ContactController` | `pages/ContactForm.tsx` | `contact.*` |

```
resources/js/
├── main.tsx                  # React 入口 + RouteForgeProvider
├── App.tsx                   # 根组件
├── router.tsx                # React Router 路由表
├── components/               # 通用组件
│   ├── SiteHeader.tsx
│   ├── SiteFooter.tsx
│   ├── FeatureCard.tsx
│   └── ...
├── pages/                    # 页面级组件
│   ├── Home.tsx
│   ├── AboutCompany.tsx
│   ├── AboutTimeline.tsx
│   ├── AboutTeam.tsx
│   ├── ProductsIndex.tsx
│   ├── ProductsCategory.tsx
│   ├── ProductsShow.tsx
│   ├── CatalogIndex.tsx
│   ├── CatalogShow.tsx
│   └── ContactForm.tsx
└── types/
    └── forge.d.ts            # ← forge:types 自动生成
```

---

继续阅读：[05 · 前端工程化](05-frontend-tooling.md) →
