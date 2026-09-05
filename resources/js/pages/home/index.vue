<script setup>
/**
 * 前台 · 首页：品牌区 + 分类导览 + 最新画册入口。
 *
 * 三个数据源，各自独立降级（首屏任何一路失败都不该把整页变成错误页）：
 *   api.site.show       → 站点资料，走 useSiteSettings 单例（页头页脚同源，不重复请求）
 *   api.catalogs.index  → ?per_page=3 的「最新画册」区，同时给出公开画册总数
 *   api.categories.index→ 分类导览；拿不到就整块隐藏，而不是显示一个空筛选条
 *
 * 取数口径都由后端定：catalogs.index 已按 published 过滤并按 published_at 倒序，
 * 所以这里不排不筛，per_page 是唯一参数——前台不该复刻后端的业务规则。
 */
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useForgeApi } from '@route-forge/vue';
import CatalogCard from '@/components/CatalogCard.vue';
import { useSiteSettings } from '@/composables/useSiteSettings.js';
import { bodyOf, messageOf, pageOf } from '@/support/api.js';
import { toParagraphs } from '@/support/display.js';

const FEATURED_COUNT = 3;

const router = useRouter();
const { call } = useForgeApi('public');
const { siteName, slogan, intro, contacts } = useSiteSettings();

const featured = ref([]);
const total = ref(0);
const categories = ref([]);
const state = ref('loading');
const errorMessage = ref('');

// 首页品牌区只铺前两三段，剩下留给画册列表页与详情页讲
const introParagraphs = computed(() => toParagraphs(intro.value).slice(0, 2));
const heroTitle = computed(() => slogan.value || `${siteName.value} · 在线企业画册`);

async function loadFeatured() {
  state.value = 'loading';
  errorMessage.value = '';

  const res = await call('api.catalogs.index', {
    query: { page: 1, per_page: FEATURED_COUNT },
  }).catch((error) => ({ error }));

  if (res.error) {
    state.value = 'failed';
    errorMessage.value = messageOf(res.error);
    return;
  }

  const page = pageOf(res);
  featured.value = page.items;
  total.value = Number(page.meta.total) || page.items.length;
  state.value = 'ready';
}

async function loadCategories() {
  const res = await call('api.categories.index').catch((error) => ({ error }));
  if (res.error) return;

  categories.value = (bodyOf(res)?.data ?? []).filter(
    (category) => Number(category.published_count) > 0,
  );
}

function openCategory(slug) {
  router.push({ name: 'catalogs', query: { category: slug } });
}

onMounted(() => {
  loadFeatured();
  loadCategories();
});
</script>

<template lang="pug">
div
  //- ── 品牌区 ────────────────────────────────────────────
  section(class='hero relative overflow-hidden bg-brand-900 text-white')
    div(class='hero__glow', aria-hidden='true')
    div(class='shell relative py-16 sm:py-24')
      p(class='text-xs tracking-[0.22em] text-brand-300 uppercase') {{ siteName }}
      h1(class='mt-4 max-w-3xl text-3xl font-semibold leading-tight sm:text-4xl lg:text-5xl')
        | {{ heroTitle }}
      div(class='mt-5 max-w-2xl space-y-3 text-base leading-7 text-white/75')
        p(v-for='(para, i) in introParagraphs', :key='i', v-text='para')
        p(v-if='!introParagraphs.length') 我们把公司的产品、服务与案例做成可在线翻阅的画册，内容全部由后台维护。

      div(class='mt-9 flex flex-wrap items-center gap-3')
        button(
          class='rounded-full bg-white px-6 py-2.5 text-sm font-medium text-brand-700 transition-colors hover:bg-brand-50',
          type='button',
          @click='router.push({ name: "catalogs" })'
        ) 浏览全部画册
        button(
          class='rounded-full px-6 py-2.5 text-sm font-medium ring-1 ring-white/40 transition-colors hover:ring-white/80',
          type='button',
          @click='router.push({ name: "contact" })'
        ) 联系我们
      p(v-if='state === "ready" && total', class='mt-8 text-sm text-white/60')
        | 当前公开 {{ total }} 本画册

  //- ── 分类导览 ──────────────────────────────────────────
  section(v-if='categories.length', class='shell pt-12')
    div(class='flex flex-wrap items-baseline justify-between gap-2')
      h2(class='text-lg font-semibold text-gray-900') 按分类浏览
      router-link(class='text-sm text-brand-600 hover:text-brand-700', :to='{ name: "catalogs" }') 查看全部 →
    div(class='mt-4 flex flex-wrap gap-2')
      button(
        v-for='category in categories',
        :key='category.slug',
        class='rounded-full bg-white px-4 py-2 text-sm text-gray-700 ring-1 ring-gray-200 transition-colors hover:ring-brand-300',
        type='button',
        @click='openCategory(category.slug)'
      )
        | {{ category.name }}
        span(class='ml-1 text-xs text-gray-400') {{ category.published_count }}

  //- ── 最新画册 ──────────────────────────────────────────
  section(class='shell py-12')
    div(class='flex flex-wrap items-baseline justify-between gap-2')
      h2(class='text-lg font-semibold text-gray-900') 最新画册
      router-link(class='text-sm text-brand-600 hover:text-brand-700', :to='{ name: "catalogs" }') 更多画册 →

    div(v-if='state === "loading"', class='mt-5 grid gap-6 sm:grid-cols-2 lg:grid-cols-3')
      div(
        v-for='n in FEATURED_COUNT',
        :key='n',
        class='animate-pulse overflow-hidden rounded-2xl bg-white ring-1 ring-gray-200'
      )
        div(class='aspect-[4/3] bg-gray-100')
        div(class='space-y-3 p-5')
          div(class='h-3 w-1/3 rounded bg-gray-100')
          div(class='h-4 w-2/3 rounded bg-gray-100')
          div(class='h-3 w-full rounded bg-gray-100')

    div(v-else-if='state === "failed"', class='surface mt-5')
      p(class='text-sm text-gray-700') 画册加载失败：{{ errorMessage }}
      div(class='mt-4')
        button(
          class='rounded-full bg-brand-500 px-5 py-2 text-sm font-medium text-white hover:bg-brand-600',
          type='button',
          @click='loadFeatured'
        ) 重新加载

    p(v-else-if='!featured.length', class='surface mt-5 py-12 text-center text-sm text-gray-500')
      | 后台还没有发布任何画册，稍后再来看。

    div(v-else, class='mt-5 grid gap-6 sm:grid-cols-2 lg:grid-cols-3')
      CatalogCard(v-for='catalog in featured', :key='catalog.id', :catalog='catalog')

  //- ── 联系引导 ──────────────────────────────────────────
  section(class='border-y border-gray-200 bg-gray-50')
    div(class='shell flex flex-wrap items-center justify-between gap-6 py-10')
      div
        h2(class='text-lg font-semibold text-gray-900') 想要纸质版，或有别的问题？
        p(class='lead mt-1 text-sm')
          | {{ contacts.phone || contacts.email ? '直接联系我们，或留一条在线留言。' : '留一条在线留言，我们会主动联系你。' }}
      div(class='flex flex-wrap items-center gap-3')
        a(
          v-if='contacts.phone',
          class='text-sm text-gray-700 hover:text-brand-600',
          :href='"tel:" + contacts.phone',
          v-text='contacts.phone'
        )
        router-link(
          class='rounded-full bg-brand-500 px-5 py-2 text-sm font-medium text-white hover:bg-brand-600',
          :to='{ name: "contact" }'
        ) 在线留言
</template>

<style scoped>
/*
 * 品牌区的装饰光斑：写在组件 CSS 而不是拼 UnoCSS 任意值，
 * 一是长渐变串塞进 class 里不可读，二是避免动态拼接的类名被静态扫描漏掉。
 */
.hero__glow {
  position: absolute;
  inset: -40% -10% auto;
  height: 140%;
  background:
    radial-gradient(45% 55% at 18% 12%, rgba(141, 194, 230, 0.28), transparent 70%),
    radial-gradient(38% 48% at 82% 0%, rgba(22, 104, 172, 0.55), transparent 72%);
  pointer-events: none;
}
</style>
