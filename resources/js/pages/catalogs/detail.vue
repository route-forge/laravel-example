<script setup>
/**
 * 前台 · 画册详情 = 元信息 + 翻页阅读器。
 *
 * 接口契约：api.catalogs.show（必填参数 slug）→ CatalogResource，
 * 一次带出整本 pages（后端刻意把内页塞进详情响应，翻阅过程因此不再发请求）。
 * 未发布 / 不存在的 slug 由后端 firstOrFail 抛 404。
 *
 * 404 与其他错误必须分开：前者是「这本画册没有」，给返回入口；
 * 后者是「现在取不到」，给重试。把两者混成一句「加载失败」会诱导访客反复刷新。
 * HTTPError 的状态码在 error.context.status（与 forge.js 的 401 全局兜底同一取法）。
 */
import { computed, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useForgeApi } from '@route-forge/vue';
import PageFlip from '@/components/PageFlip.vue';
import { bodyOf, messageOf } from '@/support/api.js';
import { formatDate, resolveAccent } from '@/support/display.js';

const route = useRoute();
const router = useRouter();
const { call } = useForgeApi('public');

const catalog = ref(null);
// loading / ready / missing（404 或无内容）/ failed
const state = ref('loading');
const errorMessage = ref('');

const slug = computed(() => String(route.params.slug ?? ''));
const accent = computed(() => resolveAccent(catalog.value?.theme_color));
const publishedText = computed(() => formatDate(catalog.value?.published_at));
const pages = computed(() => catalog.value?.pages ?? []);

async function load() {
  if (!slug.value) {
    state.value = 'missing';
    return;
  }

  state.value = 'loading';
  errorMessage.value = '';
  catalog.value = null;

  const res = await call('api.catalogs.show', { params: { slug: slug.value } }).catch((error) => ({
    error,
  }));

  if (res.error) {
    if (res.error.context?.status === 404) {
      state.value = 'missing';
      return;
    }

    state.value = 'failed';
    errorMessage.value = messageOf(res.error);
    return;
  }

  catalog.value = bodyOf(res)?.data ?? null;
  state.value = catalog.value ? 'ready' : 'missing';
}

// 深链改 slug（如从别本画册分享链接过来）也要重取，immediate 负责首屏
watch(slug, load, { immediate: true });
</script>

<template lang="pug">
div
  //- 加载中
  div(v-if='state === "loading"', class='shell py-16')
    div(class='mx-auto max-w-md space-y-4 text-center')
      p(class='text-sm text-gray-500') 正在载入画册…
      div(class='animate-pulse rounded-2xl bg-gray-100')
        div(class='aspect-[16/9]')

  //- 不存在 / 已下架
  div(v-else-if='state === "missing"', class='shell py-20 text-center')
    h1(class='text-xl font-semibold text-gray-900') 这本画册不存在或已下架
    p(class='lead mt-2') 链接可能过期，也可能画册刚被撤下。可以到列表页看我们当前公开的画册。
    div(class='mt-8 flex flex-wrap justify-center gap-3')
      button(
        class='rounded-full bg-brand-500 px-5 py-2 text-sm font-medium text-white hover:bg-brand-600',
        type='button',
        @click='router.push({ name: "catalogs" })'
      ) 浏览全部画册
      button(
        class='rounded-full bg-white px-5 py-2 text-sm font-medium text-gray-700 ring-1 ring-gray-200 hover:ring-brand-300',
        type='button',
        @click='router.push({ name: "contact" })'
      ) 联系我们索取

  //- 取数失败
  div(v-else-if='state === "failed"', class='shell py-20 text-center')
    h1(class='text-xl font-semibold text-gray-900') 画册加载失败
    p(class='lead mt-2') {{ errorMessage }}
    div(class='mt-8')
      button(
        class='rounded-full bg-brand-500 px-5 py-2 text-sm font-medium text-white hover:bg-brand-600',
        type='button',
        @click='load'
      ) 重新加载

  //- 正常
  template(v-else)
    //- 元信息
    div(class='shell pt-8')
      router-link(
        class='inline-flex items-center gap-1 text-sm text-gray-500 hover:text-brand-600',
        :to='{ name: "catalogs" }'
      ) ← 返回画册列表

      div(class='mt-5 flex flex-wrap items-center gap-2 text-xs text-gray-500')
        span(
          v-if='catalog.category',
          class='rounded-full bg-brand-50 px-2 py-0.5 font-medium text-brand-600',
          v-text='catalog.category.name'
        )
        span {{ catalog.page_count }} 页
        span(v-if='publishedText', v-text='"发布于 " + publishedText')

      h1(class='mt-3 text-2xl font-semibold text-gray-900 sm:text-3xl', v-text='catalog.title')
      p(v-if='catalog.subtitle', class='mt-2 text-base text-gray-600', v-text='catalog.subtitle')
      p(v-if='catalog.summary', class='lead mt-4 max-w-3xl', v-text='catalog.summary')

    //- 阅读区：换浅灰底把「纸」衬托出来，满幅不受 shell 宽度限制
    div(class='mt-8 bg-gray-100/70 py-8 sm:py-10')
      PageFlip(
        v-if='pages.length',
        :pages='pages',
        :accent='accent',
        :catalog-title='catalog.title'
      )
      p(v-else, class='shell text-center text-sm text-gray-500') 这本画册还没有内页，后台补充后即可翻阅。

    //- 收尾引导
    div(class='shell mt-10 flex flex-wrap items-center justify-between gap-4')
      p(class='lead') 需要纸质版或定制版本？告诉我们画册名称即可。
      router-link(
        class='rounded-full bg-brand-500 px-5 py-2 text-sm font-medium text-white hover:bg-brand-600',
        :to='{ name: "contact" }'
      ) 联系我们
</template>
