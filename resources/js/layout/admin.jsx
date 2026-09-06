import { useEffect, useMemo, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router';
import { App, Layout, Menu, Spin } from 'antd';
import {
  DashboardOutlined,
  BookOutlined,
  TagsOutlined,
  MessageOutlined,
  SettingOutlined,
  LoadingOutlined,
  LogoutOutlined,
} from '@ant-design/icons';
import { useForgeApi } from '@route-forge/react';
import { bodyOf } from '@/support/api.js';

const { Header, Sider, Content } = Layout;

/** 左侧菜单：key 即路由 path（与 router.jsx 保持一致）。 */
const MENU_ITEMS = [
  { key: '/manage/dashboard', icon: <DashboardOutlined />, label: '仪表盘' },
  { key: '/manage/catalogs', icon: <BookOutlined />, label: '画册管理' },
  { key: '/manage/categories', icon: <TagsOutlined />, label: '分类管理' },
  { key: '/manage/messages', icon: <MessageOutlined />, label: '留言管理' },
  { key: '/manage/site', icon: <SettingOutlined />, label: '基础资料' },
];

/** 顶栏标题：命中前缀即取，未命中（如画册页子路由）回落到画册管理。 */
const TITLES = [
  ['/manage/dashboard', '仪表盘'],
  ['/manage/catalogs', '画册管理'],
  ['/manage/categories', '分类管理'],
  ['/manage/messages', '留言管理'],
  ['/manage/site', '基础资料'],
];

/**
 * 管理端布局：顶部状态栏 / 左侧菜单 / 右侧内容区（固定标题条 + 可滚动内容）。
 *
 * 准入门闩：进入布局先探测 bootstrap —— 401 说明未登录，送回登录页；
 * 探测期间整屏 loading，绝不先渲染后台内容（避免未登录闪现框架）。
 * 401 的提示与跳转由 forge-options.js 的全局拦截器统一负责，这里只把界面拦在门外。
 *
 * bootstrap 的结果经 <Outlet context> 下发：布局与仪表盘要的是同一份数据
 * （身份 + 统计），各自调一次就是重复请求，子页面用 useOutletContext 取用即可。
 */
export default function ManageLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { message } = App.useApp();
  const { call } = useForgeApi({ level: 'manage', prefix: 'api.manage' });

  // 'checking' → 'ok'；deny 时已完成跳转
  const [state, setState] = useState('checking');
  const [bootstrap, setBootstrap] = useState(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      const res = await call('bootstrap').catch((error) => ({ error }));
      if (!alive) return;
      if (res.error) {
        setState('deny');
        navigate('/manage/login', { replace: true });
        return;
      }
      setBootstrap(bodyOf(res));
      setState('ok');
    })();
    return () => {
      alive = false;
    };
  }, [call, navigate]);

  const user = bootstrap?.user ?? null;

  const title = useMemo(
    () => TITLES.find(([prefix]) => location.pathname.startsWith(prefix))?.[1] ?? '管理端',
    [location.pathname],
  );

  async function logout() {
    await call('logout').catch(() => {});
    message.success('已退出登录');
    navigate('/manage/login', { replace: true });
  }

  if (state !== 'ok') {
    return (
      <div className="flex h-screen items-center justify-center">
        <Spin indicator={<LoadingOutlined spin style={{ fontSize: 28 }} />} />
      </div>
    );
  }

  return (
    <Layout className="h-screen">
      <Header
        className="flex items-center justify-between !px-5"
        style={{ height: 48, lineHeight: '48px', background: '#fff', borderBottom: '1px solid #f0f0f0' }}
      >
        <div className="flex items-baseline gap-2">
          <span className="text-base font-semibold text-brand-700">企业画册</span>
          <span className="text-xs text-gray-400">管理端</span>
        </div>
        <div className="flex items-center gap-4 text-sm text-gray-600">
          <span>{user?.name}</span>
          <a onClick={logout}>
            <LogoutOutlined /> 退出登录
          </a>
        </div>
      </Header>
      <Layout>
        <Sider width={192} theme="light" style={{ borderRight: '1px solid #f0f0f0' }}>
          <Menu
            mode="inline"
            selectedKeys={[location.pathname]}
            items={MENU_ITEMS}
            onClick={({ key }) => navigate(key)}
            style={{ borderInlineEnd: 'none' }}
          />
        </Sider>
        <Layout>
          <div
            className="flex items-center bg-white px-6"
            style={{ height: 48, borderBottom: '1px solid #f0f0f0' }}
          >
            <h2 className="text-sm font-semibold text-gray-700">{title}</h2>
          </div>
          <Content className="min-h-0 flex-1 overflow-y-auto bg-gray-100 p-6">
            <Outlet context={{ bootstrap }} />
          </Content>
        </Layout>
      </Layout>
    </Layout>
  );
}
