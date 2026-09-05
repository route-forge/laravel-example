<script setup>
/**
 * 前台 · 画册列表：分类筛选 + 卡片网格 + 分页。
 *
 * 接口契约（public 层级，一次首屏两个请求）：
 *   api.categories.index   GET  → data[]: { id, name, slug, published_count }
 *   api.catalogs.index     GET  ?page=&per_page=&category=（分类 slug）
 *                          → 分页信封 { data: [卡片字段], meta: { total, current_page, last_page, ... } }
 *
 * 筛选状态以 URL query 为唯一真值源（?category=&page=）：
 * 刷新、分享、浏览器前进后退都能还原同一画面，组件内不再另存一份镜像状态。
 *
 * published_count 为 0 的分类不進筛选条 —— 点进去必然是空列表，那是误导。
 */
import { computed, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useForgeApi } from '@route-forge/vue';
import CatalogCard from '@/components/CatalogCard.vue';
import { bodyOf, messageOf, pageOf } from '@/support/api.js';

const PER_PAGE = 12;

const route = useRoute();
const router = useRouter();
const { call } = useForgeApi('public');

const categories = ref([]);
const items = ref([]);
const meta = ref({});
// loading / ready / failed —— 空列表属于 ready，不是一种「状态」
const state = ref('loading');
const errorMessage = ref('');

const activeCategory = computed(() => String(route.query.category ?? ''));
const currentPage = computed(() => {
  const page = Number.parseInt(String(route.query.page ?? '1'), 10);
  return Number.isFinite(page) && page > 0 ? page : 1;
});

async function loadCategories() {
  const res = await call('api.categories.index').catch((error) => ({ error }));

  // 筛选条拿不到就只留「全部」，不打断主内容：列表本身才是这一页的主角
  if (res.error) return;

  categories.value = (bodyOf(res)?.data ?? []).filter(
    (category) => Number(category.published_count) > 0,
  );
}

async function load() {
  state.value = 'loading';
  errorMessage.value = '';

  const res = await call('api.catalogs.index', {
    query: {
      page: currentPage.value,
      per_page: PER_PAGE,
      category: activeCategory.value || undefined,
    },
  }).catch((error) => ({ error }));

  if (res.error) {
    state.value = 'failed';
    errorMessage.value = messageOf(res.error);
    return;
  }

  const page = pageOf(res);
  items.value = page.items;
  meta.value = page.meta;
  state.value = 'ready';
}

function selectCategory(slug) {
  const nextQuery = {};
  if (slug) nextQuery.category = slug;

  // 换分类必回第 1 页，所以 page 一律不带（不保留旧页码）
  router.push({ name: 'catalogs', query: nextQuery });
}

function goPage(page) {
  const nextQuery = { ...route.query, page: page > 1 ? String(page) : undefined };
  if (!nextQuery.page) delete nextQuery.page;

  router.push({ name: 'catalogs', query: nextQuery });
}

// query 即状态：合并成一个键，换分类时页码归 1 也只触发一次取数
const query = computed(() => ({ category: activeCategory.value, page: currentPage.value }));

watch(query, load, { immediate: true });

onMounted(loadCategories);
</script>

<template lang="pug">
div(class='shell py-10 sm:py-14')
  //- 页头
  header
    h1(class='text-2xl font-semibold text-gray-900 sm:text-3xl') 企业画册
    p(class='lead mt-2')
      | 按分类浏览我们公开的全部画册，点开任意一本即可在线翻阅。

  //- 分类筛选条
  div(class='mt-6 flex flex-wrap items-center gap-2')
    button(
      class='rounded-full px-4 py-1.5 text-sm transition-colors',
      :class='activeCategory === "" ? "bg-brand-500 text-white" : "bg-white text-gray-600 ring-1 ring-gray-200 hover:ring-brand-300"',
      type='button',
      @click='selectCategory("")'
    ) 全部
    button(
      v-for='category in categories',
      :key='category.slug',
      class='rounded-full px-4 py-1.5 text-sm transition-colors',
      :class='activeCategory === category.slug ? "bg-brand-500 text-white" : "bg-white text-gray-600 ring-1 ring-gray-200 hover:ring-brand-300"',
      type='button',
      @click='selectCategory(category.slug)'
    )
      | {{ category.name }}
      span(class='ml-1 text-xs opacity-70') {{ category.published_count }}

  //- 结果说明
  p(v-if='state === "ready"', class='mt-6 text-sm text-gray-500')
    | 共 {{ meta.total ?? 0 }} 本画册

  //- 网格
  div(v-if='state === "loading"', class='mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3')
    div(
      v-for='n in 6',
      :key='n',
      class='animate-pulse overflow-hidden rounded-2xl bg-white ring-1 ring-gray-200'
    )
      div(class='aspect-[4/3] bg-gray-100')
      div(class='space-y-3 p-5')
        div(class='h-3 w-1/3 rounded bg-gray-100')
        div(class='h-4 w-2/3 rounded bg-gray-100')
        div(class='h-3 w-full rounded bg-gray-100')

  div(v-else-if='state === "failed"', class='surface mt-6')
    p(class='text-sm text-gray-700') 画册列表加载失败：{{ errorMessage }}
    div(class='mt-4')
      button(
        class='rounded-full bg-brand-500 px-5 py-2 text-sm font-medium text-white hover:bg-brand-600',
        type='button',
        @click='load'
      ) 重新加载

  div(v-else-if='!items.length', class='surface mt-6 py-16 text-center')
    p(class='text-base font-medium text-gray-800') 这个分类下暂时没有画册
    p(class='lead mt-2') 换个分类看看，或直接联系我们索取最新画册。
    div(class='mt-6 flex justify-center gap-3')
      button(
        v-if='activeCategory',
        class='rounded-full bg-brand-500 px-5 py-2 text-sm font-medium text-white hover:bg-brand-600',
        type='button',
        @click='selectCategory("")'
      ) 查看全部画册
      router-link(
        class='rounded-full bg-white px-5 py-2 text-sm font-medium text-gray-700 ring-1 ring-gray-200 hover:ring-brand-300',
        :to='{ name: "contact" }'
      ) 联系我们

  template(v-else)
    div(class='mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3')
      CatalogCard(v-for='catalog in items', :key='catalog.id', :catalog='catalog')

    el-pagination(
      v-if='meta.last_page > 1',
      class='mt-10 justify-center',
      layout='prev, pager, next',
      :total='Number(meta.total) || 0',
      :page-size='Number(meta.per_page) || PER_PAGE',
      :current-page='currentPage',
      @current-change='goPage'
    )
</template>
