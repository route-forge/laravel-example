<script setup>
/**
 * 仪表盘：bootstrap 一次取回身份 + 统计；统计卡可点击直达对应管理页。
 */
import { computed, onMounted, reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useForgeApi } from '@route-forge/vue';
import { bodyOf, messageOf } from '@/support/api.js';

const router = useRouter();
const { call } = useForgeApi('manage', 'api.manage');

const user = ref(null);
const stats = reactive({ catalogs: 0, published: 0, pages: 0, messages: 0, unread: 0 });
const loading = ref(true);

// 已发布 / 未读顺带用 query 预置筛选条件（列表页 onMounted 会读取）
const cards = computed(() => [
  { label: '画册总数', value: stats.catalogs, to: { name: 'manage.catalogs' } },
  {
    label: '已发布',
    value: stats.published,
    hint: `共 ${stats.catalogs} 本`,
    to: { name: 'manage.catalogs', query: { status: 'published' } },
  },
  { label: '画册页', value: stats.pages, to: { name: 'manage.catalogs' } },
  { label: '留言总数', value: stats.messages, to: { name: 'manage.messages' } },
  {
    label: '未读留言',
    value: stats.unread,
    hint: '待处理',
    to: { name: 'manage.messages', query: { status: 'new' } },
  },
]);

onMounted(async () => {
  const res = await call('bootstrap').catch((error) => ({ error }));
  loading.value = false;

  if (res.error) {
    ElMessage.error(messageOf(res.error));
    return;
  }

  const body = bodyOf(res) ?? {};
  user.value = body.user ?? null;
  Object.assign(stats, body.stats ?? {});
});
</script>

<template lang="pug">
div
  p(class='eyebrow') Dashboard
  h1(class='mt-1 text-xl font-semibold text-gray-900')
    | {{ loading ? '加载中…' : `你好，${user?.name ?? '管理员'}` }}

  div(class='mt-6 grid gap-4 md:grid-cols-3 xl:grid-cols-5')
    div(
      v-for='card in cards',
      :key='card.label',
      class='cursor-pointer rounded-xl border border-gray-200 bg-white p-5 transition hover:-translate-y-0.5 hover:border-brand-400 hover:shadow-md',
      @click='router.push(card.to)'
    )
      p(class='text-xs text-gray-500') {{ card.label }}
      p(class='mt-2 text-3xl font-semibold text-gray-900') {{ loading ? '—' : card.value }}
      p(v-if='card.hint', class='mt-1 text-xs text-gray-400') {{ card.hint }}
</template>
