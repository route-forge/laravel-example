# 05 · 前端工程化：UnoCSS + JSX + Ant Design

> 本文聚焦本项目前端基座的「怎么搭起来」—— Vite 插件链的执行顺序、JSX 约定、Ant Design
> 按需引入的配置细节、唯一 Blade 壳下的样式分层。这些是前端基座的核心工程决策。

---

## 目录

- [整体架构图](#整体架构图)
- [Vite 插件链详解](#vite-插件链详解)
- [UnoCSS 原子化 CSS](#unocss-原子化-css)
- [JSX 模板约定](#jsx-模板约定)
- [Ant Design 按需与样式注入](#ant-design-按需与样式注入)
- [CSS 注入顺序陷阱](#css-注入顺序陷阱)
- [唯一 Blade 壳下的样式分层](#唯一-blade-壳下的样式分层)

---

## 整体架构图

```
┌──────────────────────────────────────────────────────────┐
│                       vite.config.js                      │
│                                                           │
│   ┌─────────┐   ┌────────┐   ┌──────────┐                │
│   │ Laravel │ → │ UnoCSS │ → │  React   │                │
│   │ plugin  │   │        │   │  plugin  │                │
│   └─────────┘   └────────┘   └──────────┘                │
│        │            │             │                       │
│        ▼            ▼             ▼                       │
│   ┌────────┐  ┌──────────────┐ ┌──────────────────────┐  │
│   │ Blade  │  │ virtual:uno  │ │ JSX/Fast Refresh     │  │
│   │ 热更新  │  │ .css         │ │ （preamble 由 Blade  │  │
│   └────────┘  └──────────────┘ │  壳手工注入，见 §3） │  │
│                                └──────────────────────┘  │
└──────────────────────────────────────────────────────────┘
```

> Ant Design v5/v6 是 CSS-in-JS + ESM：组件样式随渲染按需注入、tree-shake 天然生效，
> **不需要**按需引入插件（社区偶见的 `@ant-design/vite-plugin` 在 npm 上并不存在）。

## Vite 插件链详解

完整配置见 `vite.config.js`，这里逐个解释每个插件的角色和选型理由。

### 1. laravel-vite-plugin

```js
laravel({
  input: ['resources/css/app.css', 'resources/js/app.jsx'],
  refresh: true,
})
```

- **作用**：让 Vite 和 Laravel 的 `@vite` 指令协同工作，提供热更新
- `refresh` 检测 Blade 与路由文件变动自动刷新

### 2. UnoCSS

```js
UnoCSS()
```

- **作用**：扫描 `content` 目录下的文件，将原子类转成 CSS
- 配置在 `uno.config.js`，见下文 UnoCSS 章节

### 3. @vitejs/plugin-react

```js
react()
```

- **作用**：编译 JSX、启用 Fast Refresh（组件级热替换，保留 state）
- ⚠ **Blade 壳必须手工注入 preamble**：plugin-react 给每个 JSX 模块尾部附加
  `if (!window.$RefreshReg$) throw new Error("@vitejs/plugin-react can't detect preamble…")`，
  而设置该全局的 preamble 只由 Vite 处理 `index.html` 时注入。本项目唯一的 HTML 是
  `resources/views/index.blade.php`（`@vite` 手工出 script 标签），Vite 插不上手 →
  **dev 下任意 JSX 模块一执行就白屏**（生产 build 不含该段，`vite build` 测不出来）。
  对策是在 `@vite` 之前、仅当 `public/hot` 存在时注入与插件 `preambleCode` 一致的模块脚本，
  dev 源地址取自 hot 文件：

```blade
@if (file_exists(public_path('hot')))
  @php $reactRefreshEntry = rtrim(file_get_contents(public_path('hot')), "\r\n") . '/@react-refresh'; @endphp
  <script type="module">
    import { injectIntoGlobalHook } from "{{ $reactRefreshEntry }}";
    injectIntoGlobalHook(window);
    window.$RefreshReg$ = () => {};
    window.$RefreshSig$ = () => (type) => type;
  </script>
@endif
```

### 4. Ant Design：无需按需插件

```bash
pnpm add antd @ant-design/icons
```

- antd v5/v6 是 **CSS-in-JS**：组件样式在渲染时按需生成注入，产物天然只含用到的部分，
  不需要 `styleImport`/`babel-plugin-import` 那类旧机制，npm 上也没有 `@ant-design/vite-plugin`
- 主色、中文 locale 经 `<ConfigProvider theme token / locale>` 下发（见 `app.jsx`）
- 与 UnoCSS 的先后顺序由 `app.jsx` 的 import 顺序保证（见下文「CSS 注入顺序陷阱」）

## UnoCSS 原子化 CSS

### 核心思路

在 JSX / Blade 里直接写 class 名字，UnoCSS 扫描后生成对应 CSS：

```jsx
// 写 class 名
<div className="mt-8 flex flex-wrap items-center gap-3">

// UnoCSS 自动生成 CSS
.mt-8 { margin-top: 2rem; }
.flex { display: flex; }
```

### 本项目的 UnoCSS 配置要点

```js
// uno.config.js（示意）
export default defineConfig({
  presets: [presetUno()],
  content: {
    filesystem: [
      'resources/views/**/*.blade.php',   // ← Blade 壳也扫
      'resources/js/**/*.{jsx,js,ts}',    // ← JSX 源码
    ],
  },
  shortcuts: [
    {
      'shell': 'mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8',
      'lead': 'text-base md:text-lg text-gray-600 leading-relaxed',
      'surface': 'rounded-2xl border border-gray-200 bg-gray-50 p-6',
    },
  ],
  theme: {
    colors: {
      brand: {
        50:  '#eff6fc',
        100: '#d9e9f7',
        500: '#1668ac',
        700: '#0e4f82',
      },
    },
  },
});
```

### shortcuts 的价值

shortcuts 是「组件级」的原子类组合 —— 一次写好，多处复用：

```jsx
<div className="shell">...</div>      // → mx-auto w-full max-w-6xl ...
<p className="lead">...</p>           // → text-base md:text-lg ...
```

> ⚠️ UnoCSS theme.breakpoints 绕过 deep merge：只写子集会整套替换，所有 `md:` / `sm:`
> 变体静默失配且无报错 —— 自定义断点必须写全量 map。

## JSX 模板约定

本项目用 JSX 而非模板引擎，约定如下：

### 条件与列表直接用 JS

```jsx
{items.map(item => (
  <CatalogCard key={item.id} item={item} />
))}

{loaded ? <CatalogDetail /> : <Skeleton />}
```

没有指令层，逻辑就是 JavaScript —— 这是 JSX 相对模板语法的核心优势，也是本项目不引入
模板引擎的原因。

### className 而不是 class

```jsx
// ❌ JSX 里 class 是保留字
<div class="shell">

// ✅
<div className="shell">
```

### 样式方案优先级

1. UnoCSS 原子类（默认）
2. shortcuts（复用组合）
3. CSS Modules / 内联 style（仅组件私有动态样式）

## Ant Design 按需与样式注入

### 为什么不需要任何按需插件

antd v5/v6 用 CSS-in-JS（`@ant-design/cssinjs`）：组件样式在**渲染时按需生成并注入**，
JS 侧又是标准 ESM，未 import 的组件由 Vite/Rolldown 直接 tree-shake 掉。所以既不需要
`babel-plugin-import`，也没有可装的 `@ant-design/vite-plugin`（npm 上不存在）。

本项目唯一静态引入的是全局 reset：

```jsx
import 'antd/dist/reset.css';   // app.jsx 第一行，见「CSS 注入顺序陷阱」
```

主色与中文由 `<ConfigProvider theme={{ token: { colorPrimary } }} locale={zhCN}>` 下发；
`message` / `modal` 要用 `<App>` + `App.useApp()` 取，静态方法会脱离这份上下文。

> dev 下 Fast Refresh 的 preamble 注入要求见上文「Vite 插件链详解 §3」——那是本项目
> Blade 壳特有的坑，`vite build` 验证不到。

### 图标显式引入

图标显式 import，便于 tree-shake 与代码检索：

```jsx
import { Search } from '@ant-design/icons';

<Search />
```

### 中文语境

```jsx
import zhCN from 'antd/locale/zh_CN';
import { ConfigProvider } from 'antd';

<ConfigProvider locale={zhCN}>
  <RouterProvider router={router} />
</ConfigProvider>
```

## CSS 注入顺序陷阱

这是本项目 `resources/js/app.jsx` 顶部注释花大篇幅解释的问题，总结在此：

### CSS 优先级规则

> **特异性相同时，后加载的覆盖先加载的。**

Ant Design 的组件样式和 UnoCSS 的工具类特异性很接近，必须让 UnoCSS 工具类排在后面才能覆盖。

### 本项目的顺序安排

```js
// app.jsx —— import 顺序 = 模块求值顺序
import 'antd/dist/reset.css';   // antd reset 最先
import 'resources/css/app.css'; // 基线变量
import 'virtual:uno.css';       // UnoCSS preflight + 工具类（最后求值）
```

执行顺序：

```
1. antd reset —— 基线重置
2. Ant Design 组件样式（随组件按需注入）
3. virtual:uno.css（UnoCSS，最后注入）
→ UnoCSS 的 .bg-brand-500 能覆盖 Ant Design 默认背景色 ✅
```

如果把 UnoCSS 放在 Ant Design 之前，`bg-brand-500` 就会被 antd 的默认背景覆盖 —— 表现为
「className 写了但颜色没变」，非常隐蔽。

## 唯一 Blade 壳下的样式分层

前后端分离后，Blade 只剩一个壳（`index.blade.php`），样式分四层：

| 层                | 载体                                        | 作用                                   | 示例                     |
|-------------------|---------------------------------------------|----------------------------------------|--------------------------|
| **Blade 壳层**    | `resources/css/app.css`（@vite 独立入口）   | 全站基线变量、字体                     | `body { ... }`           |
| **UnoCSS 层**     | `virtual:uno.css`（app.jsx 里最后 import）  | preflight、工具类、shortcuts           | `.mt-8`, `.shell`        |
| **组件库层**      | Ant Design 按需样式                         | 组件默认样式                           | `.ant-btn`               |
| **React 组件层**  | CSS Modules / 内联 style                    | 组件私有样式                           | `.eyebrow`, `.chip`      |

### Blade 壳里的原子类

```blade
{{-- index.blade.php --}}
<body class="bg-white text-gray-800 antialiased">
```

之所以能生效，是因为 `uno.config.js` 的 `content.filesystem` 包含
`resources/views/**/*.blade.php`。UnoCSS 会扫描 Blade 文件里的 class 名并生成对应 CSS ——
壳里这几个类同时也是「扫描链路是否健康」的验收样例。

---

继续阅读：[06 · 开发指南](06-development.md) →
