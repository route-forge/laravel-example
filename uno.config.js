import { defineConfig, presetWind3, transformerDirectives, transformerVariantGroup } from 'unocss';

/**
 * UnoCSS 配置（Laravel + React 19 + Ant Design 整合示例）
 *
 * 与 vue 分支同源，只在少数几处按 React 栈调整：
 *
 * 1. presetWind3：Tailwind3 兼容语法，生态文档最全，原 Laravel 默认页的 Tailwind 工具类
 *    基本可直接沿用。
 *
 * 2. 不启用 presetAttributify：属性化写法会与 Ant Design 组件透传的原生属性产生歧义。
 *
 * 3. content.pipeline.include 是「整体覆盖」而非追加，所以必须写全；默认值只含 [jt]sx，
 *    不含纯 .js，为避免 .js 里的动态类名漏扫，下面显式补齐 js|ts。React 侧不再有 .vue/.svelte。
 *
 * 4. content.filesystem 用于扫描「不在 Vite 模块图中」的文件 —— Blade 壳正是这种情况，
 *    命中的文件仍要过一遍 pipeline 过滤器（含 php），两处必须同时放行。
 *
 * 【坑】theme.breakpoints 会被 preset-mini 整体替换而非 deep merge：只写子集会把
 * sm/md/lg/xl/2xl 全部丢掉，表现为所有断点变体静默失配且无报错 —— 因此这里写全量 map。
 */
export default defineConfig({
  presets: [presetWind3()],

  content: {
    pipeline: {
      include: [/\.(jsx?|tsx?|mdx?|php|phtml|marko|html)($|\?)/],
    },
    filesystem: ['resources/views/**/*.blade.php'],
  },

  theme: {
    fontFamily: {
      // 单一真值源：字体栈定义在 resources/css/app.css 的 --font-sans，
      // 这样 font-sans 工具类、Ant Design 全局字体、基线样式三处永远一致。
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
    // 骨架级复用类：后续排版只调这里，不必逐页改工具类
    shell: 'mx-auto w-full max-w-6xl px-5 sm:px-8',
    lead: 'text-base leading-7 text-gray-600',
    surface: 'rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-200',
  },

  transformers: [transformerDirectives(), transformerVariantGroup()],
});
