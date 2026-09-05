import { createRouter, createWebHistory } from 'vue-router';

/**
 * 前端路由表：前台四页 + 管理端六个模块。
 *
 * ⚠ 与 route-forge 的分工（本项目的核心约定，别搞反）：
 *   - vue-router 负责「URL → 组件」，即**页面地址**。服务端只有一条入口路由 +
 *     catch-all 回退（routes/web.php），/catalogs/xxx 这类地址在 Laravel 侧根本不存在，
 *     所以页面跳转一律用本表里的 name，不要用 forge 的 route() 去生成。
 *   - route-forge 负责「路由名 → URL」，即**数据端点地址**。组件里用
 *     useForgeApi('public') / useForgeApi('manage', 'api.manage') 按名字发请求，
 *     全程不硬编码 /api/... 字面量。
 *   一句话：跳转用 vue-router 名，取数用 forge 名。
 */
const routes = [
  {
    // 前台布局：SiteHeader / SiteFooter 包住全部公开页；/ 直接就是首页
    path: '/',
    component: () => import('@/layout/index.vue'),
    children: [
      {
        path: '',
        name: 'home',
        meta: { title: '首页' },
        component: () => import('@/pages/home/index.vue'),
      },
      {
        path: 'catalogs',
        name: 'catalogs',
        meta: { title: '企业画册' },
        component: () => import('@/pages/catalogs/index.vue'),
      },
      {
        // 翻页阅读：slug 与 api.catalogs.show 的必填参数同名，组件内直接读 route.params
        path: 'catalogs/:slug',
        name: 'catalog.detail',
        meta: { title: '画册阅读' },
        component: () => import('@/pages/catalogs/detail.vue'),
      },
      {
        path: 'contact',
        name: 'contact',
        meta: { title: '联系我们' },
        component: () => import('@/pages/contact/index.vue'),
      },
      {
        // 通配兜底：仍套前台布局（页头页脚在），只是内容区换成 404
        path: ':pathMatch(.*)*',
        name: 'not-found',
        meta: { title: '页面不存在' },
        component: () => import('@/pages/not-found/index.vue'),
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
