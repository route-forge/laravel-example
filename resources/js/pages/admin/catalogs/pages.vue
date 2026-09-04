<script setup>
/**
 * 画册页独立编辑页：某一本画册的全部内页。
 *
 * - 拖拽排序（sortablejs）：拖完即调 catalogs.pages.reorder，后端按 ids 顺序写 sort_order；
 * - 弹窗新增 / 编辑：title / body / image / layout（六版式）/ tone（明暗）；
 * - 预留：后续在此页扩展图片热点（点击跳转 / 翻到指定页）与 HTML 页支持，
 *   编辑弹窗与预览区已按「左侧表单、右侧实时预览」占位，热点字段等后端 schema 落地后接入。
 *
 * 接口契约：catalogs.show（params.catalog = 画册 id，返回整本含 pages）、
 *           catalogs.pages.store / pages.update / pages.destroy / catalogs.pages.reorder。
 */
import { nextTick, onBeforeUnmount, onMounted, reactive, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useForgeApi } from '@route-forge/vue';
import Sortable from 'sortablejs';
import { bodyOf, messageOf } from '@/support/api.js';
import { Rank } from '@element-plus/icons-vue';

const route = useRoute();
const router = useRouter();
const { call } = useForgeApi('manage', 'api.manage');

const LAYOUTS = ['cover', 'text', 'split', 'image', 'quote', 'back'];
const LAYOUT_LABELS = {
  cover: '封面',
  text: '纯文本',
  split: '图文分栏',
  image: '大图',
  quote: '引用',
  back: '封底',
};
const TONES = ['light', 'dark'];

const catalogId = Number(route.params.catalogId);
const catalog = ref(null);
const pages = ref([]);
const loading = ref(true);
const savingOrder = ref(false);

const dialog = reactive({ visible: false, saving: false, editingId: null });
const formRef = ref(null);
const form = reactive(emptyForm());

const rules = {
  layout: [{ required: true, message: '请选择版式', trigger: 'change' }],
  tone: [{ required: true, message: '请选择页面明暗', trigger: 'change' }],
};

let sortable = null;
const tableWrapper = ref(null);

function emptyForm() {
  return {
    title: '',
    body: '',
    image: '',
    layout: 'text',
    tone: 'light',
    sort_order: pages.value.length + 1,
  };
}

async function load() {
  loading.value = true;
  try {
    const res = await call('catalogs.show', { params: { catalog: catalogId } }).catch((error) => ({
      error,
    }));

    if (res.error) {
      ElMessage.error(messageOf(res.error));
      return;
    }

    catalog.value = bodyOf(res);
    pages.value = [...(catalog.value?.pages ?? [])].sort((a, b) => a.sort_order - b.sort_order);
  } finally {
    loading.value = false;
  }
}

function setupSortable() {
  const tbody = tableWrapper.value?.querySelector('.el-table__body-wrapper tbody');
  if (!tbody) return;

  sortable?.destroy();
  sortable = Sortable.create(tbody, {
    handle: '.drag-handle',
    animation: 150,
    // 落点即新顺序：按 DOM 行的新排列重排本地数组，再整体提交 ids
    onEnd({ oldIndex, newIndex }) {
      if (oldIndex === newIndex) return;

      const moved = pages.value.splice(oldIndex, 1)[0];
      pages.value.splice(newIndex, 0, moved);
      submitOrder();
    },
  });
}

async function submitOrder() {
  savingOrder.value = true;
  try {
    const res = await call('catalogs.pages.reorder', {
      params: { catalog: catalogId },
      body: { ids: pages.value.map((page) => page.id) },
    }).catch((error) => ({ error }));

    if (res.error) {
      ElMessage.error(messageOf(res.error));
      load();
      return;
    }

    pages.value.forEach((page, index) => {
      page.sort_order = index + 1;
    });
  } finally {
    savingOrder.value = false;
  }
}

function openCreate() {
  Object.assign(form, emptyForm(), { sort_order: pages.value.length + 1 });
  dialog.editingId = null;
  dialog.visible = true;
}

function openEdit(row) {
  Object.assign(form, emptyForm(), { ...row });
  dialog.editingId = row.id;
  dialog.visible = true;
}

function save() {
  formRef.value?.validate(async (valid) => {
    if (!valid) return;

    dialog.saving = true;
    try {
      const payload = { ...form, sort_order: Number(form.sort_order) || 1 };
      const res = dialog.editingId
        ? await call('pages.update', { params: { page: dialog.editingId }, body: payload })
        : await call('catalogs.pages.store', { params: { catalog: catalogId }, body: payload });

      if (res.error) {
        ElMessage.error(messageOf(res.error));
        return;
      }

      ElMessage.success(dialog.editingId ? '页面已更新' : '页面已新增');
      dialog.visible = false;
      load();
    } finally {
      dialog.saving = false;
    }
  });
}

function remove(row) {
  ElMessageBox.confirm(`确定删除页面「${row.title || LAYOUT_LABELS[row.layout]}」？`, '删除确认', {
    type: 'warning',
    confirmButtonText: '删除',
    cancelButtonText: '取消',
  }).then(async () => {
    const res = await call('pages.destroy', { params: { page: row.id } }).catch((error) => ({
      error,
    }));

    if (res.error) {
      ElMessage.error(messageOf(res.error));
      return;
    }

    ElMessage.success('已删除');
    load();
  });
}

function layoutLabel(value) {
  return LAYOUT_LABELS[value] ?? value;
}

onMounted(async () => {
  await load();
  await nextTick();
  setupSortable();
});

onBeforeUnmount(() => {
  sortable?.destroy();
});
</script>

<template lang="pug">
div
  //- 页头：画册上下文 + 返回
  div(class='flex flex-wrap items-center justify-between gap-3')
    div
      el-button(link, @click='router.push({ name: "manage.catalogs" })') ← 返回画册列表
      h2(class='mt-1 text-lg font-semibold text-gray-900')
        | {{ catalog?.title ?? '画册页管理' }}
      span(class='ml-2 text-xs text-gray-400') {{ catalog?.slug }}
    div(class='flex items-center gap-3 text-xs text-gray-400')
      el-icon(class='cursor-move', color='#9ca3af')
        Rank
      span 拖动行即可排序，松手自动保存
      el-button(type='primary', @click='openCreate') 新增页面

  //- 页列表
  div(ref='tableWrapper', class='mt-4')
    el-table(v-loading='loading || savingOrder', :data='pages', row-key='id')
      el-table-column(width='44', align='center')
        template(#default)
          el-icon(class='drag-handle cursor-move text-gray-400')
            Rank
      el-table-column(prop='sort_order', label='页序', width='70')
      el-table-column(label='版式', width='110')
        template(#default='{ row }')
          el-tag(size='small') {{ layoutLabel(row.layout) }}
      el-table-column(label='标题 / 正文', min-width='260')
        template(#default='{ row }')
          div
            span(class='font-medium text-gray-800') {{ row.title || '（无标题）' }}
            p(class='truncate text-xs text-gray-400') {{ row.body }}
      el-table-column(label='明暗', width='80')
        template(#default='{ row }')
          el-tag(:type='row.tone === "dark" ? "info" : "warning"', size='small', effect='plain') {{ row.tone === 'dark' ? '深色' : '浅色' }}
      el-table-column(label='操作', width='140', fixed='right')
        template(#default='{ row }')
          el-button(link, type='primary', @click='openEdit(row)') 编辑
          el-button(link, type='danger', @click='remove(row)') 删除

  //- 新增 / 编辑弹窗：左侧表单，右侧实时预览占位（热点 / HTML 页后续在此扩展）
  el-dialog(v-model='dialog.visible', :title='dialog.editingId ? "编辑页面" : "新增页面"', width='720px')
    div(class='flex gap-4')
      el-form(ref='formRef', :model='form', :rules='rules', label-width='80px', class='flex-1')
        el-form-item(label='版式', prop='layout')
          el-select(v-model='form.layout', class='!w-full')
            el-option(
              v-for='layout in LAYOUTS',
              :key='layout',
              :label='layoutLabel(layout)',
              :value='layout'
            )
        el-form-item(label='页面明暗', prop='tone')
          el-radio-group(v-model='form.tone')
            el-radio(v-for='tone in TONES', :key='tone', :value='tone')
              | {{ tone === 'dark' ? '深色' : '浅色' }}
        el-form-item(label='标题')
          el-input(v-model='form.title', placeholder='可留空')
        el-form-item(label='正文')
          el-input(
            v-model='form.body',
            type='textarea',
            :rows='8',
            placeholder='纯文本；后续支持 HTML 页后此处可写富文本'
          )
        el-form-item(label='图片 URL')
          el-input(v-model='form.image', placeholder='https://…（留空则按主题色生成装饰面板）')
        el-form-item(label='页序')
          el-input-number(v-model='form.sort_order', :min='1', :max='200')
      //- 预览占位：后续图片热点（跳转链接 / 翻到指定页）在此渲染
      div(
        class='w-48 shrink-0 rounded-lg border border-dashed border-gray-300 p-3 text-xs text-gray-400',
        :class='form.tone === "dark" ? "bg-gray-800 text-gray-500" : ""'
      )
        p 预览占位
        p(class='mt-2') {{ LAYOUT_LABELS[form.layout] }} · {{ form.tone === 'dark' ? '深色' : '浅色' }}
        p(v-if='form.title', class='mt-2 font-medium') {{ form.title }}
        p(class='mt-1 line-clamp-6') {{ form.body }}
    template(#footer)
      el-button(@click='dialog.visible = false') 取消
      el-button(type='primary', :loading='dialog.saving', @click='save') 保存
</template>
