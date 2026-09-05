<script setup>
/**
 * 管理端布局：顶部状态栏 / 左侧菜单 / 右侧内容区。
 *
 * 内容区再分两层：固定的页面标题条 + 可滚动内容（overflow-y-auto），滚动只发生在内容里，
 * 顶栏与菜单始终可见。el-menu 开 router 模式，index 直接用路由 path。
 *
 * 准入门闩：进入布局先探测 bootstrap——401 说明未登录，重定向登录页；
 * 探测期间整屏 loading，绝不先渲染后台内容（避免未登录闪现框架）。
 */
import { onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useForgeApi } from '@route-forge/vue';
import {
  Loading,
  Odometer,
  Notebook,
  Collection,
  ChatDotRound,
  Setting,
} from '@element-plus/icons-vue';
import { bodyOf } from '@/support/api.js';

const route = useRoute();
const router = useRouter();
const { call } = useForgeApi('manage', 'api.manage');

// checking → ok；deny 时已完成跳转
const state = ref('checking');
const user = ref(null);

onMounted(async () => {
  const res = await call('bootstrap').catch((error) => ({ error }));

  if (res.error) {
    // 401 提示与跳转由 forge.js 的全局拦截器统一负责，这里只把界面拦在门外
    state.value = 'deny';
    router.replace({ name: 'manage.login' });
    return;
  }

  user.value = bodyOf(res)?.user ?? null;
  state.value = 'ok';
});

async function logout() {
  await call('logout').catch(() => {});
  router.replace({ name: 'manage.login' });
}
</script>

<template lang="pug">
div(class='flex h-screen flex-col bg-gray-100')
  div(v-if='state !== "ok"', class='flex flex-1 items-center justify-center text-gray-400')
    el-icon(:size='28', class='is-loading')
      Loading

  template(v-else)
    //- 顶部状态栏
    header(class='flex h-12 shrink-0 items-center justify-between border-b border-gray-200 bg-white px-5')
      div(class='flex items-baseline gap-2')
        span(class='text-base font-semibold text-brand-700') 企业画册
        span(class='text-xs text-gray-400') 管理端
      div(class='flex items-center gap-4 text-sm text-gray-600')
        span {{ user?.name }}
        el-button(link, type='danger', @click='logout') 退出登录

    div(class='flex min-h-0 flex-1')
      //- 左侧菜单
      aside(class='w-48 shrink-0 border-r border-gray-200 bg-white')
        el-menu(router, :default-active='route.path', class='!border-r-0')
          el-menu-item(index='/manage/dashboard')
            el-icon
              Odometer
            span 仪表盘
          el-menu-item(index='/manage/catalogs')
            el-icon
              Notebook
            span 画册管理
          el-menu-item(index='/manage/categories')
            el-icon
              Collection
            span 分类管理
          el-menu-item(index='/manage/messages')
            el-icon
              ChatDotRound
            span 留言管理
          el-menu-item(index='/manage/site')
            el-icon
              Setting
            span 基础资料

      //- 右侧内容区：固定标题条 + 滚动内容
      div(class='flex min-w-0 flex-1 flex-col')
        header(class='flex h-12 shrink-0 items-center border-b border-gray-200 bg-white px-6')
          h2(class='text-sm font-semibold text-gray-700') {{ route.meta.title }}
        main(class='min-h-0 flex-1 overflow-y-auto p-6')
          router-view
</template>
