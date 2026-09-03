# 03 · 前端接入：@route-forge/vue

> 读完本文你会知道：如何初始化 Vue 插件、如何在组件里调用 `route()`、TypeScript 类型怎么联动、以及常见坑的规避方式。

---

## 目录

- [安装](#安装)
- [Vue 插件初始化](#vue-插件初始化)
- 在组件中使用 route ()](#在组件中使用-route)
- TypeScript 类型推断](#typescript-类型推断)
- 错误处理与边界情况](#错误处理与边界情况)
- 进阶用法](#进阶用法)
- 常见问题](#常见问题)

---

## 安装

前端两个包已在 `package.json` 中声明：

```json
{
  "dependencies": {
    "@route-forge/core": "^2.2.0",
    "@route-forge/vue": "^2.2.0"
  }
}
```

首次安装：

```bash
npm install @route-forge/core @route-forge/vue
# 或 pnpm add @route-forge/core @route-forge/vue
```

## Vue 插件初始化

这是本项目的实际代码，位于 `resources/js/app.js`：

```js
import { createApp } from 'vue';
import App from './App.vue';
import 'virtual:uno.css';
import { createRouteForgePlugin } from '@route-forge/vue';

const app = createApp(App);
const forge = createRouteForgePlugin({});
app.use(forge);
forge
  .ready()
  .then(function () {
    app.mount('#app');
  })
  .catch(function () {
    console.error('Route Forge 插件初始化失败');
  });
```

### 为什么要等 ready () 再 mount

`forge.ready()` 是一个 Promise，它要做的事：

1. 读取 `@forgeSummary` 注入的 `window.__FORGE__` JSON
2. 校验结构版本
3. 构建内部路由表 Map
4. 注册 Vue 的 provide/inject

如果你在 `ready()` resolve 之前就 mount 了，组件里的 `useRouteForge()` 会拿到空路由表，所有 `route()`
调用都会失败。

### 插件配置项

`createRouteForgePlugin(options)` 接受以下可选参数：

```js
const forge = createRouteForgePlugin({
  // 默认从 window.__FORGE__ 读取；如果后端改了变量名这里也要对应改
  globalVariableName: '__FORGE__',

  // 开发模式下打印详细日志（路由注册、参数校验等）
  debug: import.meta.env.DEV,

  // 找不到路由时的行为
  // 'error'   → 抛出异常（开发推荐）
  // 'warn'    → console.warn 并返回空字符串
  // 'silent'  → 静默返回空字符串
  onMissingRoute: 'error',

  // 参数校验严格模式：类型不匹配也报错
  strictParams: true,
});
```

## 在组件中使用 route ()

### 组合式 API（推荐）

```vue
<script setup>
import { useRouteForge } from '@route-forge/vue';

const { route, routes, hasRoute } = useRouteForge();
</script>

<template>
  <div>
    <!-- 生成简单 URL -->
    <a :href="route('home')">首页</a>

    <!-- 带参数 -->
    <a :href="route('admin.users.edit', { user: 3 })">编辑用户</a>

    <!-- 可选参数留空 -->
    <a :href="route('blog.posts.show', { slug: 'hello' })">文章</a>

    <!-- 带 query string -->
    <a :href="route('products.index', {}, { query: { page: 2 } })">下一页</a>

    <!-- 绝对 URL -->
    <a :href="route('home', {}, { absolute: true })">外链首页</a>
  </div>
</template>
```

### 模板里直接用（全局方法）

插件注册后会自动把 `route` 挂到 Vue 的全局属性上， **模板里不需要任何 import**：

```vue
<template>
  <a :href="route('home')">首页</a>
  <a :href="route('catalog.show', { slug: 'company-intro' })">公司画册</a>
</template>
```

### 返回值速查

`route(name, params, options)` → `string`

| 参数               | 类型      | 说明                                                |
|--------------------|-----------|-----------------------------------------------------|
| `name`             | `string`  | 路由名，如 `'admin.users.edit'`                     |
| `params`           | `object`  | 路由参数键值对                                      |
| `options`          | `object`  | 可选配置                                            |
| `options.query`    | `object`  | 追加的 query string，如 `{ page: 2, sort: 'name' }` |
| `options.absolute` | `boolean` | 是否返回绝对 URL（基于后端 `baseUrl`）              |
| `options.signed`   | `boolean` | 是否签名 URL（对应 Laravel 的 URL::signedRoute）    |

`useRouteForge()` 返回：

| 属性                             | 类型                        | 说明                                |
|----------------------------------|-----------------------------|-------------------------------------|
| `route(name, params?, options?)` | `function`                  | URL 生成函数                        |
| `routes`                         | `ForgeRoute[]`              | 当前所有已注册路由的只读列表        |
| `hasRoute(name)`                 | `(name: string) => boolean` | 判断某路由是否存在                  |
| `forge`                          | `Forge`                     | 原始 Forge 实例（一般不需要直接用） |

## TypeScript 类型推断

如果项目中有 `forge:types`
生成的类型文件（见 [02 · 后端接入](02-backend-integration.md#生成-typescript-类型)），`route()`
的参数类型会自动联动。

### 安装类型支持

需要让 TypeScript 找到类型文件，在 `tsconfig.json` 或 `jsconfig.json` 中确保：

```json
{
  "include": [
    "resources/js/**/*.d.ts",
    "resources/js/**/*.js"
  ]
}
```

本项目的 `jsconfig.json` 已经有类似配置。

### 有类型 vs 无类型

```typescript
// ❌ 没有类型文件：params 是 any，完全无提示
route('admin.users.edit', { xxx: 3 });  // 编译通过，运行时报错

// ✅ 有 forge.d.ts：参数签名被约束
route('admin.users.edit', { user: 3 });     // ✅ OK
route('admin.users.edit', { xxx: 3 });      // ❌ TS 报错：Object literal may only specify known properties
route('blog.posts.show', { slug: 'hello' }); // ✅ category 是可选的
route('blog.posts.show', {});                // ❌ TS 报错：缺少必需的 slug
```

### 在 JS 项目中也能享受到类型

本项目用的是 JS（不是 TS），但得益于 Vue Language Features (Volar)，在 `.vue` 的 `<script setup>`
里依然能获得类型提示。确保 VS Code 安装了 **Vue - Official** 插件。

## 错误处理与边界情况

### 路由名不存在

开发模式（`onMissingRoute: 'error'`）：

```
Uncaught Error: [route-forge] Route "admin.userz.edit" not found. Did you mean "admin.users.edit"?
```

注意它会做 **拼写建议**，帮你找到最可能的正确路由名。

### 缺少必填参数

```
Uncaught Error: [route-forge] Missing required param "user" for route "admin.users.edit".
```

### 参数值包含特殊字符

route-forge 会自动对参数值做 `encodeURIComponent`：

```js
route('catalog.show', { slug: '企业画册 2024' });
// → "/catalog/%E4%BC%81%E4%B8%9A%E7%94%BB%E5%86%8C%202024"
```

### 可选参数未传

```js
// 定义: /blog/{category?}/{slug}
route('blog.posts.show', { slug: 'hello' });
// → "/blog/hello"（可选参数段被移除）
```

## 进阶用法

### 在非 Vue 文件中使用

某些场景（如 router 守卫、工具函数）里没有 Vue 组件上下文，可以直接用 `@route-forge/core`：

```js
import { createForge } from '@route-forge/core';

// 手动创建 Forge 实例（必须已经有 window.__FORGE__）
const forge = createForge(window.__FORGE__);

forge.route('admin.users.edit', { user: 3 });
forge.hasRoute('home');
```

### 配合 Vue Router

route-forge **不是** 路由管理器（那是 Vue Router / TanStack Router 的事），它只负责 **URL 生成**。两者配合：

```js
// router/index.js
import { createRouter, createWebHistory } from 'vue-router';
import { useRouteForge } from '@route-forge/vue';

const router = createRouter({
  history: createWebHistory(),
  routes: [
    // ...
  ],
});

// 在导航守卫里用 route() 生成路径
router.beforeEach((to, from, next) => {
  const { route } = useRouteForge();
  // ...
});
```

或者更常见的： **把 Vue Router 的 path 写成 route-forge 生成的值**（不推荐硬编码两边同步）。最佳实践是：

- 用 Vue Router 管组件映射
- 用 route-forge 管 URL 生成
- 两者的路由名建议一一对应

### 服务端渲染（SSR）

如果项目用了 Nuxt 或 Vite SSR，`window.__FORGE__` 在服务端不可用。`@route-forge/vue` 提供了 server 模式：

```js
// nuxt.config.ts 或 SSR 入口
import { createForge } from '@route-forge/core';
import { createRouteForgePlugin } from '@route-forge/vue';

// 服务端直接从配置传入 forge 上下文 JSON
const forge = createForge(forgeContextJson);
const plugin = createRouteForgePlugin({ forge });
```

## 常见问题

### Q: 页面刷新后 `route()` 报错说找不到路由？

大概率是 `@forgeSummary` 没在 JS 之前加载。检查 Blade 布局里的顺序：

```blade
@forgeSummary                    {{-- 先 --}}
@vite(['resources/js/app.js'])    {{-- 后 --}}
```

### Q: `forge.ready()` 一直不 resolve？

打开 DevTools 看 Console，`window.__FORGE__` 是否存在。如果是 `undefined`，说明后端没注入成功，检查：

1. 布局文件里有没有 `@forgeSummary`
2. 当前页面是否继承了这个布局
3. `config/route-forge.php` 的配置是否正确

### Q: 怎么在 Vue DevTools 里看到路由表？

`useRouteForge().routes` 可以打印：

```js
import { useRouteForge } from '@route-forge/vue';

const { routes } = useRouteForge();
console.table(routes);
```

### Q: 我能在 Blade 里也用 `route()` 函数吗？

Blade 里用的是 Laravel 原生的 `route()` 辅助函数（PHP 侧），不是前端 JS 的。两者名字相同但互不相关。Blade
中：

```blade
{{ route('admin.users.edit', ['user' => 3]) }}
```

这是 Laravel 的，和 route-forge 前端包无关。

### Q: 生产环境 forge 上下文会被缓存吗？

`@forgeSummary` 的内容是动态渲染的（每次请求从路由表实时生成），不会被 Laravel
的视图缓存持久化。所以改了路由刷新页面就能看到最新的 forge 上下文。

---

继续阅读：[04 · 企业画册栏目结构](04-catalog-structure.md) →
