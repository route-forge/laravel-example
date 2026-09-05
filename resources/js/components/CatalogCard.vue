<script setup>
/**
 * 画册卡片：首页与列表页共用，整卡即链接。
 *
 * 消费的是 api.catalogs.index 的列表项形状（不带 pages）：
 *   { id, slug, title, subtitle, summary, cover_image, theme_color, category, page_count, published_at }
 *
 * ⚠ 主题色只能走内联样式：UnoCSS 靠静态扫描源码里的类名字面量，
 *   「方括号任意值 + 变量插值」这类动态拼出来的名字它看不见，产物里根本不会有那条规则
 *   （连注释里写出的类名形状都会被扫进去，所以这里刻意不举字面例）。
 *   所以 theme_color 一律进 style / CSS 变量，不进 class。
 */
import { computed } from 'vue';
import { formatDate, resolveAccent } from '@/support/display.js';

const props = defineProps({
  catalog: { type: Object, required: true },
});

const accent = computed(() => resolveAccent(props.catalog.theme_color));
const publishedText = computed(() => formatDate(props.catalog.published_at));
const pageCount = computed(() => Number(props.catalog.page_count) || 0);

// 无封面时的装饰面板：主题色打底 + 深色斜向压深，右侧留一层高光，避免整块扁平色板
const coverStyle = computed(() => ({
  background: `linear-gradient(135deg, ${accent.value} 0%, ${accent.value} 45%, rgba(7,42,69,0.85) 100%)`,
}));

const titleInitial = computed(() =>
  String(props.catalog.title ?? '')
    .trim()
    .slice(0, 1),
);
</script>

<template lang="pug">
router-link(
  class='group flex h-full flex-col overflow-hidden rounded-2xl bg-white ring-1 ring-gray-200 transition duration-200 hover:-translate-y-1 hover:shadow-lg hover:ring-brand-300',
  :to='{ name: "catalog.detail", params: { slug: catalog.slug } }'
)
  //- 封面区
  div(class='relative aspect-[4/3] overflow-hidden bg-gray-100')
    img(
      v-if='catalog.cover_image',
      :src='catalog.cover_image',
      :alt='catalog.title',
      class='h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]'
    )
    template(v-else)
      div(class='absolute inset-0', :style='coverStyle')
      //- 装饰层：首字巨标 + 细线，让「无素材」看起来是设计而非缺省
      span(
        class='pointer-events-none absolute -bottom-6 right-4 select-none font-serif text-[9rem] leading-none text-white/15',
        v-text='titleInitial'
      )
      div(class='pointer-events-none absolute inset-x-5 top-5 h-px bg-white/25')
      div(class='pointer-events-none absolute inset-x-5 bottom-16 h-px bg-white/20')
    div(
      class='absolute left-4 top-4 rounded-full bg-black/35 px-2.5 py-1 text-xs text-white backdrop-blur-sm'
    )
      | {{ pageCount }} 页

  //- 文字区
  div(class='flex flex-1 flex-col p-5')
    div(class='flex flex-wrap items-center gap-2 text-xs text-gray-500')
      span(
        v-if='catalog.category',
        class='rounded-full bg-brand-50 px-2 py-0.5 font-medium text-brand-600',
        v-text='catalog.category.name'
      )
      span(v-else, class='rounded-full bg-gray-100 px-2 py-0.5') 未分类
      span(v-if='publishedText', v-text='publishedText')
    h3(class='mt-2 line-clamp-2 text-base font-semibold text-gray-900', v-text='catalog.title')
    p(v-if='catalog.subtitle', class='mt-1 line-clamp-1 text-sm text-gray-500', v-text='catalog.subtitle')
    p(
      v-if='catalog.summary',
      class='mt-2 line-clamp-2 text-sm leading-6 text-gray-600',
      v-text='catalog.summary'
    )
    span(class='mt-auto inline-flex items-center gap-1 pt-4 text-sm font-medium text-brand-600')
      | 开始翻阅
      span(class='transition-transform duration-200 group-hover:translate-x-1') →
</template>
