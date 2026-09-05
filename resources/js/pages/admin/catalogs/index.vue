<script setup>
/**
 * 画册管理：keyword/status 筛选 + 分页表格 + 弹窗编辑 + 删除。
 *
 * 接口契约（manage 层级，prefix api.manage）：
 *   catalogs.index   GET    ?keyword=&status=&page=
 *   catalogs.store   POST   { slug,title,subtitle,summary,cover_image,category_id,theme_color,status,sort_order }
 *   catalogs.update  PUT    params.catalog = 画册 id（后端按 id 绑定，slug 只是展示）
 *   catalogs.destroy DELETE params.catalog
 *   categories.index GET    分类下拉数据源（含草稿计数）
 */
import { onMounted, reactive, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useForgeApi } from '@route-forge/vue';
import { bodyOf, pageOf, messageOf } from '@/support/api.js';

const route = useRoute();
const router = useRouter();
const { call } = useForgeApi('manage', 'api.manage');

const STATUS_OPTIONS = [
  { value: 'draft', label: '草稿' },
  { value: 'published', label: '已发布' },
];

// 从路由 query 预置筛选（仪表盘「已发布」卡跳转过来时带 status）
const filters = reactive({ keyword: '', status: route.query.status ?? '' });
const items = ref([]);
const meta = ref({ current_page: 1, last_page: 1, total: 0 });
const categories = ref([]);
const loading = ref(false);

const dialog = reactive({ visible: false, saving: false, editingId: null });
const form = reactive(emptyForm());
const formRef = ref(null);

const rules = {
  slug: [
    { required: true, message: '请填写 slug', trigger: 'blur' },
    { pattern: /^[a-z0-9]+(-[a-z0-9]+)*$/, message: '小写字母、数字与单个连字符', trigger: 'blur' },
  ],
  title: [{ required: true, message: '请填写标题', trigger: 'blur' }],
  theme_color: [
    {
      required: true,
      pattern: /^#[0-9a-fA-F]{6}$/,
      message: '#rrggbb 十六进制色值',
      trigger: 'blur',
    },
  ],
  status: [{ required: true, message: '请选择状态', trigger: 'change' }],
};

function emptyForm() {
  return {
    slug: '',
    title: '',
    subtitle: '',
    summary: '',
    cover_image: '',
    category_id: null,
    theme_color: '#1668ac',
    status: 'draft',
    sort_order: 0,
  };
}

async function load(page = 1) {
  loading.value = true;
  try {
    const res = await call('catalogs.index', {
      query: { page, keyword: filters.keyword || undefined, status: filters.status || undefined },
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

async function loadCategories() {
  const res = await call('categories.index').catch((error) => ({ error }));
  if (!res.error) categories.value = bodyOf(res)?.data ?? [];
}

function openCreate() {
  Object.assign(form, emptyForm());
  dialog.editingId = null;
  dialog.visible = true;
}

function openEdit(row) {
  Object.assign(form, emptyForm(), {
    ...row,
    category_id: row.category?.id ?? null,
  });
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
        ? await call('catalogs.update', { params: { catalog: dialog.editingId }, body: payload })
        : await call('catalogs.store', { body: payload });

      if (res.error) {
        ElMessage.error(messageOf(res.error));
        return;
      }

      ElMessage.success(dialog.editingId ? '画册已更新' : '画册已创建');
      dialog.visible = false;
      load(meta.value.current_page ?? 1);
    } finally {
      dialog.saving = false;
    }
  });
}

function remove(row) {
  ElMessageBox.confirm(`确定删除「${row.title}」？其全部画册页会一并删除。`, '删除确认', {
    type: 'warning',
    confirmButtonText: '删除',
    cancelButtonText: '取消',
  }).then(async () => {
    const res = await call('catalogs.destroy', { params: { catalog: row.id } }).catch((error) => ({
      error,
    }));

    if (res.error) {
      ElMessage.error(messageOf(res.error));
      return;
    }

    ElMessage.success('已删除');
    load(1);
  });
}

function openPages(row) {
  router.push({ name: 'manage.catalog-pages', params: { catalogId: row.id } });
}

function statusLabel(value) {
  return STATUS_OPTIONS.find((option) => option.value === value)?.label ?? value;
}

onMounted(() => {
  load();
  loadCategories();
});
</script>

<template lang="pug">
div
  //- 筛选条
  div(class='flex flex-wrap items-center gap-3')
    el-input(
      v-model='filters.keyword',
      placeholder='按标题 / slug 搜索',
      clearable,
      class='!w-56',
      @keyup.enter='load(1)'
    )
    el-select(v-model='filters.status', placeholder='状态', clearable, class='!w-32')
      el-option(
        v-for='option in STATUS_OPTIONS',
        :key='option.value',
        :label='option.label',
        :value='option.value'
      )
    el-button(type='primary', plain, @click='load(1)') 查询
    div(class='flex-1')
    el-button(type='primary', @click='openCreate') 新建画册

  //- 列表
  el-table(v-loading='loading', :data='items', class='mt-4')
    el-table-column(prop='title', label='标题', min-width='180')
      template(#default='{ row }')
        span(class='font-medium text-gray-800') {{ row.title }}
        span(class='ml-2 text-xs text-gray-400') {{ row.slug }}
    el-table-column(label='分类', width='110')
      template(#default='{ row }')
        span {{ row.category?.name ?? '未分类' }}
    el-table-column(label='状态', width='90')
      template(#default='{ row }')
        el-tag(:type='row.status === "published" ? "success" : "info"', size='small')
          | {{ statusLabel(row.status) }}
    el-table-column(prop='pages_count', label='页数', width='70')
    el-table-column(prop='sort_order', label='排序', width='70')
    el-table-column(label='操作', width='200', fixed='right')
      template(#default='{ row }')
        el-button(link, type='primary', @click='openPages(row)') 管理页面
        el-button(link, type='primary', @click='openEdit(row)') 编辑
        el-button(link, type='danger', @click='remove(row)') 删除

  el-pagination(
    class='mt-4 justify-end',
    layout='total, prev, pager, next',
    :total='meta.total ?? 0',
    :current-page='meta.current_page ?? 1',
    :page-size='meta.per_page ?? 10',
    @current-change='load'
  )

  //- 新建 / 编辑弹窗
  el-dialog(v-model='dialog.visible', :title='dialog.editingId ? "编辑画册" : "新建画册"', width='560px')
    el-form(ref='formRef', :model='form', :rules='rules', label-width='90px')
      el-form-item(label='标题', prop='title')
        el-input(v-model='form.title')
      el-form-item(label='slug', prop='slug')
        el-input(v-model='form.slug', placeholder='company-2026')
      el-form-item(label='副标题')
        el-input(v-model='form.subtitle')
      el-form-item(label='摘要')
        el-input(v-model='form.summary', type='textarea', :rows='3')
      el-form-item(label='封面图 URL')
        el-input(v-model='form.cover_image', placeholder='https://…（留空则用主题色装饰面板）')
      el-form-item(label='分类')
        el-select(v-model='form.category_id', clearable, placeholder='未分类', class='!w-full')
          el-option(
            v-for='category in categories',
            :key='category.id',
            :label='category.name',
            :value='category.id'
          )
      el-form-item(label='主题色', prop='theme_color')
        el-color-picker(v-model='form.theme_color')
        span(class='ml-2 text-xs text-gray-400') 前台翻页组件的进度条 / 书脊 / 页码取此色
      el-form-item(label='状态', prop='status')
        el-radio-group(v-model='form.status')
          el-radio(v-for='option in STATUS_OPTIONS', :key='option.value', :value='option.value')
            | {{ option.label }}
      el-form-item(label='排序')
        el-input-number(v-model='form.sort_order', :min='0', :max='999')
    template(#footer)
      el-button(@click='dialog.visible = false') 取消
      el-button(type='primary', :loading='dialog.saving', @click='save') 保存
</template>
