import { createRouter, createWebHistory } from 'vue-router';

const routes = [
  {
    path: '/',
    meta: { title: '首页' },
    component: () => import('@/layout/index.vue'),
    redirect: { name: 'home' },
    children: [
      {
        path: '/home',
        name: 'home',
        meta: { title: '首页' },
        component: () => import('@/pages/home/index.vue'),
      },
    ],
  },
  // 登录页独立于后台布局：未登录时只有它能看
  {
    path: '/manage/login',
    name: 'manage.login',
    meta: { title: '登录' },
    component: () => import('@/pages/admin/login.vue'),
  },
  {
    path: '/manage',
    name: 'manage',
    meta: { title: '管理端' },
    component: () => import('@/layout/admin.vue'),
    redirect: { name: 'manage.dashboard' },
    children: [
      {
        path: 'dashboard',
        name: 'manage.dashboard',
        meta: { title: '仪表盘' },
        component: () => import('@/pages/admin/dashboard.vue'),
      },
      {
        path: 'catalogs',
        name: 'manage.catalogs',
        meta: { title: '画册管理' },
        component: () => import('@/pages/admin/catalogs/index.vue'),
      },
      {
        // 画册页独立编辑页：后续要在这里加图片热点（跳转/翻页）与 HTML 页支持
        path: 'catalogs/:catalogId/pages',
        name: 'manage.catalog-pages',
        meta: { title: '画册页管理' },
        component: () => import('@/pages/admin/catalogs/pages.vue'),
      },
      {
        path: 'categories',
        name: 'manage.categories',
        meta: { title: '分类管理' },
        component: () => import('@/pages/admin/categories.vue'),
      },
      {
        path: 'messages',
        name: 'manage.messages',
        meta: { title: '留言管理' },
        component: () => import('@/pages/admin/messages.vue'),
      },
      {
        path: 'site',
        name: 'manage.site',
        meta: { title: '基础资料' },
        component: () => import('@/pages/admin/site.vue'),
      },
    ],
  },
];

const route = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior: () => ({ top: 0 }),
});

export default route;
