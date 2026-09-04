# 03 · 前端接入：@route-forge/react

> 读完本文你会知道：如何用 `RouteForgeProvider` 初始化、如何与 React Router 配合、
> `useForgeApi` 怎么按层级发请求（含懒加载层级）、以及「先空串、后更新」的门闩处理。
> 所有 API 均以 2.2 版真实行为为准（依据包源码核对）。

---

## 目录

- [安装](#安装)
- [Provider 初始化](#provider-初始化)
- [CSRF 拦截器](#csrf-拦截器)
- [与 React Router 配合](#与-react-router-配合)
- [useForgeRoute：URL 生成 Hook](#useforgeRouteurl-生成-hook)
- [ForgeLink 与 ForgeRoute 组件](#forgelink-与-forgeroute-组件)
- [useForgeApi：按层级发请求](#useforgeapi按层级发请求)
- [懒加载层级与门闩](#懒加载层级与门闩)
- [TypeScript 类型](#typescript-类型)
- [错误处理原则](#错误处理原则)

---

## 安装

前端依赖在 `package.json` 中声明：

```json
{
  "dependencies": {
    "@route-forge/core": "^2.2.0",
    "@route-forge/react": "^2.2.0",
    "react-router": "^7"
  }
}
```

```bash
pnpm add @route-forge/core @route-forge/react react-router
```

## Provider 初始化

`@route-forge/react` 的入口是 `<RouteForgeProvider>`——React Context Provider，创建并注入
forge 实例。`resources/js/app.jsx`：

```jsx
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router';
import { RouteForgeProvider } from '@route-forge/react';
import { router } from './router.jsx';
import forgeOptions from './forge-options.js';

createRoot(document.getElementById('app')).render(
  <RouteForgeProvider options={forgeOptions}>
    <RouterProvider router={router} />
  </RouteForgeProvider>,
);
```

关键行为：

- **`options` 可省略**：页面内嵌了 `@forgeSummary`（即 `window.__ROUTE_FORGE__`）时，
  `<RouteForgeProvider>` 不传 options 也能工作 —— 完全靠内嵌摘要
- **实例稳定性**：options 浅比较（含数组元素与嵌套字段），只有真正变化才重建 forge 实例 ——
  父组件重渲染时的内联字面量不会导致重复拉取摘要 / 丢失缓存
- **无 ready() 门闩**：与 Vue 适配器不同，React 侧建实例即可渲染；内嵌摘要是同步读取的，
  网络摘要（`options.endpoint`）的并发请求由 core 层 inflight 去重兜底

`useForge` Hook 在任意子组件取实例：

```jsx
const forge = useForge();                        // 不绑层级
forge.api('public', 'api.catalogs.index');       // 需显式传 level

const forge = useForge({ level: 'manage' });     // 绑定层级
forge('api.catalogs.index');                     // 直接调用 = api 快捷方式
forge.level;                                     // → 'manage'
forge.levelLoaded;                               // boolean
```

## CSRF 拦截器

管理端接口走 Laravel 的 `web` 中间件组（session + CSRF）。SPA 全程不刷新页面，CSRF token
会在会话轮换中变化 —— 用 core 的拦截器保证每次请求都带最新 token
（`resources/js/forge-options.js`）：

```js
// 从 cookie 读 XSRF-TOKEN；每次响应后若 Set-Cookie 带新 token 则热更新
let csrf = getCookie('XSRF-TOKEN');

export default {
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
};
```

## 与 React Router 配合

分工原则一句话： **React Router 管「URL → 组件」映射，route-forge 管「路由名 → URL」生成**。

```jsx
// resources/js/router.jsx
import { createBrowserRouter } from 'react-router';

export const router = createBrowserRouter([
  { path: '/', element: <HomePage /> },
  { path: '/catalogs', element: <CatalogsPage /> },
  { path: '/catalogs/:slug', element: <CatalogPage /> },
  // 管理端：React.lazy 异步 chunk，登录相关路由不进前台 bundle
  { path: '/admin/*', element: <ManageApp /> },
]);
```

后端配合：`routes/web.php` 保留一条入口 + catch-all 回退，把非 `/api`、非 `/_forge` 的请求全部
落到 `index.blade.php`，刷新 / 直达深链不 404。

组件里导航永远用路由名，不写 URL 字面量：

```jsx
import { useNavigate } from 'react-router';
import { useForge } from '@route-forge/react';

function CatalogCard({ item }) {
  const navigate = useNavigate();
  const forge = useForge({ level: 'public' });

  return (
    <button onClick={() => navigate(forge('api.catalogs.show', { slug: item.slug }))}>
      {item.title}
    </button>
  );
}
```

## useForgeRoute：URL 生成 Hook

```jsx
const href = useForgeRoute(level, name, params?, hooks?);
// 例：const href = useForgeRoute('public', 'api.catalogs.show', { slug });
```

| 特性                       | 行为                                                                     |
|----------------------------|--------------------------------------------------------------------------|
| 层级未加载（lazy 层级）    | 返回空字符串 `''`，**不抛错**，渲染不崩                                  |
| 层级加载完成               | 自动更新，返回正确 URL                                                   |
| 渲染期错误（名字不存在等） | 降级为 `''` 保证渲染不中断，同时以醒目的样式化 warn 输出完整错误          |
| level 契约                 | 静态快照：首次渲染求值后固定，不支持中途切换（换层级请在新组件里另行调用）|
| 运行时守卫                 | level 非字符串直接抛 `TypeError`（防 JS 用户误用静默降级）               |

`name` / `params` 变化时自动重算 URL。

## ForgeLink 与 ForgeRoute 组件

两者都是对 `useForgeRoute`「先空串、后更新」异步行为的封装：

### ForgeLink —— 便捷链接

```jsx
// 默认渲染原生 <a href>
<ForgeLink level="public" name="api.catalogs.show" params={{ slug }}>
  查看画册
</ForgeLink>

// as 注入任意 Link 组件（react-router 的 Link、next/link 等），零依赖设计
import { Link } from 'react-router';

<ForgeLink level="public" name="api.catalogs.show" params={{ slug }} as={Link}>
  查看画册
</ForgeLink>
```

- 未加载（或解析出错）时默认不渲染任何内容，每实例 console.warn 提醒一次（防刷屏）
- 其余 props（className / target / rel…）透传到链接元素

### ForgeRoute —— render-prop 形态

```jsx
<ForgeRoute level="manage" name="manage.api.catalogs.show" params={{ catalog: id }}>
  {({ href, loaded }) =>
    loaded ? <Link to={href}>查看</Link> : <Spin size="small" />
  }
</ForgeRoute>
```

`loaded = href !== ''`（层级未加载与解析出错都降级为 `''`，正好复用该哨兵值）。

## useForgeApi：按层级发请求

三种形态：

```jsx
// 1. 不绑层级：call 需要传 level
const { call } = useForgeApi();
call('public', 'api.catalogs.index');

// 2. 绑定层级：call 无需传 level（本项目主要用法）
const { call, pending, error } = useForgeApi({ level: 'public' });
await call('api.catalogs.show', { params: { slug } });

// 3. 绑定层级 + 前缀：路由名自动拼接 prefix
const { call } = useForgeApi({ level: 'manage', prefix: 'manage.api.' });
call('catalogs.index');
```

返回值：

| 属性      | 说明                                                                     |
|-----------|--------------------------------------------------------------------------|
| `call`    | 发请求，返回 `{ data, error }` 状态壳                                    |
| `pending` | `boolean`，**引用计数**：并发多个 call 时全部完成才置 false              |
| `error`   | 最后一次请求的错误                                                       |

`call()` 的三层结构：

```jsx
const res = await call('api.catalogs.show', { params: { slug } });

if (res.error) { /* 走 messageOf(error) 兜底提示 */ }
else {
  // res.data → HTTP 响应对象；res.data.data → Laravel 响应体（Resource 信封 { data, meta, links }）
  const catalog = res.data.data;
}
```

本项目把三层拆包收在 `resources/js/support/api.js`（`bodyOf` / `pageOf` / `messageOf`），
组件里不出现 `.data.data.data` 链。

## 懒加载层级与门闩

`manage` 层级是 `lazy` 的：路由明细不在首屏摘要里，登录后首次调用
`useForgeApi({ level: 'manage' })` 时自动请求 `GET /_forge/routes/manage`（受
`endpoint_middleware` 保护），拿到明细后构建路由表。

这意味着 **登录前 / 明细到达前**，manage 层级的 URL 生成与请求都不可用。三道门闩：

1. **`levelLoaded`**：`useForge({ level: 'manage' }).levelLoaded` 是布尔状态，可驱动条件渲染
2. **`useForgeRoute` 自动门闩**：未就绪返回 `''`，就绪后自动补上
3. **组件封装**：`ForgeLink` / `ForgeRoute` 未就绪时自动渲染占位（默认什么都不渲染），
   `ForgeRoute` 的 render-prop 还给出 `loaded` 供自由控制

```jsx
function CatalogActions({ catalog }) {
  const forge = useForge({ level: 'manage' });
  if (!forge.levelLoaded) return <Spin size="small" />;

  return <Link to={forge('api.catalogs.show', { catalog: catalog.id })}>查看</Link>;
}
```

## TypeScript 类型

后端 `route:forge:types` 生成 `resources/js/types/forge-routes.d.ts` 后，通过 module
augmentation 注入 `ForgeRouteMap`，`useForge` / `useForgeApi` / `useForgeRoute` 的
level / 路由名 / 参数全部自动推断：

```tsx
forge('api.catalogs.show', { slug });    // ✅
forge('api.catalogs.show', {});          // ❌ 缺 slug：编译报错
forge('api.catalog.show', { slug });     // ❌ 名字拼错：编译报错
```

生成命令与参数见 [02 · 后端接入](02-backend-integration.md#生成-typescript-类型)。

## 错误处理原则

本项目与 route-forge 生态共享一条设计铁律： **前端校验始终抛错，拒绝静默忽略**。

| 场景                       | 行为                                                                 |
|----------------------------|----------------------------------------------------------------------|
| 路由名不存在               | 抛错并给出最接近的正确名字建议（拼写建议）                           |
| 必填参数缺失 / 类型不符    | 抛错，不做静默填充                                                   |
| 渲染期（useForgeRoute 等） | 降级 `''` 不中断渲染，warn/error 上报完整错误 —— 渲染韧性 ≠ 吞掉错误 |
| HTTP 非 2xx               | `call()` 的 `error` 携带 status / route / url 等元信息               |

> 已知限制：HTTPError 目前不携带响应体，Laravel 422 的字段级错误到不了前端。对策是表单
> 在前端按同一套规则先校验，服务端 422 只作兜底；根治需在 core 侧把响应体挂上 HTTPError
> （已记为待议项）。

---

继续阅读：[04 · 企业画册栏目结构](04-catalog-structure.md) →
