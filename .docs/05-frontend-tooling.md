# 05 · 前端工程化：UnoCSS + Ant Design + React

> 本文聚焦本项目前端基座的「怎么搭起来」—— Vite 插件链的执行顺序、Ant Design
> 按需引入的配置细节、React 与 Blade 的样式边界。这些是本项目 P0 阶段的核心工程决策。

---

## 目录

- [整体架构图](#整体架构图)
- [Vite 插件链详解](#vite-插件链详解)
- [UnoCSS 原子化 CSS](#unocss-原子化-css)
- [Ant Design 按需引入](#ant-design-按需引入)
- [CSS 注入顺序陷阱](#css-注入顺序陷阱)
- [Blade 与 React 的样式边界](#blade-与-react-的样式边界)

---

## 整体架构图

```
┌─────────────────────────────────────────────────────────────┐
│                      vite.config.ts                         │
│                                                             │
│  ┌─────────┐  ┌────────┐  ┌────────┐  ┌────────┐  ┌──────┐ │
│  │ Laravel │→ │ UnoCSS │→ │ React  │→ │  Ant   │→ │AutoIm│ │
│  │ plugin  │  │        │  │plugin  │  │ Design │  │ port │ │
│  └─────────┘  └────────┘  └────────┘  └────────┘  └──────┘ │
│       │             │          │            │            │   │
│       ▼             ▼          ▼            ▼            ▼   │
│  ┌────────┐  ┌──────────────┐ ┌──────────────┐ ┌─────────┐│
│  │ Blade  │  │ virtual:uno  │ │ @ant-design  │ │ 按需注入││
│  │ 热更新  │  │ .css        │ │ /es/xxx      │ │ message ││
│  └────────┘  └──────────────┘ └──────────────┘ └─────────┘│
└─────────────────────────────────────────────────────────────┘
```

## Vite 插件链详解

### 1. laravel-vite-plugin

```ts
laravel({
  input: ['resources/css/app.css', 'resources/js/main.tsx'],
  refresh: true,
  fonts: [bunny('Instrument Sans', { weights: [400, 500, 600] })],
})
```

- **作用**：让 Vite 和 Laravel 的 `@vite` 指令协同工作，提供热更新
- **fonts 配置**：通过 Bunny Fonts 服务自托管 Instrument Sans，不需要 Google Fonts CDN

### 2. UnoCSS

```ts
UnoCSS()
```

- **作用**：扫描 `content` 目录下的文件，将原子类转成 CSS
- 配置在 `uno.config.ts`（或 `.js`），见下文 UnoCSS 章节

### 3. @vitejs/plugin-react

```ts
react()
```

- **作用**：编译 `.tsx` 文件，支持 Fast Refresh（HMR）和 JSX 转换
- React 19 推荐用这个插件，比老的 `@vitejs/plugin-react-swc` 更稳定

### 4. @ant-design/vite-plugin

```ts
import Antd from '@ant-design/vite-plugin';

Antd({
  style: true, // 自动按需注入组件样式
})
```

- **作用**：Ant Design 官方 Vite 插件，实现组件 + 样式按需引入
- 不需要额外配 `unplugin-auto-import` 或 `unplugin-vue-components` 里的 resolver

### 5. unplugin-auto-import（可选）

```ts
AutoImport({
  imports: ['react', 'react-router-dom'],
  dts: fileURLToPath(new URL('./resources/js/types/auto-imports.d.ts', import.meta.url)),
})
```

- **作用**：自动注入 React Hooks（`useState`, `useEffect` 等）和 React Router API
- 如果团队倾向显式 import，可以删掉这个插件，纯手动管理 import

## UnoCSS 原子化 CSS

### 核心思路

在 Blade / JSX 里直接写 class 名字，UnoCSS 扫描后生成对应 CSS：

```jsx
// 写 class 名
<div className="mt-8 flex flex-wrap items-center gap-3">

// UnoCSS 自动生成 CSS
.mt-8 { margin-top: 2rem; }
.flex { display: flex; }
.flex-wrap { flex-wrap: wrap; }
.items-center { align-items: center; }
.gap-3 { gap: 0.75rem; }
```

### 本项目的 UnoCSS 配置要点

```ts
// uno.config.ts（示意）
export default defineConfig({
  presets: [presetUno()],
  content: {
    filesystem: [
      'resources/views/**/*.blade.php',   // ← Blade 模板也扫
      'resources/js/**/*.{ts,tsx,js,jsx}',
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
  transformers: [transformerDirectives()], // 支持 @apply
});
```

### shortcuts 的价值

shortcuts 是「组件级」的原子类组合 —— 一次写好，多处复用：

```jsx
// 任何地方都可以
<div className="shell">...</div>      {/* → mx-auto w-full max-w-6xl ... */}
<p className="lead">...</p>           {/* → text-base md:text-lg ... */}
```

组件里的 `@apply` 也依赖 UnoCSS 的 `transformerDirectives`：

```css
/* App.css 或 .module.css */
.eyebrow {
  @apply text-xs font-semibold uppercase tracking-[0.22em] text-brand-500;
}
```

## Ant Design 按需引入

### 为什么不用全量引入

```tsx
// ❌ 全量引入（不要这样做）
import { ConfigProvider, Button, Card } from 'antd';
import 'antd/dist/reset.css'; // 约 150KB+
```

全量引入会把 Ant Design 整套 reset.css + 所有组件样式都打进去，即使你只用 `<Button>`。按需引入让最终产物只包含你用到的组件。

### 按需引入的三层配置

#### 1. 组件样式按需注入

`@ant-design/vite-plugin` 会自动处理：

```ts
// vite.config.ts
import Antd from '@ant-design/vite-plugin';

Antd({ style: true })
```

然后在组件里正常 import 组件，插件会自动注入对应样式：

```tsx
// ✅ 正常写 import，不需要管样式
import { Button, Card, message } from 'antd';

function ProductCard({ product }) {
  return (
    <Card title={product.name}>
      <Button type="primary" onClick={() => message.success('已加入询购')}>
        立即询购
      </Button>
    </Card>
  );
}
```

#### 2. 图标按需引入

```tsx
import { SearchOutlined, ShoppingCartOutlined } from '@ant-design/icons';

function Header() {
  return (
    <span>
      <SearchOutlined />
      <ShoppingCartOutlined />
    </span>
  );
}
```

`@ant-design/icons` 每个图标是独立的 React 组件，tree-shake 天然生效。

#### 3. ConfigProvider 设置中文

```tsx
import { ConfigProvider } from 'antd';
import zhCN from 'antd/locale/zh_CN';

// main.tsx 根组件
<ConfigProvider locale={zhCN}>
  <RouteForgeProvider>
    <App />
  </RouteForgeProvider>
</ConfigProvider>
```

## CSS 注入顺序陷阱

### CSS 优先级规则

> **特异性相同时，后加载的覆盖先加载的。**

Ant Design 的组件样式和 UnoCSS 的工具类特异性很接近，必须让 UnoCSS 工具类排在后面才能覆盖。

### 本项目的顺序安排

```blade
{{-- layout.blade.php --}}
@vite(['resources/css/app.css', 'resources/js/main.tsx'])
```

```ts
// main.tsx —— UnoCSS 放在最后 import
import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import 'virtual:uno.css';  // ← UnoCSS 最后加载
```

执行顺序：

```
1. Ant Design 组件库样式（随 JS 依赖图先注入）
2. virtual:uno.css（UnoCSS，最后注入）
→ UnoCSS 的 .bg-brand-500 能覆盖 Ant Design 默认背景色 ✅
```

如果把 UnoCSS 放在 Ant Design 之前，`bg-brand-500` 就会被 Ant Design 的默认背景覆盖 —— 表现为「class 写了但颜色没变」，非常隐蔽。

## Blade 与 React 的样式边界

本项目是 Blade 做壳、React 做内容的混合架构，样式分三层：

| 层 | 载体 | 作用 | 示例 |
|----|------|------|------|
| **Blade 层** | `resources/css/app.css` + Blade 内联 | 全站基线样式、UnoCSS preflight | `body { ... }`, `@fonts` |
| **React 全局层** | `virtual:uno.css` + Ant Design 样式 | UnoCSS 工具类、Ant Design 默认样式 | `.mt-8`, `.ant-btn` |
| **React 组件层** | CSS Modules 或 styled-components | 组件私有样式 | `.eyebrow`, `.chip` |

### Blade 模板里也能用 UnoCSS

```blade
{{-- layout.blade.php --}}
<body class="bg-white text-gray-800 antialiased">
```

之所以能生效，是因为 `uno.config.ts` 的 `content.filesystem` 包含了 `resources/views/**/*.blade.php`。UnoCSS 会扫描 Blade 文件里的 class 名并生成对应 CSS。

### React 组件的局部样式

推荐用 **CSS Modules**：

```tsx
// components/Header.tsx
import styles from './Header.module.css';

function Header() {
  return <header className={styles.navbar}>...</header>;
}
```

```css
/* Header.module.css */
.navbar {
  @apply flex items-center justify-between py-4;
}
```

CSS Modules 自动 hash 类名，避免与全局样式冲突。

---

继续阅读：[06 · 开发指南](06-development.md) →
