<script setup>
/**
 * 前台 · 联系与留言：左侧联系方式（站点基础资料）+ 右侧留言表单（api.contact.store）。
 *
 * 校验口径与服务端 ContactController::store 的 rules 逐条对齐。同一份约束写两处是前后端
 * 分离的代价，但这里不是「顺手加个 required」——它是唯一有效的防线：
 * core 的 HTTPError 只携带 status/route/url，不带响应体，所以 Laravel 422 的 errors
 * 字段目前到不了前端（限制已记在 support/api.js）。服务端 422 只能作为兜底文案，
 * 无法回显到具体字段，所以字段级校验必须在前端做完。
 *
 * CSRF：POST 走 forge 请求链，X-XSRF-TOKEN 由 forge.js 的拦截器统一注入，页面不再管。
 */
import { reactive, ref } from 'vue';
import { useForgeApi } from '@route-forge/vue';
import { bodyOf, messageOf } from '@/support/api.js';
import { useSiteSettings } from '@/composables/useSiteSettings.js';

const { siteName, contacts, intro } = useSiteSettings();
const { call } = useForgeApi('public');

const formRef = ref(null);
const submitting = ref(false);
const sentMessage = ref('');

const form = reactive(emptyForm());

const rules = {
  name: [
    { required: true, message: '请填写称呼', trigger: ['blur', 'change'] },
    { max: 100, message: '称呼不超过 100 字', trigger: ['blur', 'change'] },
  ],
  email: [
    { required: true, message: '请填写邮箱', trigger: ['blur', 'change'] },
    { type: 'email', message: '邮箱格式不正确', trigger: ['blur', 'change'] },
    { max: 200, message: '邮箱不超过 200 字', trigger: ['blur', 'change'] },
  ],
  phone: [{ max: 50, message: '电话不超过 50 字', trigger: ['blur', 'change'] }],
  company: [{ max: 200, message: '公司名不超过 200 字', trigger: ['blur', 'change'] }],
  subject: [{ max: 200, message: '主题不超过 200 字', trigger: ['blur', 'change'] }],
  message: [
    { required: true, message: '请填写留言内容', trigger: ['blur', 'change'] },
    { min: 10, message: '留言内容至少 10 个字，方便我们判断需求', trigger: ['blur', 'change'] },
    { max: 5000, message: '留言内容不超过 5000 字', trigger: ['blur', 'change'] },
  ],
};

function emptyForm() {
  return { name: '', email: '', phone: '', company: '', subject: '', message: '' };
}

async function submit() {
  const valid = await formRef.value?.validate().catch(() => false);
  if (!valid) return;

  submitting.value = true;
  sentMessage.value = '';

  const res = await call('api.contact.store', { body: { ...form } }).catch((error) => ({
    error,
  }));

  submitting.value = false;

  if (res.error) {
    ElMessage.error(messageOf(res.error));
    return;
  }

  // 成功文案取服务端返回（后端是唯一真值源），拿不到才退回本地文案
  sentMessage.value = bodyOf(res)?.message || '留言已收到，我们会尽快联系你。';
  ElMessage.success(sentMessage.value);

  Object.assign(form, emptyForm());
  formRef.value?.clearValidate();
}
</script>

<template lang="pug">
div(class='shell py-10 sm:py-14')
  header
    h1(class='text-2xl font-semibold text-gray-900 sm:text-3xl') 联系我们
    p(class='lead mt-2') 想要纸质画册、定制版本或某个行业的落地案例，留言给我们即可。

  div(class='mt-8 grid gap-6 lg:grid-cols-5')
    //- 联系方式
    div(class='lg:col-span-2 space-y-4')
      div(class='surface')
        h2(class='text-base font-semibold text-gray-900') {{ siteName }}
        p(v-if='intro', class='lead mt-2 text-sm', v-text='intro')
        ul(class='mt-5 space-y-3 text-sm')
          li(v-if='contacts.phone', class='flex gap-3')
            span(class='w-14 shrink-0 text-gray-400') 电话
            a(
              class='text-gray-800 hover:text-brand-600',
              :href='"tel:" + contacts.phone',
              v-text='contacts.phone'
            )
          li(v-if='contacts.email', class='flex gap-3')
            span(class='w-14 shrink-0 text-gray-400') 邮箱
            a(
              class='text-gray-800 hover:text-brand-600',
              :href='"mailto:" + contacts.email',
              v-text='contacts.email'
            )
          li(v-if='contacts.address', class='flex gap-3')
            span(class='w-14 shrink-0 text-gray-400') 地址
            span(class='text-gray-800', v-text='contacts.address')
          li(v-if='!contacts.phone && !contacts.email && !contacts.address', class='text-gray-400') 联系方式待后台补充

      div(class='surface')
        h2(class='text-sm font-semibold text-gray-900') 留言后会怎样
        p(class='lead mt-2 text-sm')
          | 留言进入后台「留言管理」，管理员可标记处理状态；我们会通过你留下的邮箱或电话回复。

    //- 表单
    div(class='surface lg:col-span-3')
      p(
        v-if='sentMessage',
        class='mb-5 rounded-xl bg-brand-50 px-4 py-3 text-sm text-brand-700',
        v-text='sentMessage'
      )

      el-form(ref='formRef', :model='form', :rules='rules', label-position='top')
        div(class='grid gap-x-4 sm:grid-cols-2')
          el-form-item(label='称呼', prop='name')
            el-input(v-model='form.name', placeholder='怎么称呼你')
          el-form-item(label='邮箱', prop='email')
            el-input(v-model='form.email', placeholder='用于回复你')
          el-form-item(label='电话', prop='phone')
            el-input(v-model='form.phone', placeholder='选填')
          el-form-item(label='公司', prop='company')
            el-input(v-model='form.company', placeholder='选填')
        el-form-item(label='主题', prop='subject')
          el-input(v-model='form.subject', placeholder='例如：索取 2026 品牌画册纸质版')
        el-form-item(label='留言内容', prop='message')
          el-input(
            v-model='form.message',
            type='textarea',
            :rows='5',
            maxlength='5000',
            show-count,
            placeholder='至少 10 个字，说明场景与需求即可'
          )
        div(class='flex items-center justify-between gap-4')
          span(class='text-xs text-gray-400') 带 * 的为必填项
          el-button(type='primary', :loading='submitting', @click='submit') 提交留言
</template>
