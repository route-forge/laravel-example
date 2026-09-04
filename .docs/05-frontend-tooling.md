# 05 · 前端工程化：UnoCSS + JSX + Ant Design

> 本文聚焦本项目前端基座的「怎么搭起来」—— Vite 插件链的执行顺序、JSX 约定、Ant Design
> 按需引入的配置细节、唯一 Blade 壳下的样式分层。这些是前端基座的核心工程决策。

---

## 目录

- [整体架构图](#整体架构图)
- [Vite 插件链详解](#vite-插件链详解)
- [UnoCSS 原子化 CSS](#unocss-原子化-css)
- [JSX 模板约定](#jsx-模板约定)
- [Ant Design 按需引入](#ant-design-按需引入)
- [CSS 注入顺序陷阱](#css-注入顺序陷阱)
- [唯一 Blade 壳下的样式分层](#唯一-blade-壳下的样式分层)

---

## 整体架构图

```
┌──────────────────────────────────────────────────────────────────┐
│                         vite.config.js                            │
│                                                                   │
│  ┌─────────┐  ┌────────┐  ┌─────────┐  ┌──────────────────────┐  │
│  │ Laravel │→ │ UnoCSS │→ │  React  │→ │ @ant-design/vite-    │  │
│  │ plugin  │  │        │  │ plugin  │  │ plugin（antd 按需）  │  │
│  └─────────┘  └────────┘  └─────────┘  └──────────────────────┘  │
│       │             │           │                │                 │
│       ▼             ▼           ▼                ▼                 │
│  ┌────────┐  ┌──────────────┐ ┌────────────┐ ┌─────────────────┐ │
│  │ Blade  │  │ virtual:uno  │ │ JSX/Fast   │ │ antd 样式按需   │ │
│  │ 热更新  │  │ .css        │ │ Refresh    │ │ 优化            │ │
│  └────────┘  └──────────────┘ └────────────┘ └─────────────────┘ │
└──────────────────────────────────────────────────────────────────┘
```

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

### 4. @ant-design/vite-plugin

```js
AntdPlugin()
```

- **作用**：Ant Design 按需引入优化 —— 组件与样式的 import 自动瘦身，产物只含用到的部分

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

## Ant Design 按需引入

### 为什么不用全量引入

全量引入（`import 'antd/dist/reset.css'` + 全量 import）会把整个组件库打进产物。按需引入让
最终产物只包含你用到的组件。

### 按需引入配置

```js
// vite.config.js
import AntdPlugin from '@ant-design/vite-plugin';

export default defineConfig({
  plugins: [laravel(...), UnoCSS(), react(), AntdPlugin()],
});
```

`@ant-design/vite-plugin` 自动处理组件与样式的按需 import。

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
