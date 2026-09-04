<script setup>
/**
 * 分类管理：表格 + 弹窗编辑 + 拖拽排序 + 删除。
 *
 * 接口契约：categories.index/store/update/destroy/reorder（manage 层级）。
 * 删除分类时名下画册由后端 FK nullOnDelete 自动回到「未分类」。
 */
import { nextTick, onBeforeUnmount, onMounted, reactive, ref } from 'vue';
import { useForgeApi } from '@route-forge/vue';
import Sortable from 'sortablejs';
import { bodyOf, messageOf } from '@/support/api.js';
import { Rank } from '@element-plus/icons-vue';

const { call } = useForgeApi('manage', 'api.manage');

const items = ref([]);
const loading = ref(false);
const savingOrder = ref(false);

const dialog = reactive({ visible: false, saving: false, editingId: null });
const formRef = ref(null);
const form = reactive({ name: '', slug: '', sort_order: 0 });

const rules = {
  name: [{ required: true, message: '请填写分类名称', trigger: 'blur' }],
  slug: [
    { required: true, message: '请填写 slug', trigger: 'blur' },
    { pattern: /^[a-z0-9]+(-[a-z0-9]+)*$/, message: '小写字母、数字与单个连字符', trigger: 'blur' },
  ],
};

let sortable = null;
const tableWrapper = ref(null);

async function load() {
  loading.value = true;
  try {
    const res = await call('categories.index').catch((error) => ({ error }));

    if (res.error) {
      ElMessage.error(messageOf(res.error));
      return;
    }

    items.value = bodyOf(res)?.data ?? [];
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
    onEnd({ oldIndex, newIndex }) {
      if (oldIndex === newIndex) return;

      const moved = items.value.splice(oldIndex, 1)[0];
      items.value.splice(newIndex, 0, moved);
      submitOrder();
    },
  });
}

async function submitOrder() {
  savingOrder.value = true;
  try {
    const res = await call('categories.reorder', {
      body: { ids: items.value.map((category) => category.id) },
    }).catch((error) => ({ error }));

    if (res.error) {
      ElMessage.error(messageOf(res.error));
      load();
      return;
    }

    items.value.forEach((category, index) => {
      category.sort_order = index + 1;
    });
  } finally {
    savingOrder.value = false;
  }
}

function openCreate() {
  Object.assign(form, { name: '', slug: '', sort_order: items.value.length + 1 });
  dialog.editingId = null;
  dialog.visible = true;
}

function openEdit(row) {
  Object.assign(form, { name: row.name, slug: row.slug, sort_order: row.sort_order });
  dialog.editingId = row.id;
  dialog.visible = true;
}

function save() {
  formRef.value?.validate(async (valid) => {
    if (!valid) return;

    dialog.saving = true;
    try {
      const payload = { ...form, sort_order: Number(form.sort_order) || 0 };
      const res = dialog.editingId
        ? await call('categories.update', { params: { category: dialog.editingId }, body: payload })
        : await call('categories.store', { body: payload });

      if (res.error) {
        ElMessage.error(messageOf(res.error));
        return;
      }

      ElMessage.success(dialog.editingId ? '分类已更新' : '分类已创建');
      dialog.visible = false;
      load();
    } finally {
      dialog.saving = false;
    }
  });
}

function remove(row) {
  ElMessageBox.confirm(
    `确定删除「${row.name}」？名下 ${row.catalogs_count ?? 0} 本画册将变为「未分类」。`,
    '删除确认',
    { type: 'warning', confirmButtonText: '删除', cancelButtonText: '取消' },
  ).then(async () => {
    const res = await call('categories.destroy', { params: { category: row.id } }).catch(
      (error) => ({ error }),
    );

    if (res.error) {
      ElMessage.error(messageOf(res.error));
      return;
    }

    ElMessage.success('已删除');
    load();
  });
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
  div(class='flex items-center justify-between')
    p(class='text-sm text-gray-500') 拖动行即可排序，松手自动保存
    el-button(type='primary', @click='openCreate') 新建分类

  div(ref='tableWrapper', class='mt-4')
    el-table(v-loading='loading || savingOrder', :data='items', row-key='id')
      el-table-column(width='44', align='center')
        template(#default)
          el-icon(class='drag-handle cursor-move text-gray-400')
            Rank
      el-table-column(prop='name', label='名称', min-width='140')
      el-table-column(prop='slug', label='slug', min-width='140')
      el-table-column(prop='catalogs_count', label='画册数', width='90')
      el-table-column(prop='sort_order', label='排序', width='80')
      el-table-column(label='操作', width='140', fixed='right')
        template(#default='{ row }')
          el-button(link, type='primary', @click='openEdit(row)') 编辑
          el-button(link, type='danger', @click='remove(row)') 删除

  el-dialog(v-model='dialog.visible', :title='dialog.editingId ? "编辑分类" : "新建分类"', width='440px')
    el-form(ref='formRef', :model='form', :rules='rules', label-width='80px')
      el-form-item(label='名称', prop='name')
        el-input(v-model='form.name', placeholder='公司宣传')
      el-form-item(label='slug', prop='slug')
        el-input(v-model='form.slug', placeholder='company')
      el-form-item(label='排序')
        el-input-number(v-model='form.sort_order', :min='0', :max='999')
    template(#footer)
      el-button(@click='dialog.visible = false') 取消
      el-button(type='primary', :loading='dialog.saving', @click='save') 保存
</template>
