<script setup>
/**
 * 画册内页（单页渲染骨架）。PageFlip 负责「翻」，本组件只负责「这一页长什么样」。
 *
 * 版式按后端白名单 CatalogPage::LAYOUTS 分六支：cover / text / split / image / quote / back，
 * 未知值一律降级为 text（与后端注释同一口径，前后端对「脏数据」的处理必须一致，否则
 * 加一种版式就会白屏）。tone 只有 light / dark，其余值按 light。
 *
 * 尺寸不在这里管：PageFlip 用外层容器决定纸张大小，本组件的根节点永远 h-full w-full。
 * 版式差异全部走 [data-layout] 属性选择器 —— 动态类名（`sheet__${layout}`）在 UnoCSS
 * 静态扫描下虽然能命中，但这里是组件自有 CSS，属性选择器让 6 套版式互不干扰、也不进产物类名表。
 */
import { computed } from 'vue';
import { resolveAccent, toParagraphs } from '@/support/display.js';

const props = defineProps({
  page: { type: Object, required: true },
  catalogTitle: { type: String, default: '' },
  accent: { type: String, default: '#1668ac' },
  /** 1 起始的页码；null 表示补白页，不渲染页码 */
  number: { type: Number, default: null },
});

const KNOWN_LAYOUTS = ['cover', 'text', 'split', 'image', 'quote', 'back'];

const layout = computed(() =>
  KNOWN_LAYOUTS.includes(props.page.layout) ? props.page.layout : 'text',
);
const tone = computed(() => (props.page.tone === 'dark' ? 'dark' : 'light'));
const accent = computed(() => resolveAccent(props.accent));
const paragraphs = computed(() => toParagraphs(props.page.body));

// 正文短到一行时的兜底标题：cover/back 用画册名，其余留空
const heading = computed(() => props.page.title || props.catalogTitle);

/**
 * 无图时的装饰面板。
 *
 * Seeder 与示例数据里 image 一律为 null（不内置版权素材），所以这条是**主路径**而不是异常兜底：
 * 主题色渐变 + 大字首字 + 细线，让占位版面本身是成立的设计。填了真实 URL 后自动切 <img>。
 */
const artStyle = computed(() => ({
  background: `linear-gradient(150deg, ${accent.value} 0%, ${accent.value} 40%, rgba(7,42,69,0.9) 100%)`,
}));

const glyph = computed(
  () =>
    String(heading.value ?? '')
      .trim()
      .slice(0, 1) || '册',
);
</script>

<template lang="pug">
div(class='sheet', :data-layout='layout', :data-tone='tone')
  //- ── 封面 ──────────────────────────────────────────────
  template(v-if='layout === "cover"')
    div(class='sheet__pad flex h-full flex-col')
      div(class='flex items-center gap-2 text-[0.6875rem] tracking-[0.2em] opacity-70')
        span(class='h-px w-8', :style='{ background: accent }')
        span COVER
      div(class='my-auto')
        h2(class='sheet__display font-serif leading-tight', v-text='heading')
        p(v-if='paragraphs.length', class='mt-5 text-sm leading-7 opacity-80')
          span(v-for='(para, i) in paragraphs', :key='i', class='block', v-text='para')
      div(class='text-[0.6875rem] opacity-60')
        | {{ catalogTitle }}

  //- ── 纯文字 ────────────────────────────────────────────
  template(v-else-if='layout === "text"')
    div(class='sheet__scroll h-full')
      div(class='sheet__pad')
        h3(v-if='page.title', class='sheet__h3', v-text='page.title')
        div(class='sheet__prose')
          p(v-for='(para, i) in paragraphs', :key='i', v-text='para')
        p(v-if='!paragraphs.length', class='sheet__empty') 本页内容待补充

  //- ── 图文分栏（上图下文：窄页宽下比左右分栏稳）────────
  template(v-else-if='layout === "split"')
    div(class='flex h-full flex-col')
      div(class='sheet__scroll flex-1')
        div(class='sheet__pad')
          h3(v-if='page.title', class='sheet__h3', v-text='page.title')
          div(class='sheet__prose')
            p(v-for='(para, i) in paragraphs', :key='i', v-text='para')
      div(class='sheet__figure')
        img(
          v-if='page.image',
          :src='page.image',
          :alt='page.title || catalogTitle',
          loading='lazy'
        )
        div(v-else, :style='artStyle')
          span(class='sheet__glyph font-serif', v-text='glyph')

  //- ── 图为主，文字压在下缘 ──────────────────────────────
  template(v-else-if='layout === "image"')
    div(class='relative h-full')
      img(
        v-if='page.image',
        class='absolute inset-0 h-full w-full object-cover',
        :src='page.image',
        :alt='page.title || catalogTitle',
        loading='lazy'
      )
      div(v-else, class='absolute inset-0', :style='artStyle')
        span(class='sheet__glyph font-serif', v-text='glyph')
      div(class='sheet__overlay absolute inset-x-0 bottom-0')
        h3(v-if='page.title', class='text-base font-semibold', v-text='page.title')
        p(v-if='page.body', class='mt-1 text-xs leading-6 opacity-85', v-text='page.body')

  //- ── 金句 / 引言 ───────────────────────────────────────
  template(v-else-if='layout === "quote"')
    div(class='sheet__pad flex h-full flex-col justify-center')
      span(class='font-serif text-5xl leading-none', :style='{ color: accent }') “
      blockquote(class='mt-3 font-serif text-xl leading-relaxed sm:text-2xl')
        p(v-for='(para, i) in paragraphs', :key='i', class='mt-3 first:mt-0', v-text='para')
      footer(v-if='page.title', class='mt-6 flex items-center gap-2 text-xs opacity-70')
        span(class='h-px w-6', :style='{ background: accent }')
        span(v-text='page.title')

  //- ── 封底 ──────────────────────────────────────────────
  template(v-else)
    div(class='sheet__pad flex h-full flex-col')
      div(class='my-auto')
        h2(class='sheet__display font-serif leading-tight', v-text='heading')
        p(v-if='paragraphs.length', class='mt-4 text-sm leading-7 opacity-80')
          span(v-for='(para, i) in paragraphs', :key='i', class='block', v-text='para')
      div(class='flex items-end justify-between text-[0.6875rem] opacity-60')
        span {{ catalogTitle }}
        span END

  //- 页码（补白页不渲染）
  span(v-if='number', class='sheet__num', v-text='number')
</template>

<style scoped>
.sheet {
  position: relative;
  display: block;
  width: 100%;
  height: 100%;
  overflow: hidden;
  background: #fff;
  color: #1f2937;
}

/* 深色调版面：主题色压深打底，文字转白 */
.sheet[data-tone='dark'] {
  background: linear-gradient(160deg, #0d2f4d 0%, #072a45 55%, #041a2c 100%);
  color: #f3f6f9;
}

.sheet__pad {
  padding: clamp(1.25rem, 5.5%, 2.75rem);
}

.sheet__scroll {
  overflow-y: auto;
  overscroll-behavior: contain;
  scrollbar-width: thin;
}

.sheet__display {
  font-size: clamp(1.6rem, 4.6cqw, 2.6rem);
  font-weight: 600;
  letter-spacing: -0.01em;
}

.sheet__h3 {
  font-size: clamp(1.05rem, 3cqw, 1.4rem);
  font-weight: 600;
  line-height: 1.35;
  margin-bottom: 1rem;
}

.sheet__prose p {
  font-size: clamp(0.8125rem, 2.2cqw, 0.9375rem);
  line-height: 1.95;
  color: #4b5563;
}

.sheet[data-tone='dark'] .sheet__prose p {
  color: #dbe4ee;
}

.sheet__prose p + p {
  margin-top: 0.9rem;
}

.sheet__empty {
  font-size: 0.8125rem;
  color: #9ca3af;
}

/* 图 / 装饰面板 */
.sheet__figure {
  position: relative;
  flex: 0 0 38%;
  overflow: hidden;
}

.sheet__figure img,
.sheet__figure > div {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}

.sheet__figure img {
  object-fit: cover;
}

.sheet__glyph {
  position: absolute;
  right: 8%;
  bottom: -0.35em;
  font-size: 7.5em;
  line-height: 1;
  color: rgba(255, 255, 255, 0.16);
  user-select: none;
}

.sheet__overlay {
  padding: clamp(1rem, 4.5%, 2rem);
  background: linear-gradient(to top, rgba(4, 26, 44, 0.88), rgba(4, 26, 44, 0));
  color: #f8fafc;
}

/* 页码：装订侧留白，靠外下角 */
.sheet__num {
  position: absolute;
  bottom: 0.75rem;
  right: 1rem;
  font-size: 0.6875rem;
  letter-spacing: 0.08em;
  color: #9ca3af;
}

.sheet[data-tone='dark'] .sheet__num {
  color: rgba(255, 255, 255, 0.55);
}

/*
 * cqw 单位需要最近的容器：给内容根节点开一个内联容器，
 * 字号就能随「纸宽」而不是视口缩放，窄屏单页与宽屏对开都保持同一视觉密度。
 */
.sheet {
  container-type: inline-size;
}
</style>
