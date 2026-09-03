# 05 · 前端工程化：UnoCSS + Pug + Element Plus

> 本文聚焦本项目前端基座的「怎么搭起来」—— Vite 插件链的执行顺序、为什么选 Pug、Element Plus
> 按需引入的配置细节、Blade 与 Vue 的样式边界。这些是本项目 P0 阶段的核心工程决策。

---

## 目录

- [整体架构图](#整体架构图)
- [Vite 插件链详解](#vite-插件链详解)
- [UnoCSS 原子化 CSS](#unocss-原子化-css)
- [Pug 模板缩进语法](#pug-模板缩进语法)
- [Element Plus 按需引入](#element-plus-按需引入)
- [CSS 注入顺序陷阱](#css-注入顺序陷阱)
- [Blade 与 Vue 的样式边界](#blade-与-vue-的样式边界)

---

## 整体架构图

```
┌─────────────────────────────────────────────────────────────┐
│                       vite.config.js                        │
│                                                             │
│  ┌─────────┐  ┌────────┐  ┌────────┐  ┌────────┐  ┌──────┐ │
│  │ Laravel │→ │ UnoCSS │→ │  Vue   │→ │ AutoIm │→ │Comp. │ │
│  │ plugin  │  │        │  │plugin  │  │ port   │  │      │ │
│  └─────────┘  └────────┘  └────────┘  └────────┘  └──────┘ │
│       │             │          │            │            │   │
│       ▼             ▼          ▼            ▼            ▼   │
│  ┌────────┐  ┌──────────────┐ ┌───────────────┐ ┌─────────┐│
│  │ Blade  │  │ virtual:uno  │ │ 按需注入      │ │ 组件按需 ││
│  │ 热更新  │  │ .css        │ │ ElMessage 样式 │ │ 引入     ││
│  └────────┘  └──────────────┘ └───────────────┘ └─────────┘│
└─────────────────────────────────────────────────────────────┘
```

## Vite 插件链详解

完整配置见 `vite.config.js`，这里逐个解释每个插件的角色和选型理由。

### 1. laravel-vite-plugin

```js
laravel({
  input: ['resources/css/app.css', 'resources/js/app.js'],
  refresh: true,
  fonts: [bunny('Instrument Sans', { weights: [400, 500, 600] })],
})
```

- **作用**：让 Vite 和 Laravel 的 `@vite` 指令协同工作，提供热更新
- **fonts 配置**：通过 Bunny Fonts 服务自托管 Instrument Sans，不需要 Google Fonts CDN

### 2. UnoCSS

```js
UnoCSS()
```

- **作用**：扫描 `content` 目录下的文件，将原子类转成 CSS
- 配置在 `uno.config.ts`（或 `.js`），见下文 UnoCSS 章节

### 3. @vitejs/plugin-vue

```js
Vue()
```

- **作用**：编译 `.vue` SFC，支持 `<template lang="pug">`
- Pug 只是作为 `lang` 参与模板编译，不需要额外 loader

### 4. unplugin-auto-import

```js
AutoImport({
  resolvers: [ElementPlusResolver()],
  dts: fileURLToPath(new URL('./resources/js/types/auto-imports.d.ts', import.meta.url)),
})
```

- **作用**：自动注入「无法在模板里解析」的 API
- 本项目只服务 Element Plus 的函数式 API（`ElMessage`、`ElMessageBox`、`ElLoading`）
- **刻意不预设 `imports: ['vue']`**：`ref` / `computed` 等保持显式 import，源码可读性优先
- **坑**：`dts` 必须用绝对路径，传相对路径会被偷偷写到项目根目录

### 5. unplugin-vue-components

```js
Components({
  resolvers: [ElementPlusResolver()],
  dirs: ['resources/js/components'],
  extensions: ['vue'],
  dts: fileURLToPath(new URL('./resources/js/types/components.d.ts', import.meta.url)),
})
```

- **作用**：组件按需引入 —— 模板里写 `<el-button>` 不需要 import，写 `<FeatureCard>` 也不需要注册
- `dirs` 扫描自定义组件目录，自动注册全局可用
- `ElementPlusResolver()` 解析 `<el-xxx>` 组件和 `v-loading` 等指令

## UnoCSS 原子化 CSS

### 核心思路

在 HTML / Blade / Vue 模板里直接写 class 名字，UnoCSS 扫描后生成对应 CSS：

```html
<!-- 写 class 名 -->
<div class="mt-8 flex flex-wrap items-center gap-3">

<!-- UnoCSS 自动生成 CSS -->
.mt-8 { margin-top: 2rem; }
.flex { display: flex; }
.flex-wrap { flex-wrap: wrap; }
.items-center { align-items: center; }
.gap-3 { gap: 0.75rem; }
```

### 本项目的 UnoCSS 配置要点

虽然 `uno.config.js` 在仓库中（不在 Vite 插件链里），但它的几个关键配置决定了整个样式架构：

```js
// uno.config.js（示意）
export default defineConfig({
  presets: [presetUno()],
  content: {
    filesystem: [
      'resources/views/**/*.blade.php',   // ← Blade 模板也扫
      'resources/js/**/*.{vue,js,ts}',
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

```html
<!-- 任何地方都可以 -->
<div class="shell">...</div>      <!-- → mx-auto w-full max-w-6xl ... -->
<p class="lead">...</p>           <!-- → text-base md:text-lg ... -->
```

`App.vue` 里的 `@apply` 也依赖 UnoCSS 的 `transformerDirectives`：

```vue
<style scoped>
.eyebrow {
  @apply text-xs font-semibold uppercase tracking-[0.22em] text-brand-500;
}
</style>
```

## Pug 模板缩进语法

### 为什么选 Pug

Pug 让 Vue `<template>` 更简洁，尤其适合组件密集的企业项目：

```pug
//- Pug（本项目 App.vue 写法）
section(class='shell py-16')
  p(class='eyebrow') Integration Example
  h1(class='text-4xl font-semibold') {{ title }}
  el-button(type='primary') 立即联系

//- 等价 HTML
<section class="shell py-16">
  <p class="eyebrow">Integration Example</p>
  <h1 class="text-4xl font-semibold">{{ title }}</h1>
  <el-button type="primary">立即联系</el-button>
</section>
```

### 本项目的 Pug 约定（踩过坑才定下的规则）

见 `resources/js/App.vue` 顶部注释，这里摘两条最容易踩的：

#### 1. class 一律写成 `class="a b"`，不用 `.a.b` 简写

```pug
// ❌ 错误：`.md:py-20` 的冒号被 pug 当成代码块分隔符
.md:py-20

// ✅ 正确：显式写 class 属性
div(class='md:py-20')
```

同理 `bg-white/85` 带斜杠的类值也有风险 —— 全部显式写 `class="..."`。

#### 2. 循环 / 条件只用 Vue 的 `v-for` / `v-if`，不用 pug 的 each / if

Pug 是 **先编译成 HTML 字符串、再交给 Vue 编译**。pug 自己的控制流在编译期求值，拿不到 `setup()`
里的响应式状态：

```pug
// ❌ 错误：pug 的 each 在编译期执行，items 不存在
each item in items
  div= item.title

// ✅ 正确：Vue 的 v-for 在运行时执行
div(v-for='item in items', :key='item.id') {{ item.title }}
```

同理文本插值只用 `{{ }}`，不用 pug 的 `=` 或 `#{}`。

## Element Plus 按需引入

### 为什么不用全量引入

全量引入：

```js
import ElementPlus from 'element-plus';
import 'element-plus/dist/index.css';
app.use(ElementPlus);
```

问题：Element Plus 整套 CSS 约 200KB+，JS 也远大于按需方案。按需引入让最终产物只包含你用到的组件。

### 按需引入的三层配置

#### 1. Components 插件处理组件和指令

```js
Components({
  resolvers: [ElementPlusResolver()],
})
```

模板里写 `<el-button>`、`<el-icon>`、`v-loading`，插件自动：

- import 组件
- import 对应组件的 `style/css`（如 `element-plus/es/components/button/style/css`）

#### 2. AutoImport 插件处理函数式 API

```js
AutoImport({
  resolvers: [ElementPlusResolver()],
})
```

`ElMessage.success()` 不写 import 也能直接用，插件自动注入。

#### 3. 图标显式引入

图标不走自动导入，显式 import：

```vue
<script setup>
import { Search } from '@element-plus/icons-vue';
</script>

<template>
  <el-icon><Search /></el-icon>
</template>
```

因为图标是组件，ElementPlusResolver 会处理常见图标，但一些冷门图标还是显式引入更稳。

## CSS 注入顺序陷阱

这是本项目 `resources/js/app.js` 顶部注释花了大篇幅解释的问题，总结在此：

### CSS 优先级规则

> **特异性相同时，后加载的覆盖先加载的。**

Element Plus 的组件样式和 UnoCSS 的工具类特异性很接近，必须让 UnoCSS 工具类排在后面才能覆盖。

### 本项目的顺序安排

```blade
{{-- layout.blade.php --}}
@vite(['resources/css/app.css', 'resources/js/app.js'])
```

```js
// app.js
import 'virtual:uno.css';  // UnoCSS preflight + 工具类（最后求值）
```

执行顺序：

```
1. Element Plus 组件库样式（随 JS 依赖图先注入）
2. virtual:uno.css（UnoCSS，最后注入）
→ UnoCSS 的 .bg-brand-500 能覆盖 Element Plus 默认背景色 ✅
```

如果把 UnoCSS 放在 Element Plus 之前，`bg-brand-500` 就会被 Element Plus 的默认背景覆盖 —— 表现为「class
写了但颜色没变」，非常隐蔽。

## Blade 与 Vue 的样式边界

本项目是 Blade 做壳、Vue 做内容的混合架构，样式分三层：

| 层             | 载体                                 | 作用                                 | 示例                     |
|----------------|--------------------------------------|--------------------------------------|--------------------------|
| **Blade 层**   | `resources/css/app.css` + Blade 内联 | 全站基线样式、UnoCSS preflight       | `body { ... }`, `@fonts` |
| **Vue 全局层** | `virtual:uno.css` + 组件库样式       | UnoCSS 工具类、Element Plus 默认样式 | `.mt-8`, `.el-button`    |
| **Vue 组件层** | `<style scoped>`                     | 组件私有样式                         | `.eyebrow`, `.chip`      |

### Blade 模板里也能用 UnoCSS

```blade
{{-- layout.blade.php --}}
<body class="bg-white text-gray-800 antialiased">
```

之所以能生效，是因为 `uno.config.js` 的 `content.filesystem` 包含了 `resources/views/**/*.blade.php`
。UnoCSS 会扫描 Blade 文件里的 class 名并生成对应 CSS。

### 组件 `<style scoped>` 里的 @apply

```vue
<style scoped>
.eyebrow {
  @apply text-xs font-semibold uppercase tracking-[0.22em] text-brand-500;
}
</style>
```

UnoCSS 的 `transformerDirectives` 会把 `@apply` 展开成原子类的具体 CSS。 **注意**：局部类名不要和
UnoCSS 原子类或 shortcut 同名（比如不要写 `.overline`，因为它本身就是 UnoCSS 的 text-decoration 工具类）。

---

继续阅读：[06 · 开发指南](06-development.md) →
