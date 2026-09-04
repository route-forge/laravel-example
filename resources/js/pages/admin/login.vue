<script setup>
/**
 * 管理端登录页（SPA 内前端路由，不在后台布局里）。
 *
 * - 登录接口 api.auth.login 归 public 层级（登录时还没有会话）；
 * - 已登录者访问本页会被 bootstrap 探测发现，直接送回仪表盘；
 * - 服务端只回 JSON，成功后跳哪由前端决定。
 */
import { onMounted, reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useForgeApi } from '@route-forge/vue';
import { bodyOf, messageOf } from '@/support/api.js';

const router = useRouter();
const publicApi = useForgeApi('public');
const manageApi = useForgeApi('manage', 'api.manage');

const form = reactive({ email: 'admin@forge.example', password: 'password' });
const submitting = ref(false);

onMounted(async () => {
  // 已登录就直接进后台
  const res = await manageApi.call('bootstrap').catch((error) => ({ error }));
  if (!res.error) router.replace({ name: 'manage.dashboard' });
});

async function submit() {
  if (!form.email || !form.password) {
    ElMessage.warning('请填写邮箱与密码。');
    return;
  }

  submitting.value = true;
  try {
    const res = await publicApi.call('api.auth.login', { body: { ...form } });

    if (res.error) {
      ElMessage.error(messageOf(res.error) || '登录失败，请检查邮箱与密码。');
      return;
    }

    ElMessage.success(`欢迎回来，${bodyOf(res)?.user?.name ?? '管理员'}`);
    router.replace({ name: 'manage.dashboard' });
  } finally {
    submitting.value = false;
  }
}
</script>

<template lang="pug">
div(class='flex min-h-screen items-center justify-center bg-gray-100')
  div(class='w-96 rounded-2xl border border-gray-200 bg-white p-8')
    h1(class='text-lg font-semibold text-gray-900') 企业画册 · 管理端
    p(class='mt-1 text-sm text-gray-500') 请使用管理员账号登录

    el-form(:model='form', label-position='top', @submit.prevent='submit')
      el-form-item(label='邮箱')
        el-input(v-model='form.email', type='email', placeholder='admin@forge.example')
      el-form-item(label='密码')
        el-input(
          v-model='form.password',
          type='password',
          show-password,
          placeholder='••••••••',
          @keyup.enter='submit'
        )
      el-button(class='w-full', type='primary', :loading='submitting', @click='submit') 登 录

    p(class='mt-4 text-center text-xs text-gray-400') 演示账号 admin@forge.example / password
</template>
