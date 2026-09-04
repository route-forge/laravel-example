<script setup>
/**
 * 留言管理：状态筛选 + 分页表格 + 查看详情 + 处理（status 流转）。
 *
 * 接口契约：messages.index（?status=&page=）、messages.update（params.message，body { status }）。
 * 状态机由后端约束：离开 new 记 handled_at，退回 new 清空。
 */
import { onMounted, reactive, ref } from 'vue';
import { useForgeApi } from '@route-forge/vue';
import { pageOf, messageOf } from '@/support/api.js';

const { call } = useForgeApi('manage', 'api.manage');

const STATUS_OPTIONS = [
  { value: 'new', label: '未读', tag: 'danger' },
  { value: 'read', label: '已读', tag: 'info' },
  { value: 'replied', label: '已回复', tag: 'success' },
  { value: 'archived', label: '已归档', tag: 'warning' },
];

const filters = reactive({ status: '' });
const items = ref([]);
const meta = ref({ current_page: 1, last_page: 1, total: 0 });
const loading = ref(false);

const detail = reactive({ visible: false, row: null });

function statusMeta(value) {
  return STATUS_OPTIONS.find((option) => option.value === value) ?? { label: value, tag: 'info' };
}

async function load(page = 1) {
  loading.value = true;
  try {
    const res = await call('messages.index', {
      query: { page, status: filters.status || undefined },
    });

    if (res.error) {
      ElMessage.error(messageOf(res.error));
      return;
    }

    const { items: list, meta: pageMeta } = pageOf(res);
    items.value = list;
    meta.value = pageMeta;
  } finally {
    loading.value = false;
  }
}

async function mark(row, status) {
  const res = await call('messages.update', {
    params: { message: row.id },
    body: { status },
  }).catch((error) => ({ error }));

  if (res.error) {
    ElMessage.error(messageOf(res.error));
    return;
  }

  ElMessage.success('已更新状态');
  detail.visible = false;
  load(meta.value.current_page ?? 1);
}

function openDetail(row) {
  detail.row = row;
  detail.visible = true;
}

onMounted(() => load());
</script>

<template lang="pug">
div
  div(class='flex items-center gap-3')
    el-select(v-model='filters.status', placeholder='全部状态', clearable, class='!w-36')
      el-option(
        v-for='option in STATUS_OPTIONS',
        :key='option.value',
        :label='option.label',
        :value='option.value'
      )
    el-button(type='primary', plain, @click='load(1)') 查询

  el-table(v-loading='loading', :data='items', class='mt-4')
    el-table-column(label='来信人', min-width='150')
      template(#default='{ row }')
        div
          span(class='font-medium', :class='row.status === "new" ? "text-gray-900" : "text-gray-600"') {{ row.name }}
          p(class='text-xs text-gray-400') {{ row.email }}
    el-table-column(prop='company', label='公司', min-width='120')
    el-table-column(prop='subject', label='主题', min-width='150')
    el-table-column(prop='message', label='内容', min-width='200')
      template(#default='{ row }')
        span(class='truncate text-sm text-gray-500') {{ row.message }}
    el-table-column(label='状态', width='90')
      template(#default='{ row }')
        el-tag(:type='statusMeta(row.status).tag', size='small') {{ statusMeta(row.status).label }}
    el-table-column(prop='created_at', label='时间', width='110')
      template(#default='{ row }')
        span(class='text-xs text-gray-400') {{ (row.created_at ?? '').slice(0, 10) }}
    el-table-column(label='操作', width='180', fixed='right')
      template(#default='{ row }')
        el-button(link, type='primary', @click='openDetail(row)') 查看
        el-button(v-if='row.status === "new"', link, type='primary', @click='mark(row, "read")') 标已读
        el-button(
          v-if='row.status !== "replied" && row.status !== "archived"',
          link,
          type='success',
          @click='mark(row, "replied")'
        ) 已回复
        el-button(link, type='warning', @click='mark(row, "archived")') 归档

  el-pagination(
    class='mt-4 justify-end',
    layout='total, prev, pager, next',
    :total='meta.total ?? 0',
    :current-page='meta.current_page ?? 1',
    :page-size='meta.per_page ?? 10',
    @current-change='load'
  )

  //- 详情弹窗
  el-dialog(v-model='detail.visible', title='留言详情', width='560px')
    template(v-if='detail.row')
      div(class='space-y-2 text-sm')
        p
          span(class='text-gray-400') 来信人：
          span {{ detail.row.name }}（{{ detail.row.email }}）
        p(v-if='detail.row.phone')
          span(class='text-gray-400') 电话：
          span {{ detail.row.phone }}
        p(v-if='detail.row.company')
          span(class='text-gray-400') 公司：
          span {{ detail.row.company }}
        p
          span(class='text-gray-400') 主题：
          span {{ detail.row.subject }}
      el-divider
      p(class='whitespace-pre-wrap text-sm leading-6 text-gray-700') {{ detail.row.message }}
    template(#footer)
      el-button(@click='mark(detail.row, "read")') 标为已读
      el-button(type='success', @click='mark(detail.row, "replied")') 标为已回复
      el-button(@click='detail.visible = false') 关闭
</template>
