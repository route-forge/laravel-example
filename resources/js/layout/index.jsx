import { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router';
import SiteHeader from '@/components/SiteHeader.jsx';
import SiteFooter from '@/components/SiteFooter.jsx';
import { useSiteSettings } from '@/composables/useSiteSettings.js';

/**
 * 前台布局：页头 + 内容区 + 页脚。
 *
 * 内容区不做统一容器：画册详情页要满幅翻页，统一套 shell 反而会逼它写负外边距，
 * 所以每页自己决定用不用 shell（uno.config.js 的 shortcut）。
 *
 * 浏览器标签标题在这里统一维护（页面标题 + 站名），避免每页各写一份 document.title。
 */
const TITLES = [
  { test: (p) => /^\/catalogs\/.+/.test(p), title: '画册阅读' },
  { test: (p) => p === '/catalogs', title: '企业画册' },
  { test: (p) => p.startsWith('/contact'), title: '联系我们' },
  { test: (p) => p === '/', title: '首页' },
];

export default function PublicLayout() {
  const location = useLocation();
  const { siteName } = useSiteSettings();

  useEffect(() => {
    const title = TITLES.find((entry) => entry.test(location.pathname))?.title;
    document.title = title ? `${title} · ${siteName}` : siteName;
  }, [location.pathname, siteName]);

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="flex-1">
        <Outlet />
      </main>
      <SiteFooter />
    </div>
  );
}
