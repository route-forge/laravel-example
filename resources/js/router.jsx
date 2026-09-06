import { lazy } from 'react';
import { createBrowserRouter, Navigate } from 'react-router';
import PublicLayout from '@/layout/index.jsx';
import ManageLayout from '@/layout/admin.jsx';

/**
 * 前端路由表：前台四页 + 管理端六个模块。
 *
 * ⚠ 与 route-forge 的分工（本项目的核心约定，别搞反，口径同 vue 分支）：
 *   - react-router 负责「URL → 组件」，即**页面地址**。服务端只有一条入口路由 +
 *     catch-all 回退（routes/web.php），/catalogs/xxx 这类地址在 Laravel 侧不存在，
 *     所以页面跳转一律用本表的 path，不要用 forge 的名字生成。
 *   - route-forge 负责「路由名 → URL」，即**数据端点地址**。组件里用
 *     useForgeApi({ level, prefix }) 按名字发请求，全程不硬编码 /api/... 字面量。
 *   一句话：跳转用 react-router，取数用 forge。
 *
 * 各页 React.lazy 异步 chunk：前台内容与登录页/后台内容互不进对方 bundle。
 * Suspense 边界统一放在 app.jsx 的 RouterProvider 外层。
 *
 * 匹配优先级由 react-router 按路径特异性排序决定：/manage/* 的静态路由恒优先于
 * '/' 布局下的 '*' catch-all，前台 404 不会吞掉后台。
 */
const HomePage = lazy(() => import('@/pages/home/index.jsx'));
const CatalogListPage = lazy(() => import('@/pages/catalogs/index.jsx'));
const CatalogDetailPage = lazy(() => import('@/pages/catalogs/detail.jsx'));
const ContactPage = lazy(() => import('@/pages/contact/index.jsx'));
const NotFoundPage = lazy(() => import('@/pages/not-found/index.jsx'));

const LoginPage = lazy(() => import('@/pages/admin/login.jsx'));
const DashboardPage = lazy(() => import('@/pages/admin/dashboard.jsx'));
const CatalogsPage = lazy(() => import('@/pages/admin/catalogs/index.jsx'));
const CatalogPagesPage = lazy(() => import('@/pages/admin/catalogs/pages.jsx'));
const CategoriesPage = lazy(() => import('@/pages/admin/categories.jsx'));
const MessagesPage = lazy(() => import('@/pages/admin/messages.jsx'));
const SitePage = lazy(() => import('@/pages/admin/site.jsx'));

export const router = createBrowserRouter([
  {
    // 前台布局：SiteHeader / SiteFooter 包住全部公开页；/ 直接就是首页
    path: '/',
    element: <PublicLayout />,
    children: [
      { index: true, element: <HomePage /> },
      { path: 'catalogs', element: <CatalogListPage /> },
      {
        // 翻页阅读：slug 与 api.catalogs.show 的必填参数同名，组件内直接读 params
        path: 'catalogs/:slug',
        element: <CatalogDetailPage />,
      },
      { path: 'contact', element: <ContactPage /> },
      {
        // 通配兜底：仍套前台布局（页头页脚在），只是内容区换成 404
        path: '*',
        element: <NotFoundPage />,
      },
    ],
  },
  // 登录页独立于后台布局：未登录时只有它能看
  { path: '/manage/login', element: <LoginPage /> },
  {
    path: '/manage',
    element: <ManageLayout />,
    children: [
      { index: true, element: <Navigate to="dashboard" replace /> },
      { path: 'dashboard', element: <DashboardPage /> },
      { path: 'catalogs', element: <CatalogsPage /> },
      // 画册页独立编辑页：后续要在这里加图片热点（跳转/翻页）与 HTML 页支持
      { path: 'catalogs/:catalogId/pages', element: <CatalogPagesPage /> },
      { path: 'categories', element: <CategoriesPage /> },
      { path: 'messages', element: <MessagesPage /> },
      { path: 'site', element: <SitePage /> },
    ],
  },
]);

export default router;
