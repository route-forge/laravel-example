<script setup>
/**
 * 前台布局：页头 + 内容区 + 页脚。
 *
 * 内容区不做统一容器：画册详情页要满幅翻页，统一套 `shell` 反而会逼它写负外边距，
 * 所以每页自己决定用不用 `shell`（uno.config.js 的 shortcut：居中 + 上限宽度 + 响应式内边距）。
 *
 * 浏览器标签标题在这里统一维护（route.meta.title + 站名）：后台布局自带页面标题条，
 * 前台则只有这一个地方写 document.title，避免每页各写一份。
 */
import { watchEffect } from 'vue';
import { useRoute } from 'vue-router';
import { useSiteSettings } from '@/composables/useSiteSettings.js';

const route = useRoute();
const { siteName } = useSiteSettings();

watchEffect(() => {
  const title = route.meta?.title;
  document.title = title ? `${title} · ${siteName.value}` : siteName.value;
});
</script>

<template lang="pug">
div(class='flex min-h-screen flex-col')
  site-header
  main(class='flex-1')
    router-view
  site-footer
</template>
