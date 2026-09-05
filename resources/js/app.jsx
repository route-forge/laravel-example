/**
 * React 应用入口。
 *
 * import 顺序是刻意安排的 —— CSS 产物顺序 = 模块求值顺序（同特异度下后来者胜）：
 *   1. `antd/dist/reset.css`：Ant Design 的全局 reset，最先垫底；
 *   2. `virtual:uno.css`：UnoCSS 的 preflight + 工具类，最后注入 —— 使 `bg-brand-500`
 *      这类工具类排在 antd 组件样式之后，才能真正覆盖组件库默认值。
 * resources/css/app.css 不在此引入：它是 laravel-vite-plugin 的独立入口，
 * Blade 的 @vite 里已排在最前（见 vite.config.js 的 input）。
 *
 * Provider 层级（由外到内）：
 *   RouteForgeProvider  注入 forge 实例（读 @forgeSummary 的一次性摘要；manage 层级 lazy）
 *     └ ConfigProvider  中文 locale + 主题主色（与 --brand 同源）
 *         └ AntdApp     让 message / modal 等静态 API 也吃到上面的 locale 与主题
 *             └ Suspense  兜住 React.lazy 路由 chunk 的加载态
 *                 └ RouterProvider
 */
import { StrictMode, Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router';
import { ConfigProvider, App as AntdApp, Spin } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import { RouteForgeProvider } from '@route-forge/react';
import 'antd/dist/reset.css';
import 'virtual:uno.css';
import { router } from '@/router.jsx';
import forgeOptions from '@/forge-options.js';

const BRAND = '#1668ac';

createRoot(document.getElementById('app')).render(
  <StrictMode>
    <RouteForgeProvider options={forgeOptions}>
      <ConfigProvider locale={zhCN} theme={{ token: { colorPrimary: BRAND } }}>
        <AntdApp>
          <Suspense
            fallback={
              <div className="flex min-h-screen items-center justify-center">
                <Spin size="large" />
              </div>
            }
          >
            <RouterProvider router={router} />
          </Suspense>
        </AntdApp>
      </ConfigProvider>
    </RouteForgeProvider>
  </StrictMode>,
);
