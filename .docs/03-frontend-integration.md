# 03 · 前端接入：@route-forge/vue

> 读完本文你会知道：如何初始化 Vue 插件、如何与 vue-router 配合、`useForgeApi` 怎么按层级发
> 请求（含懒加载层级）、以及懒加载未就绪时的门闩处理。所有 API 均以 2.2 版真实行为为准。

---

## 目录

- [安装](#安装)
- [插件初始化（forge.js）](#插件初始化forgejs)
- [等 ready () 再 mount](#等-ready-再-mount)
- [与 vue-router 配合](#与-vue-router-配合)
- [useForgeRoute：响应式 URL 生成](#useforgeRoute响应式-url-生成)
- [useForgeApi：按层级发请求](#useforgeapi按层级发请求)
- [懒加载层级与门闩](#懒加载层级与门闩)
- [TypeScript 类型](#typescript-类型)
- [错误处理原则](#错误处理原则)

---

## 安装

前端依赖已在 `package.json` 中声明：

```json
{
  "dependencies": {
    "@route-forge/core": "^2.2.0",
    "@route-forge/vue": "^2.2.0",
    "vue-router": "^4"
  }
}
```

```bash
pnpm add @route-forge/core @route-forge/vue vue-router
```

## 插件初始化（forge.js）

本项目把插件实例收在 `resources/js/forge.js`，集中处理 CSRF：

```js
import { createRouteForgePlugin } from '@route-forge/vue';

// 从 cookie 读 XSRF-TOKEN；每次响应后若 Set-Cookie 带新 token 则热更新
let csrf = getCookie('XSRF-TOKEN');

export default createRouteForgePlugin({
  interceptors: {
    request: [
      (config) => {
        if (csrf) config.headers = { ...config.headers, 'X-XSRF-TOKEN': csrf };
        return config;
      },
    ],
    response: [
      (response) => {
        updateCsrfFromSetCookie(response.headers['set-cookie']);
        return response;
      },
      (error) => {
        // 错误响应也可能轮换了 token，同样要接住
        updateCsrfFromSetCookie(error.response?.headers['set-cookie']);
        return Promise.reject(error);
      },
    ],
  },
});
```

为什么需要这层：管理端接口走 Laravel 的 `web` 中间件组（session + CSRF）。SPA 全程不刷新页面， CSRF token
会在会话轮换中变化，拦截器保证每次请求都带最新 token。

## 等 ready () 再 mount

`resources/js/app.js`：

```js
import forge from './forge.js';
import router from './route.js';

const app = createApp(App);
app.use(forge);
app.use(router);

forge.ready().then(() => app.mount('#app'));
```

`forge.ready()` 做的事：

1. 读取 `@forgeSummary` 注入的 `window.__ROUTE_FORGE__`（一次性访问器，读后即删）
2. 解析摘要、构建 eager 层级（`public`）的路由表
3. 注册 provide/inject 与全局属性 `$forge`

在 `ready()` resolve 之前 mount，组件里的 forge 调用会拿到空路由表。

## 与 vue-router 配合

分工原则一句话： **vue-router 管「URL → 组件」映射，route-forge 管「路由名 → URL」生成**。

```js
// resources/js/route.js
import { createRouter, createWebHistory } from 'vue-router';

const routes = [
  { path: '/', component: () => import('@/pages/HomePage.vue') },
  { path: '/catalogs', component: () => import('@/pages/CatalogsPage.vue') },
  { path: '/catalogs/:slug', component: () => import('@/pages/CatalogPage.vue') },
  // 管理端：异步 chunk，登录相关路由不进前台 bundle
  { path: '/admin', component: () => import('@/layout/admin.vue') },
];

export default createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior: () => ({ top: 0 }),
});
```

后端配合：`routes/web.php` 保留一条入口 + catch-all 回退，把非 `/api`、非 `/_forge` 的请求全部 落到
`index.blade.php`，刷新 / 直达深链不 404。

组件里导航永远用路由名，不写 URL 字面量：

```vue
<script setup>
const { route } = useForgeRoute();
const router = useRouter();

function openCatalog(slug) {
  router.push(route('api.catalogs.show', { slug }));
}
</script>
```

## useForgeRoute：响应式 URL 生成

`useForgeRoute()` 返回响应式的 URL 生成器，专为模板渲染设计：

| 特性                       | 行为                                           |
|----------------------------|------------------------------------------------|
| 层级未加载（lazy 层级）    | 返回空字符串 `''`，**不抛错**，模板不崩        |
| 层级加载完成               | 自动重新计算，返回正确 URL                     |
| 渲染期错误（名字不存在等） | 降级为 `''` 保证渲染不中断（错误信息照常上报） |

```vue
<template>
  <!-- public 层级 eager 加载，直接可用 -->
  <router-link :to="route('api.catalogs.show', { slug: item.slug })">{{ item.title }}</router-link>
</template>
```

`useForge()` 返回完整的 forge 实例方法集：

```js
const forge = useForge('manage');          // 绑定层级
forge.level;                               // → 'manage'
forge.levelLoaded;                         // Ref<boolean>，懒加载门闩
forge('api.catalogs.index');               // 直接调用（已绑层级）
forge.route('api.catalogs.show', { slug });// 生成 URL
forge.api('api.catalogs.index');           // 发请求
```

不绑层级时调用需显式传 level：`forge('manage', 'api.catalogs.index')`。

## useForgeApi：按层级发请求

三种形态：

```js
// 1. 不绑层级：call 需要传 level
const { call } = useForgeApi();
call('public', 'api.catalogs.index');

// 2. 绑定层级：call 无需传 level（本项目主要用法）
const { call } = useForgeApi('public');
await call('api.catalogs.index');

// 3. 绑定层级 + 前缀：路由名自动拼接 prefix
const { call } = useForgeApi('manage', 'manage.api.');
call('catalogs.index');
```

`call()` 返回 `{ data, error }` 状态壳：

```js
const { call } = useForgeApi('public');
const res = await call('api.catalogs.show', { params: { slug } });

if (res.error) { /* 走 messageOf(error) 兜底提示 */ }
else {
  // res.data → HTTP 响应对象；res.data.data → Laravel 响应体（Resource 信封 { data, meta, links }）
  const catalog = res.data.data;
}
```

本项目把三层拆包收在 `resources/js/support/api.js`（`bodyOf` / `pageOf` / `messageOf`）， 组件里不出现
`.data.data.data` 链。

## 懒加载层级与门闩

`manage` 层级是 `lazy` 的：路由明细不在首屏摘要里，登录后首次调用 `useForgeApi('manage')`
时自动请求 `GET /_forge/routes/manage`（受 `endpoint_middleware` 保护），拿到明细后构建路由表。

这意味着 **登录前 / 明细到达前**，manage 层级的 `route()` / `call()` 都不可用。两道门闩：

1. **`levelLoaded` Ref**：`useForge('manage').levelLoaded` / `useForgeApi('manage').levelLoaded`
   是响应式布尔值，模板用它切换骨架屏与内容
2. **`useForgeRoute` 自动门闩**：未就绪时返回 `''`，就绪后自动补上 —— 配合
   `v-if`/占位渲染即可，无需手写等待逻辑

```vue
<template lang="pug">
div(v-if='levelLoaded')
  router-link(:to='route("manage.api.catalogs.show", { catalog: id })') 查看
div(v-else)
  | 路由加载中…
</template>
```

## TypeScript 类型

后端 `route:forge:types` 生成 `resources/js/types/forge-routes.d.ts` 后，`route()` /
`call()` 的路由名与参数被 TS 约束（module augmentation 注入 `ForgeRouteMap`）：

```ts
route('api.catalogs.show', { slug });    // ✅
route('api.catalogs.show', {});          // ❌ 缺 slug：编译报错
route('api.catalog.show', { slug });     // ❌ 名字拼错：编译报错
```

生成命令与参数见 [02 · 后端接入](02-backend-integration.md#生成-typescript-类型)。

## 错误处理原则

本项目与 route-forge 生态共享一条设计铁律： **前端校验始终抛错，拒绝静默忽略**。

| 场景                     | 行为                                                        |
|--------------------------|-------------------------------------------------------------|
| 路由名不存在             | 抛错并给出最接近的正确名字建议（拼写建议）                  |
| 必填参数缺失 / 类型不符  | 抛错，不做静默填充                                          |
| 渲染期（模板里的 route） | 降级 `''` 不中断渲染，但错误照常上报 —— 渲染韧性 ≠ 吞掉错误 |
| HTTP 非 2xx              | `call()` 的 `error` 携带 status / route / url 等元信息      |

> 已知限制：HTTPError 目前不携带响应体，Laravel 422 的字段级错误到不了前端。对策是表单
> 在前端按同一套规则先校验，服务端 422 只作兜底；根治需在 core 侧把响应体挂上 HTTPError
> （已记为待议项）。

---

继续阅读：[04 · 企业画册栏目结构](04-catalog-structure.md) →
