import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { App } from 'antd';
import { useForgeApi } from '@route-forge/react';
import { bodyOf, messageOf } from '@/support/api.js';

const EMPTY_STATS = { catalogs: 0, published: 0, pages: 0, messages: 0, unread: 0 };

/**
 * 仪表盘：bootstrap 一次取回身份 + 统计；统计卡可点击直达对应管理页。
 * 「已发布 / 未读留言」卡顺带用 query 预置筛选条件（列表页读取 route 的 searchParams）。
 */
export default function DashboardPage() {
  const navigate = useNavigate();
  const { message } = App.useApp();
  const { call } = useForgeApi({ level: 'manage', prefix: 'api.manage' });

  const [user, setUser] = useState(null);
  const [stats, setStats] = useState(EMPTY_STATS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const res = await call('bootstrap').catch((error) => ({ error }));
      setLoading(false);
      if (res.error) {
        message.error(messageOf(res.error));
        return;
      }
      const body = bodyOf(res) ?? {};
      setUser(body.user ?? null);
      setStats({ ...EMPTY_STATS, ...body.stats });
    })();
  }, [call, message]);

  const cards = useMemo(
    () => [
      { label: '画册总数', value: stats.catalogs, to: '/manage/catalogs' },
      { label: '已发布', value: stats.published, hint: `共 ${stats.catalogs} 本`, to: '/manage/catalogs?status=published' },
      { label: '画册页', value: stats.pages, to: '/manage/catalogs' },
      { label: '留言总数', value: stats.messages, to: '/manage/messages' },
      { label: '未读留言', value: stats.unread, hint: '待处理', to: '/manage/messages?status=new' },
    ],
    [stats],
  );

  return (
    <div>
      <p className="text-xs tracking-wide text-gray-400 uppercase">Dashboard</p>
      <h1 className="mt-1 text-xl font-semibold text-gray-900">
        {loading ? '加载中…' : `你好，${user?.name ?? '管理员'}`}
      </h1>

      <div className="mt-6 grid gap-4 md:grid-cols-3 xl:grid-cols-5">
        {cards.map((card) => (
          <div
            key={card.label}
            onClick={() => navigate(card.to)}
            className="cursor-pointer rounded-xl border border-gray-200 bg-white p-5 transition hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-md"
          >
            <p className="text-xs text-gray-500">{card.label}</p>
            <p className="mt-2 text-3xl font-semibold text-gray-900">{loading ? '—' : card.value}</p>
            {card.hint ? <p className="mt-1 text-xs text-gray-400">{card.hint}</p> : null}
          </div>
        ))}
      </div>
    </div>
  );
}
