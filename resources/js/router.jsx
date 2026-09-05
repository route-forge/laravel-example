import { lazy } from 'react';
import { createBrowserRouter, Navigate } from 'react-router';
import ManageLayout from '@/layout/admin.jsx';

/**
 * 前端路由表（react-router）：本次只做管理端。
 *
 * ⚠ 与 route-forge 的分工（本项目核心约定，别搞反，口径同 vue 分支）：
 *   - react-router 负责「URL → 组件」，即**页面地址**。服务端只有一条入口路由 +
 *     catch-all 回退（routes/web.php），/manage/xxx 这类地址在 Laravel 侧不存在，
 *     所以页面跳转一律用本表里的 path / navigate(path)，不要用 forge 的 route() 生成。
 *   - route-forge 负责「路由名 → URL」，即**数据端点地址**。组件里用
 *     useForgeApi({ level, prefix }) 按名字发请求，全程不硬编码 /api/... 字面量。
 *   一句话：跳转用 react-router，取数用 forge。
 *
 * 后台各页用 React.lazy 异步 chunk：登录页与后台内容分离，首屏只加载外壳。
 * Suspense 边界统一放在 app.jsx 的 RouterProvider 外层。
 */
const LoginPage = lazy(() => import('@/pages/admin/login.jsx'));
const DashboardPage = lazy(() => import('@/pages/admin/dashboard.jsx'));
const CatalogsPage = lazy(() => import('@/pages/admin/catalogs/index.jsx'));
const CatalogPagesPage = lazy(() => import('@/pages/admin/catalogs/pages.jsx'));
const CategoriesPage = lazy(() => import('@/pages/admin/categories.jsx'));
const MessagesPage = lazy(() => import('@/pages/admin/messages.jsx'));
const SitePage = lazy(() => import('@/pages/admin/site.jsx'));

export const router = createBrowserRouter([
  // 登录页独立于后台布局：未登录时只有它能看
  { path: '/manage/login', element: <LoginPage /> },
  {
    path: '/manage',
    element: <ManageLayout />,
    children: [
      { index: true, element: <Navigate to="dashboard" replace /> },
      { path: 'dashboard', element: <DashboardPage /> },
      { path: 'catalogs', element: <CatalogsPage /> },
      // 画册页独立编辑页：参数 catalogId 与进入按钮对应
      { path: 'catalogs/:catalogId/pages', element: <CatalogPagesPage /> },
      { path: 'categories', element: <CategoriesPage /> },
      { path: 'messages', element: <MessagesPage /> },
      { path: 'site', element: <SitePage /> },
    ],
  },
  // 本次仅后台：其余路径（含前台四页尚未落地）统一兜底回后台首页
  { path: '*', element: <Navigate to="/manage" replace /> },
]);

export default router;
