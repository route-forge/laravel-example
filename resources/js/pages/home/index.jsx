import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { Alert, Button, Skeleton } from 'antd';
import { useForgeApi } from '@route-forge/react';
import CatalogCard from '@/components/CatalogCard.jsx';
import { useSiteSettings } from '@/composables/useSiteSettings.js';
import { bodyOf, messageOf, pageOf } from '@/support/api.js';
import { toParagraphs } from '@/support/display.js';

const FEATURED_COUNT = 3;

/**
 * 前台 · 首页：品牌区 + 分类导览 + 最新画册入口 + 联系引导。
 *
 * 三个数据源各自独立降级（任何一路失败都不该把整页变成错误页）：
 *   api.site.show       → 站点资料，走 useSiteSettings 单例
 *   api.catalogs.index  → ?per_page=3 的「最新画册」区（后端已按 published 过滤并倒序，
 *                         这里不排不筛 —— 前台不该复刻后端的业务规则）
 *   api.categories.index→ 分类导览；published_count 为 0 的不进导览，拿不到就整块隐藏
 */
export default function HomePage() {
  const navigate = useNavigate();
  const { call } = useForgeApi({ level: 'public' });
  const { siteName, slogan, intro, contacts } = useSiteSettings();

  const [featured, setFeatured] = useState([]);
  const [total, setTotal] = useState(0);
  const [categories, setCategories] = useState([]);
  const [state, setState] = useState('loading');
  const [errorMessage, setErrorMessage] = useState('');

  const loadFeatured = useCallback(async () => {
    setState('loading');
    setErrorMessage('');

    const res = await call('api.catalogs.index', {
      query: { page: 1, per_page: FEATURED_COUNT },
    }).catch((error) => ({ error }));

    if (res.error) {
      setErrorMessage(messageOf(res.error));
      setState('failed');
      return;
    }

    const page = pageOf(res);
    setFeatured(page.items);
    setTotal(Number(page.meta.total) || page.items.length);
    setState('ready');
  }, [call]);

  useEffect(() => {
    loadFeatured();
  }, [loadFeatured]);

  useEffect(() => {
    (async () => {
      const res = await call('api.categories.index').catch((error) => ({ error }));
      if (res.error) return;
      setCategories((bodyOf(res)?.data ?? []).filter((category) => Number(category.published_count) > 0));
    })();
  }, [call]);

  // 品牌区只铺前两段，剩下留给列表页与详情页讲
  const introParagraphs = toParagraphs(intro).slice(0, 2);
  const heroTitle = slogan || `${siteName} · 在线企业画册`;

  return (
    <div>
      {/* ── 品牌区 ── */}
      <section className="relative overflow-hidden bg-brand-900 text-white">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-[-10%] top-[-40%] h-[140%]"
          style={{
            background:
              'radial-gradient(45% 55% at 18% 12%, rgba(141, 194, 230, 0.28), transparent 70%), radial-gradient(38% 48% at 82% 0%, rgba(22, 104, 172, 0.55), transparent 72%)',
          }}
        />
        <div className="shell relative py-16 sm:py-24">
          <p className="text-xs uppercase text-brand-300" style={{ letterSpacing: '0.22em' }}>
            {siteName}
          </p>
          <h1 className="mt-4 max-w-3xl text-3xl font-semibold leading-tight sm:text-4xl lg:text-5xl">{heroTitle}</h1>
          <div className="mt-5 max-w-2xl space-y-3 text-base leading-7 text-white/75">
            {introParagraphs.map((para, i) => (
              <p key={i}>{para}</p>
            ))}
            {introParagraphs.length === 0 ? (
              <p>我们把公司的产品、服务与案例做成可在线翻阅的画册，内容全部由后台维护。</p>
            ) : null}
          </div>

          <div className="mt-9 flex flex-wrap items-center gap-3">
            <Button type="primary" shape="round" size="large" onClick={() => navigate('/catalogs')}>
              浏览全部画册
            </Button>
            <Button shape="round" size="large" className="!bg-transparent !text-white !ring-1 !ring-white/40 hover:!ring-white/80" onClick={() => navigate('/contact')}>
              联系我们
            </Button>
          </div>
          {state === 'ready' && total ? <p className="mt-8 text-sm text-white/60">当前公开 {total} 本画册</p> : null}
        </div>
      </section>

      {/* ── 分类导览 ── */}
      {categories.length ? (
        <section className="shell pt-12">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-lg font-semibold text-gray-900">按分类浏览</h2>
            <Link className="text-sm text-brand-600 hover:text-brand-700" to="/catalogs">
              查看全部 →
            </Link>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {categories.map((category) => (
              <Button
                key={category.slug}
                shape="round"
                onClick={() => navigate(`/catalogs?category=${encodeURIComponent(category.slug)}`)}
              >
                {category.name}
                <span className="ml-1 text-xs text-gray-400">{category.published_count}</span>
              </Button>
            ))}
          </div>
        </section>
      ) : null}

      {/* ── 最新画册 ── */}
      <section className="shell py-12">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-lg font-semibold text-gray-900">最新画册</h2>
          <Link className="text-sm text-brand-600 hover:text-brand-700" to="/catalogs">
            更多画册 →
          </Link>
        </div>

        {state === 'loading' ? (
          <div className="mt-5 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: FEATURED_COUNT }, (_, i) => i).map((n) => (
              <div key={n} className="overflow-hidden rounded-2xl bg-white ring-1 ring-gray-200">
                <div className="bg-gray-100" style={{ aspectRatio: '4 / 3' }} />
                <div className="p-5">
                  <Skeleton active title={{ width: '60%' }} paragraph={{ rows: 2, width: ['100%', '80%'] }} />
                </div>
              </div>
            ))}
          </div>
        ) : null}

        {state === 'failed' ? (
          <Alert
            className="mt-5"
            type="error"
            showIcon
            message={`画册加载失败：${errorMessage}`}
            action={
              <Button size="small" type="primary" onClick={loadFeatured}>
                重新加载
              </Button>
            }
          />
        ) : null}

        {state === 'ready' && !featured.length ? (
          <p className="surface mt-5 py-12 text-center text-sm text-gray-500">后台还没有发布任何画册，稍后再来看。</p>
        ) : null}

        {state === 'ready' && featured.length ? (
          <div className="mt-5 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {featured.map((catalog) => (
              <CatalogCard key={catalog.id} catalog={catalog} />
            ))}
          </div>
        ) : null}
      </section>

      {/* ── 联系引导 ── */}
      <section className="border-y border-gray-200 bg-gray-50">
        <div className="shell flex flex-wrap items-center justify-between gap-6 py-10">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">想要纸质版，或有别的问题？</h2>
            <p className="lead mt-1 text-sm">
              {contacts.phone || contacts.email ? '直接联系我们，或留一条在线留言。' : '留一条在线留言，我们会主动联系你。'}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {contacts.phone ? (
              <a className="text-sm text-gray-700 hover:text-brand-600" href={`tel:${contacts.phone}`}>
                {contacts.phone}
              </a>
            ) : null}
            <Button type="primary" shape="round" onClick={() => navigate('/contact')}>
              在线留言
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
