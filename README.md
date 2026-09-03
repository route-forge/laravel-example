<p align="center">
  <strong>route-forge × Laravel</strong>
  <br>
  <sub>一套完整的「命名路由 → 类型安全 → 前后端联动」示例仓库</sub>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/PHP-8.5%2B-777BB4?style=flat-square&logo=php" alt="PHP" />
  <img src="https://img.shields.io/badge/Laravel-13.x-FF2D20?style=flat-square&logo=laravel" alt="Laravel" />
  <img src="https://img.shields.io/badge/license-MIT-green?style=flat-square" alt="License" />
</p>

---

## 这是什么

这是 **route-forge 生态的官方整合示例仓库**，用来演示如何把 Laravel 的命名路由变成前端也能类型安全消费的 `route()` 函数。

本仓库采用**分支分流**策略：后端 Laravel 代码在 `main` 作为基础，Vue 和 React 两套前端方案分别在独立分支完整实现。

## 分支说明

| 分支 | 前端栈 | 说明 |
|------|--------|------|
| `main` | （纯 Laravel 后端基座） | 仓库入口，只保留初始化的 Laravel 骨架 + route-forge 后端包接入 |
| `vue` | Vue 3 + Element Plus + UnoCSS | 完整的 Vue 版企业画册示例，含 `.docs/` 全套文档 |
| `react` | React 19 + Ant Design + UnoCSS | 完整的 React 版企业画册示例，含 `.docs/` 全套文档 |

切换到对应分支即可查看完整示例和文档：

```bash
git checkout vue    # Vue 版
git checkout react  # React 版
```

## route-forge 生态

route-forge 拆成三个包，分别覆盖后端 → 上下文 → 前端三层：

```
route-forge/laravel (后端 PHP 包)
        │
        │  命名路由 → forge 上下文 JSON → Blade @forgeSummary 注入
        ▼
  @route-forge/core (前端 TS 核心库)
        │
        │  解析 forge 上下文 → 框架无关的 route() 函数 + 类型定义
        ▼
  @route-forge/react / @route-forge/vue (框架适配器)
        React: RouteForgeProvider + useRouteForge() Hook
        Vue:   createRouteForgePlugin() + useRouteForge() 组合式 API
```

### route-forge/laravel（后端）

把 Laravel 路由表中的命名路由导出成 forge 上下文 JSON，供前端消费。

```php
// 1. 安装
composer require route-forge/laravel

// 2. 定义命名路由
Route::name('catalog.show')->get('/catalog/{slug}', [CatalogController::class, 'show']);

// 3. Blade 中注入 forge 上下文
// resources/views/layout.blade.php
@forgeSummary
// 这一行会在 HTML 里注入 window.__FORGE__ = { routes: { ... }, ... }
```

### @route-forge/core（前端 TS 核心）

框架无关的 `route()` 实现，负责解析 forge 上下文 JSON 并提供 URL 生成能力。

```ts
import { createForge } from '@route-forge/core';

// 手动创建（适用于纯 JS / 非组件上下文）
const forge = createForge(window.__FORGE__);
forge.route('catalog.show', { slug: 'hello' }); // → "/catalog/hello"
```

### 框架适配器

**React 版 — `@route-forge/react`：**

```tsx
// main.tsx
import { RouteForgeProvider } from '@route-forge/react';

createRoot(document.getElementById('root')!).render(
  <RouteForgeProvider>
    <App />
  </RouteForgeProvider>
);

// 组件内使用
function Nav() {
  const { route } = useRouteForge();
  return <Link to={route('catalog.show', { slug: 'hello' })}>画册</Link>;
}
```

**Vue 版 — `@route-forge/vue`：**

```js
// app.js
import { createRouteForgePlugin } from '@route-forge/vue';

const app = createApp(App);
const forge = createRouteForgePlugin({});
app.use(forge);
forge.ready().then(() => app.mount('#app'));
```

## 快速开始

```bash
# 1. 进入你想看的前端版本分支
git checkout react   # 或 vue

# 2. 一键安装（后端 + 前端）
composer setup

# 3. 本地开发
composer dev
```

更详细的安装步骤、技术栈说明和架构解析，请切换到对应分支查看 `README.md` 和 `.docs/` 目录。

## License

MIT © route-forge
