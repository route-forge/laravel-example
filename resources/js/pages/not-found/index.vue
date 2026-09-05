<script setup>
/**
 * 前台 · 404。
 *
 * 服务端 routes/web.php 的 catch-all 会把任意非 /api、/_forge 请求都送进 SPA 壳页，
 * 所以「地址不存在」这件事只有 vue-router 能判定。没有这一页时，未匹配路径会渲染成
 * 「页头页脚 + 中间空白」，访客与搜索引擎都会以为站点坏了 —— 必须给明确去向。
 */
import { useRouter } from 'vue-router';

const router = useRouter();
</script>

<template lang="pug">
div(class='shell py-20 text-center sm:py-28')
  p(class='font-serif text-6xl text-brand-300') 404
  h1(class='mt-4 text-xl font-semibold text-gray-900') 这个地址上没有内容
  p(class='lead mt-2') 链接可能写错或已经失效。从画册列表找，或者直接告诉我们你想要哪本画册。
  div(class='mt-8 flex flex-wrap justify-center gap-3')
    button(
      class='rounded-full bg-brand-500 px-5 py-2 text-sm font-medium text-white hover:bg-brand-600',
      type='button',
      @click='router.push({ name: "catalogs" })'
    ) 浏览画册
    button(
      class='rounded-full bg-white px-5 py-2 text-sm font-medium text-gray-700 ring-1 ring-gray-200 hover:ring-brand-300',
      type='button',
      @click='router.push({ name: "home" })'
    ) 回首页
</template>
