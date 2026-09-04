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
  {
    path: '/manage',
    name: 'manage',
    meta: { title: '跳转中...' },
    component: () => import('@/layout/admin.vue'),
    redirect: { name: 'manage.dashboard' },
    children: [
      {
        path: 'dashboard',
        name: 'manage.dashboard',
        meta: { title: '跳转中...' },
        component: () => import('@/pages/admin/dashboard.vue'),
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
