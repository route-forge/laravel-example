import { defineConfig, presetWind3, transformerDirectives, transformerVariantGroup } from 'unocss';

/**
 * UnoCSS 配置（Laravel + Vue 3 + Element Plus 整合示例）
 *
 * 选型与踩坑说明：
 *
 * 1. presetUno：Tailwind/Windi 兼容语法，生态文档最全，原 Laravel 默认页的 Tailwind 工具类
 *    基本可直接沿用。备选 presetWind4 支持 Tailwind 4 的 CSS-first `@theme` 写法，但较新。
 *
 * 2. 不启用 presetAttributify：属性化写法（如 `<div filter="blur-4">`）会与 Element Plus 组件
 *    透传的原生属性（filter / span / controls / placeholder 等）产生歧义，画册项目不值得为此埋坑。
 *
 * 3. preflight（presetUno 内置的 reset）保留。它对 `button` 等原生元素用的是元素选择器（0,0,1），
 *    Element Plus 的 `.el-button`（0,1,0）优先级更高，不会被重置掉。
 *
 * 4. content.pipeline.include 是「整体覆盖」而非追加（@unocss/vite 源码：
 *    `pipeline?.include || defaultPipelineInclude`），所以这里必须写全；
 *    另外默认值只含 `[jt]sx`（jsx/tsx），不含纯 `.js` / `.ts`，为避免 .js 里的动态类名漏扫，
 *    下面显式补齐了 `js|ts`。
 *
 * 5. content.filesystem 用于扫描「不在 Vite 模块图中」的文件 —— Blade 模板正是这种情况。
 *    这些文件不参与 HMR 依赖图，改完 Blade 里的工具类通常要重启 dev server 才会出现在产物里；
 *    命中的文件仍要过一遍 pipeline 过滤器（默认已含 `php`），两处必须同时放行。
 */
export default defineConfig({
  presets: [presetWind3()],

  content: {
    pipeline: {
      include: [/\.(vue|svelte|[jt]s|jsx|tsx|mdx?|astro|elm|php|phtml|marko|html)($|\?)/],
    },
    filesystem: ['resources/views/**/*.blade.php'],
  },

  theme: {
    fontFamily: {
      // 单一真值源：字体栈定义在 resources/css/app.css 的 --font-sans，
      // 这样 `font-sans` 工具类、Element Plus 全局字体、基线样式三处永远一致。
      sans: 'var(--font-sans)',
      serif: 'var(--font-serif)',
      mono: 'var(--font-mono)',
    },
    colors: {
      brand: {
        50: '#eef6fc',
        100: '#d7e9f7',
        300: '#8dc2e6',
        500: '#1668ac',
        600: '#0f568f',
        700: '#0b456f',
        900: '#072a45',
      },
    },
    // 【坑】breakpoints 必须写全量：@unocss/preset-mini 的 resolveBreakpoints 取的是
    // `generator.userConfig.theme.breakpoints || theme.breakpoints`，用户配置这一项**绕过 deep merge**，
    // 只写 `{ '3xl': ... }` 会把 sm/md/lg/xl/2xl 整体替换掉，表现为所有断点变体静默失配
    // （产物里 `md:grid-cols-3`、`sm:px-8` 直接消失，只在控制台留一行 unmatched utility 警告）。
    breakpoints: {
      sm: '640px',
      md: '768px',
      lg: '1024px',
      xl: '1280px',
      '2xl': '1536px',
      '3xl': '1600px',
    },
  },

  shortcuts: {
    // 画册骨架级复用类：后续排版只调这里，不必逐页改工具类
    shell: 'mx-auto w-full max-w-6xl px-5 sm:px-8',
    lead: 'text-base leading-7 text-gray-600',
    surface: 'rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-200',
  },

  transformers: [transformerDirectives(), transformerVariantGroup()],
});
