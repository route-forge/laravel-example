<script setup>
/**
 * 前台页头：品牌位 + 主导航 + 移动端折叠菜单。
 *
 * 数据只有站点资料（api.site.show），且走 useSiteSettings 单例——页脚同源，首屏只发一次。
 * 导航一律用 vue-router 的命名路由（页面地址不在 Laravel 路由表里，不能用 forge 的 route()）。
 *
 * 刻意不用 Element Plus 组件：页头是纯链接区，router-link + 工具类比 el-menu 轻得多，
 * 也让前台 bundle 不被后台组件库拖大。
 */
import { computed, ref } from 'vue';
import { useRoute } from 'vue-router';
import { Close, Menu } from '@element-plus/icons-vue';
import { useSiteSettings } from '@/composables/useSiteSettings.js';

const route = useRoute();
const { siteName, logoUrl } = useSiteSettings();

const NAV_ITEMS = [
  { to: { name: 'home' }, label: '首页', match: ['home'] },
  // 详情页要把「企业画册」这项保持高亮，否则点进画册导航就断了
  { to: { name: 'catalogs' }, label: '企业画册', match: ['catalogs', 'catalog.detail'] },
  { to: { name: 'contact' }, label: '联系我们', match: ['contact'] },
];

const menuOpen = ref(false);

// 站名首字作 Logo 兜底（Seeder 与后台表单都可能不填 logo_url）
const brandInitial = computed(() => siteName.value.slice(0, 1));

function isActive(item) {
  return item.match.includes(route.name);
}

const navClass = (item) => [
  'rounded-lg px-3 py-2 text-sm transition-colors',
  isActive(item) ? 'bg-brand-50 font-medium text-brand-600' : 'text-gray-600 hover:text-gray-900',
];
</script>

<template lang="pug">
header(class='sticky top-0 z-50 border-b border-gray-200/80 bg-white/85 backdrop-blur')
  div(class='shell flex h-16 items-center gap-3')
    //- 品牌位
    router-link(
      class='flex shrink-0 items-center gap-2',
      :to='{ name: "home" }',
      @click='menuOpen = false'
    )
      img(v-if='logoUrl', :src='logoUrl', :alt='siteName', class='h-8 w-auto max-w-[10rem] object-contain')
      span(
        v-else,
        class='flex h-8 w-8 items-center justify-center rounded-lg bg-brand-500 text-sm font-semibold text-white'
      ) {{ brandInitial }}
      span(class='text-base font-semibold text-gray-900 sm:text-lg') {{ siteName }}

    //- 桌面导航
    nav(class='ml-auto hidden items-center gap-1 md:flex')
      router-link(
        v-for='item in NAV_ITEMS',
        :key='item.label',
        :class='navClass(item)',
        :to='item.to'
      ) {{ item.label }}
      router-link(
        class='ml-2 rounded-full bg-brand-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-600',
        :to='{ name: "contact" }'
      ) 获取方案

    //- 移动端开关
    button(
      class='ml-auto inline-flex h-9 w-9 items-center justify-center rounded-lg text-gray-600 ring-1 ring-gray-200 md:hidden',
      type='button',
      :aria-expanded='menuOpen ? "true" : "false"',
      aria-label='展开导航菜单',
      @click='menuOpen = !menuOpen'
    )
      el-icon(:size='20')
        Close(v-if='menuOpen')
        Menu(v-else)

  //- 移动端导航面板
  div(v-if='menuOpen', class='border-t border-gray-100 bg-white md:hidden')
    nav(class='shell flex flex-col gap-1 py-3')
      router-link(
        v-for='item in NAV_ITEMS',
        :key='item.label',
        :class='navClass(item)',
        :to='item.to',
        @click='menuOpen = false'
      ) {{ item.label }}
</template>
