import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';
import { Button, Drawer, Menu } from 'antd';
import { CloseOutlined, MenuOutlined } from '@ant-design/icons';
import { useSiteSettings } from '@/composables/useSiteSettings.js';

/**
 * 前台页头：品牌位 + 主导航 + 移动端抽屉。
 *
 * 数据只有站点资料（走 useSiteSettings 单例，与页脚同源，首屏只发一次）。
 * 导航一律用 react-router 的 path（页面地址不在 Laravel 路由表里，不能用 forge 的名字）。
 * 详情页要让「企业画册」项保持高亮，故 catalogs 的 match 覆盖到详情。
 */
const NAV_ITEMS = [
  { key: 'home', label: '首页', path: '/', match: (p) => p === '/' },
  { key: 'catalogs', label: '企业画册', path: '/catalogs', match: (p) => p === '/catalogs' || p.startsWith('/catalogs/') },
  { key: 'contact', label: '联系我们', path: '/contact', match: (p) => p.startsWith('/contact') },
];

export default function SiteHeader() {
  const location = useLocation();
  const navigate = useNavigate();
  const { siteName, logoUrl } = useSiteSettings();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const active = NAV_ITEMS.find((item) => item.match(location.pathname));
  const selectedKeys = active ? [active.key] : [];

  const menuItems = NAV_ITEMS.map((item) => ({
    key: item.key,
    label: (
      <Link to={item.path} onClick={() => setDrawerOpen(false)}>
        {item.label}
      </Link>
    ),
  }));

  function goContact() {
    setDrawerOpen(false);
    navigate('/contact');
  }

  return (
    <header className="sticky top-0 z-50 border-b border-gray-200/80 bg-white/85 backdrop-blur">
      <div className="shell flex h-16 items-center gap-3">
        <Link to="/" className="flex shrink-0 items-center gap-2" onClick={() => setDrawerOpen(false)}>
          {logoUrl ? (
            <img src={logoUrl} alt={siteName} className="h-8 w-auto object-contain" style={{ maxWidth: '10rem' }} />
          ) : (
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-500 text-sm font-semibold text-white">
              {siteName.slice(0, 1)}
            </span>
          )}
          <span className="text-base font-semibold text-gray-900 sm:text-lg">{siteName}</span>
        </Link>

        {/* 桌面导航 */}
        <div className="ml-auto hidden items-center gap-3 md:flex">
          <Menu mode="horizontal" selectedKeys={selectedKeys} items={menuItems} style={{ borderBottom: 'none' }} />
          <Button type="primary" shape="round" onClick={goContact}>
            获取方案
          </Button>
        </div>

        {/* 移动端开关 */}
        <Button
          className="ml-auto md:hidden"
          type="text"
          shape="circle"
          aria-label="展开导航菜单"
          aria-expanded={drawerOpen}
          icon={drawerOpen ? <CloseOutlined /> : <MenuOutlined />}
          onClick={() => setDrawerOpen(true)}
        />
      </div>

      <Drawer title={siteName} placement="left" width={288} open={drawerOpen} onClose={() => setDrawerOpen(false)}>
        <Menu mode="vertical" selectedKeys={selectedKeys} items={menuItems} style={{ borderInlineEnd: 'none' }} />
        <Button type="primary" shape="round" block className="mt-4" onClick={goContact}>
          获取方案
        </Button>
      </Drawer>
    </header>
  );
}
