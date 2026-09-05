<script setup>
/**
 * 基础资料：公开侧 api.site.show 读（public 层级），管理端 api.manage.site.update 写。
 * 单例配置：site_settings 恒有一行，表单整体更新。
 */
import { onMounted, reactive, ref } from 'vue';
import { useForgeApi } from '@route-forge/vue';
import { bodyOf, messageOf } from '@/support/api.js';

const publicApi = useForgeApi('public');
const { call } = useForgeApi('manage', 'api.manage');

const form = reactive(emptyForm());
const formRef = ref(null);
const loading = ref(true);
const saving = ref(false);

const rules = {
  site_name: [{ required: true, message: '请填写站点名称', trigger: 'blur' }],
  contact_email: [{ type: 'email', message: '邮箱格式不正确', trigger: 'blur' }],
};

function emptyForm() {
  return {
    site_name: '',
    brand_slogan: '',
    logo_url: '',
    intro: '',
    contact_phone: '',
    contact_email: '',
    contact_address: '',
    icp: '',
  };
}

async function load() {
  const res = await publicApi.call('api.site.show').catch((error) => ({ error }));
  loading.value = false;

  if (res.error) {
    ElMessage.error(messageOf(res.error));
    return;
  }

  Object.assign(form, emptyForm(), bodyOf(res.data) ?? {});
}

function save() {
  formRef.value?.validate(async (valid) => {
    if (!valid) return;

    saving.value = true;
    try {
      const res = await call('site.update', { body: { ...form } }).catch((error) => ({ error }));

      if (res.error) {
        ElMessage.error(messageOf(res.error));
        return;
      }

      Object.assign(form, emptyForm(), bodyOf(res.data) ?? {});
      ElMessage.success('基础资料已保存');
    } finally {
      saving.value = false;
    }
  });
}

onMounted(load);
</script>

<template lang="pug">
div(class='max-w-2xl')
  el-card(shadow='never', v-loading='loading')
    template(#header)
      span(class='text-sm font-semibold text-gray-700') 站点基础资料
      span(class='ml-2 text-xs text-gray-400') 前台首页品牌区 / 页脚的数据源

    el-form(ref='formRef', :model='form', :rules='rules', label-width='100px')
      el-form-item(label='站点名称', prop='site_name')
        el-input(v-model='form.site_name')
      el-form-item(label='品牌口号')
        el-input(v-model='form.brand_slogan', placeholder='一句话介绍，首页展示')
      el-form-item(label='Logo URL')
        el-input(v-model='form.logo_url', placeholder='https://…')
      el-form-item(label='公司简介')
        el-input(v-model='form.intro', type='textarea', :rows='5')
      el-form-item(label='联系电话')
        el-input(v-model='form.contact_phone')
      el-form-item(label='联系邮箱', prop='contact_email')
        el-input(v-model='form.contact_email')
      el-form-item(label='联系地址')
        el-input(v-model='form.contact_address')
      el-form-item(label='备案号')
        el-input(v-model='form.icp', placeholder='苏ICP备XXXXXXXX号（页脚展示）')

    el-button(type='primary', :loading='saving', @click='save') 保存
</template>
