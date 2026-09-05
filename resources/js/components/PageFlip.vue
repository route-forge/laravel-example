<script setup>
/**
 * 翻页阅读器：宽屏两页对开、窄屏单页，翻阅过程零请求。
 *
 * 输入是 api.catalogs.show 一次带出的整本 pages（已按 sort_order 排好），
 * 所以这里的「翻页」纯粹是本地游标移动，不触碰 forge——这也是后端把 pages 塞进详情响应的原因。
 *
 * 三件刻意的事：
 * 1. 不引入 page-flip 之类的第三方库：真实 3D 卷页要额外 ~20 kB 且要自己维护翻页期间的光栅，
 *    示例项目用方向感过渡（位移 + 透视微旋）已经能表达「翻」的语义。真要上卷页需单独决策。
 * 2. 断点用 matchMedia 而不是 CSS：对开 / 单页决定的是「渲染几张纸」这个逻辑，
 *    纯 CSS 只能改外观改不了页数，所以 JS 必须参与；断点值与 UnoCSS 的 lg(1024px) 对齐。
 * 3. 切视口时保持当前那张纸可见（normalizeCursor），否则从对开缩到单页会莫名跳页。
 */
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { ArrowLeft, ArrowRight } from '@element-plus/icons-vue';
import PageSheet from '@/components/PageSheet.vue';

const props = defineProps({
  pages: { type: Array, required: true },
  accent: { type: String, default: '#1668ac' },
  catalogTitle: { type: String, default: '' },
});

// 与 uno.config.js 的 lg 断点同值：≥1024px 才两页对开
const SPREAD_QUERY = '(min-width: 1024px)';
// 触屏滑动判定阈值（px），小于这个位移当作滚动/误触
const SWIPE_MIN = 48;

const media = window.matchMedia(SPREAD_QUERY);
const isSpread = ref(media.matches);
const cursor = ref(0);
// 1 = 向后翻，-1 = 向前翻；决定过渡方向
const direction = ref(1);

const total = computed(() => props.pages.length);
const perSpread = computed(() => (isSpread.value ? 2 : 1));
// 对开且总页数为奇数时，最后一跨是「1 页真 + 1 页补白」，所以按左页位置取整
const maxCursor = computed(() =>
  isSpread.value ? Math.floor(Math.max(0, total.value - 1) / 2) * 2 : Math.max(0, total.value - 1),
);
const spreadCount = computed(() => Math.max(1, Math.floor(maxCursor.value / 2) + 1));

/** 当前一跨要渲染的纸：null = 补白页（不渲染页码、不可翻出去） */
const sheets = computed(() => {
  const result = [];

  for (let offset = 0; offset < perSpread.value; offset += 1) {
    const index = cursor.value + offset;
    result.push(
      index < total.value
        ? { key: props.pages[index].id ?? index, page: props.pages[index], number: index + 1 }
        : null,
    );
  }

  return result;
});

const lastVisibleNumber = computed(() => {
  const filled = sheets.value.filter(Boolean);
  return filled.length ? filled[filled.length - 1].number : 0;
});

const progress = computed(() =>
  total.value ? Math.round((lastVisibleNumber.value / total.value) * 100) : 0,
);

const positionText = computed(() => {
  if (!total.value) return '0 / 0';
  if (!isSpread.value) return `${cursor.value + 1} / ${total.value}`;

  const filled = sheets.value.filter(Boolean);
  const from = filled.length ? filled[0].number : cursor.value + 1;

  return `${from}–${lastVisibleNumber.value} / ${total.value}`;
});

const transitionName = computed(() => (direction.value >= 0 ? 'flip-next' : 'flip-prev'));

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

/** 把游标收进合法范围；对开时对齐到跨页左页，避免切视口后跳页 */
function normalizeCursor() {
  let next = clamp(cursor.value, 0, maxCursor.value);

  if (isSpread.value) next = Math.floor(next / 2) * 2;

  cursor.value = next;
}

function turn(step) {
  const target = clamp(cursor.value + step * perSpread.value, 0, maxCursor.value);
  if (target === cursor.value) return;

  direction.value = step > 0 ? 1 : -1;
  cursor.value = target;
}

function goTo(index) {
  const target = clamp(Number(index) || 0, 0, Math.max(0, total.value - 1));

  direction.value = target >= cursor.value ? 1 : -1;
  cursor.value = isSpread.value ? Math.floor(target / 2) * 2 : target;
}

function onMediaChange(event) {
  isSpread.value = event.matches;
  normalizeCursor();
}

function onKeydown(event) {
  if (event.metaKey || event.ctrlKey || event.altKey) return;

  const target = event.target;
  // 表单与可编辑区域里方向键属于原生行为，不能抢
  if (target?.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target?.tagName)) {
    return;
  }

  switch (event.key) {
    case 'ArrowRight':
    case 'PageDown':
    case ' ':
      event.preventDefault();
      turn(1);
      break;
    case 'ArrowLeft':
    case 'PageUp':
      event.preventDefault();
      turn(-1);
      break;
    case 'Home':
      event.preventDefault();
      goTo(0);
      break;
    case 'End':
      event.preventDefault();
      goTo(total.value - 1);
      break;
    default:
  }
}

let touchStartX = 0;

function onTouchStart(event) {
  touchStartX = event.changedTouches[0]?.clientX ?? 0;
}

function onTouchEnd(event) {
  const endX = event.changedTouches[0]?.clientX ?? 0;
  const delta = endX - touchStartX;

  if (Math.abs(delta) < SWIPE_MIN) return;

  // 手指向右 = 往回翻
  turn(delta < 0 ? 1 : -1);
}

onMounted(() => {
  media.addEventListener('change', onMediaChange);
  window.addEventListener('keydown', onKeydown);
});

onBeforeUnmount(() => {
  media.removeEventListener('change', onMediaChange);
  window.removeEventListener('keydown', onKeydown);
});
</script>

<template lang="pug">
div(class='flip')
  //- 纸张舞台：透视给方向感过渡用；touch 事件只挂这里，不影响页面其余区域滚动
  div(
    class='flip__stage',
    :data-mode='isSpread ? "spread" : "single"',
    @touchstart.passive='onTouchStart',
    @touchend.passive='onTouchEnd'
  )
    //- mode=out-in：两份 spread 若同时在场会被 flex 并排，画面横向跳动
    Transition(:name='transitionName', mode='out-in')
      div(:key='`${cursor}-${isSpread ? "d" : "s"}`', class='flip__spread')
        template(v-for='(sheet, slot) in sheets', :key='slot')
          div(v-if='sheet', class='flip__sheet')
            PageSheet(
              :page='sheet.page',
              :number='sheet.number',
              :accent='accent',
              :catalog-title='catalogTitle'
            )
          div(v-else, class='flip__sheet flip__sheet--blank')
            span 本页留白

  //- 控制条
  div(class='flip__bar')
    el-button(
      :icon='ArrowLeft',
      circle,
      :disabled='cursor <= 0',
      title='上一页（←）',
      @click='turn(-1)'
    )

    div(class='flip__meta')
      div(class='flex items-baseline justify-between gap-3 text-xs text-gray-500')
        span
          | 第 {{ positionText }} 页
          span(v-if='isSpread', class='ml-2 text-gray-400') 共 {{ spreadCount }} 跨
        span {{ progress }}%
      div(class='flip__track')
        div(class='flip__fill', :style='{ width: progress + "%", background: accent }')

    el-select(class='flip__toc', :model-value='cursor', placeholder='跳转到页', @change='goTo')
      el-option(
        v-for='(page, index) in pages',
        :key='page.id ?? index',
        :value='index',
        :label='index + 1 + ". " + (page.title || "（无标题）")'
      )

    el-button(
      :icon='ArrowRight',
      circle,
      :disabled='cursor >= maxCursor',
      title='下一页（→）',
      @click='turn(1)'
    )

  p(class='mt-3 text-center text-xs text-gray-400')
    | 键盘 ← / → 翻页，Home / End 回首页与末页{{ isSpread ? '' : '，屏幕左右滑动同样可翻' }}
</template>

<style scoped>
.flip__stage {
  --cap-h: 74vh;
  display: flex;
  justify-content: center;
  perspective: 1600px;
  padding: 0.5rem 0 0.25rem;
}

.flip__spread {
  display: flex;
  align-items: stretch;
  justify-content: center;
  box-shadow: 0 18px 48px rgba(7, 42, 69, 0.16);
  transform-origin: center center;
  will-change: transform, opacity;
}

/*
 * 纸宽 = min(可用宽的一半, 设计上限, 由视口高反推的宽)。
 * 高度一律由纸宽乘 A4 比例算出，所以「视口不够高」表现为整本等比缩小，
 * 而不是用 max-height 把纸压扁。
 */
.flip__stage[data-mode='spread'] .flip__sheet {
  --w: min(46vw, 590px, calc(var(--cap-h) * 210 / 297));
  width: var(--w);
  height: calc(var(--w) * 297 / 210);
}

.flip__stage[data-mode='single'] .flip__sheet {
  --w: min(92vw, 560px, calc(82vh * 210 / 297));
  width: var(--w);
  height: calc(var(--w) * 297 / 210);
}

/* 纸张定位上下文：书脊渐变与页码都相对这张纸定位 */
.flip__sheet {
  position: relative;
  flex: 0 0 auto;
  background: #fff;
}

.flip__sheet--blank {
  display: flex;
  align-items: center;
  justify-content: center;
  background: repeating-linear-gradient(-45deg, #fafafa, #fafafa 10px, #f3f4f6 10px, #f3f4f6 20px);
  color: #b0b6bf;
  font-size: 0.75rem;
  letter-spacing: 0.2em;
}

/* 对开时中间那道书脊 */
.flip__stage[data-mode='spread'] .flip__sheet:nth-child(odd)::after,
.flip__stage[data-mode='spread'] .flip__sheet:nth-child(even)::before {
  content: '';
  position: absolute;
  top: 0;
  bottom: 0;
  width: 18px;
  pointer-events: none;
}

.flip__stage[data-mode='spread'] .flip__sheet:nth-child(odd)::after {
  right: 0;
  background: linear-gradient(to right, rgba(0, 0, 0, 0), rgba(0, 0, 0, 0.09));
}

.flip__stage[data-mode='spread'] .flip__sheet:nth-child(even)::before {
  left: 0;
  background: linear-gradient(to left, rgba(0, 0, 0, 0), rgba(0, 0, 0, 0.09));
}

.flip__bar {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-top: 1.25rem;
}

.flip__meta {
  flex: 1 1 auto;
  min-width: 0;
}

.flip__track {
  margin-top: 0.4rem;
  height: 4px;
  border-radius: 9999px;
  background: #e5e7eb;
  overflow: hidden;
}

.flip__fill {
  height: 100%;
  border-radius: 9999px;
  transition: width 0.32s ease;
}

.flip__toc {
  width: 11rem;
  flex: 0 0 auto;
}

@media (max-width: 767px) {
  .flip__toc {
    display: none;
  }
}

/* 方向感过渡：横向位移 + 轻微透视旋转，配合 stage 的 perspective */
.flip-next-enter-active,
.flip-next-leave-active,
.flip-prev-enter-active,
.flip-prev-leave-active {
  transition:
    opacity 0.18s ease,
    transform 0.22s cubic-bezier(0.22, 0.61, 0.36, 1);
}

.flip-next-enter-from {
  opacity: 0;
  transform: translateX(5%) rotateY(-7deg);
}

.flip-next-leave-to {
  opacity: 0;
  transform: translateX(-5%) rotateY(7deg);
}

.flip-prev-enter-from {
  opacity: 0;
  transform: translateX(-5%) rotateY(7deg);
}

.flip-prev-leave-to {
  opacity: 0;
  transform: translateX(5%) rotateY(-7deg);
}
</style>
