<template lang="pug">
//- 根节点用 el-config-provider 承载 locale 等全局配置：
//- 这是「按需引入」写法下唯一正确的入口，不能用 app.use(ElementPlus)（那是全量引入）
//-
//- 【本项目 pug 约定】
//-   1. class 一律写成 class="a b"，不用 .a.b 简写：`.md:py-20` 这类带变体冒号的类会被 pug
//-      解析成代码块分隔符直接编译失败，`bg-white/85` 这类带斜杠的值同理有风险。id 仍可用
//-      tag#id(class="...") 简写。
//-   2. 循环/条件只用 Vue 的 v-for / v-if，文本插值只用 {{ }}：pug 是「先编译成 HTML 字符串、
//-      再交给 Vue 编译」，pug 自己的 each / if / `=` / `#{}` 在编译期求值，拿不到 setup() 里的状态。
el-config-provider(:locale='zhCn')
  div(class='min-h-screen bg-white text-gray-800')
    SiteHeader(brand='route-forge 画册', @contact='notify')

    main
      //- Hero
      section(class='bg-gradient-to-b from-brand-50 to-white')
        div(class='shell py-16 md:py-20')
          p(class='eyebrow') Integration Example · Laravel + Vue 3
          h1(class='mt-3 text-4xl font-semibold leading-tight text-gray-900 md:text-5xl') {{ page.title }}
          p(class='lead mt-5 max-w-2xl') {{ page.intro }}

          div(class='mt-8 flex flex-wrap items-center gap-3')
            el-button(type='primary', @click='notify') 验证 Element Plus
            el-button(@click='toggle') {{ collapsed ? '展开细节' : '收起细节' }}
            span(class='flex items-center gap-1.5 text-sm text-gray-500')
              el-icon
                Search
              span 图标显式引入，可 tree-shake

          div(class='surface mt-8', v-show='!collapsed')
            p(class='text-sm leading-6')
              code(class='chip', v-for='name in plugins', :key='name') {{ name }}
            p(class='lead mt-4')
              | 上面这排标签的样式来自 uno.config.js 的 shortcuts，
              | 而本文件 style 块里的 @apply 由 UnoCSS 的 transformerDirectives 展开 —— 两条链路都在生效。

      //- 三块能力卡片：自定义组件由 Components({ dirs }) 自动注册，无需 import
      section#features(class='shell scroll-mt-24 py-14')
        h2(class='text-2xl font-semibold text-gray-900') 本次集成的三层能力
        div(class='mt-8 grid gap-5 md:grid-cols-3')
          FeatureCard(
            v-for='item in highlights',
            :key='item.title',
            :title='item.title',
            :desc='item.desc',
            :progress='item.progress'
          )

      section#next(class='scroll-mt-24 bg-gray-50 py-14')
        div(class='shell flex flex-wrap items-center justify-between gap-4')
          div
            h3(class='text-lg font-semibold text-gray-900') 下一步
            p(class='lead mt-2 max-w-2xl')
              | 这套基座跑通后再接 route-forge 前后端联动（命名路由与类型下发），
              | 画册的栏目结构与内容模型单独一轮做。
          el-button(type='primary', plain, @click='notify') 再来一次提示

    footer(class='border-t border-gray-200 py-8')
      div(class='shell flex flex-wrap items-center justify-between gap-2 text-sm text-gray-500')
        span {{ page.brand }}
        span UnoCSS {{ unoBadge }} · Element Plus 按需
</template>

<script setup>
import { ref } from 'vue';
import zhCn from 'element-plus/es/locale/lang/zh-cn';
import { Search } from '@element-plus/icons-vue';

const page = {
  brand: 'route-forge · Laravel Example',
  title: '企业画册前端基座已就绪',
  intro:
    'Vue 3 单文件组件用 pug 缩进语法书写，样式走 UnoCSS 原子类，Element Plus 全走按需引入 —— 这一页本身就是几项集成的验收样例。',
};

const plugins = [
  '@vitejs/plugin-vue',
  'pug',
  'unocss presetUno',
  'unplugin-vue-components',
  'unplugin-auto-import',
  'prettier + @prettier/plugin-pug',
];

const collapsed = ref(true);
const unoBadge = 'presetUno';

const highlights = [
  {
    title: '视图层',
    desc: '@vitejs/plugin-vue 编译 SFC，pug 只作为 lang 参与模板编译，无额外 loader。',
    progress: 100,
  },
  {
    title: '样式层',
    desc: 'UnoCSS 提供 preflight、原子类、shortcuts 与 @apply，Blade 模板也在扫描范围内。',
    progress: 100,
  },
  {
    title: '组件库',
    desc: 'Element Plus 组件、指令与函数式 API 均由 unplugin 解析，产物里只含用到的部分。',
    progress: 80,
  },
];

function toggle() {
  collapsed.value = !collapsed.value;
}

// ElMessage 不写 import：由 unplugin-auto-import 的 ElementPlusResolver 解析并注入其样式
function notify() {
  ElMessage.success({
    message: 'Element Plus 按需组件 + 函数式 API 自动导入均已生效',
    duration: 2500,
  });
}
</script>

<style scoped>
/* @apply 由 UnoCSS 的 transformerDirectives 展开。
 * 命名约束：局部类名不要与 UnoCSS 原子类或 shortcut 同名 —— 例如 overline 本身就是
 * text-decoration 工具类，同名会被叠加出上划线。.lead/.shell/.surface
 * 则直接复用 uno.config.js 的 shortcuts，不在此重复定义。
 */
.eyebrow {
  @apply text-xs font-semibold uppercase tracking-[0.22em] text-brand-500;
}

.chip {
  @apply mr-2 inline-block rounded-md bg-brand-50 px-2 py-1 font-mono text-xs text-brand-700 ring-1 ring-brand-100;
}
</style>
