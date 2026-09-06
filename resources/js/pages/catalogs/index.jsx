import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { Alert, Button, Empty, Pagination, Skeleton } from 'antd';
import { useForgeApi } from '@route-forge/react';
import CatalogCard from '@/components/CatalogCard.jsx';
import { bodyOf, messageOf, pageOf } from '@/support/api.js';

const PER_PAGE = 12;

/**
 * 前台 · 画册列表：分类筛选 + 卡片网格 + 分页。
 *
 * 筛选状态以 URL query 为唯一真值源（?category=&page=）：刷新、分享、前进后退都能还原
 * 同一画面，组件内不再另存镜像状态。published_count 为 0 的分类不进筛选条 ——
 * 点进去必然是空列表，那是误导。
 */
export default function CatalogListPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { call } = useForgeApi({ level: 'public' });

  const category = searchParams.get('category') ?? '';
  const pageParam = Number.parseInt(searchParams.get('page') ?? '1', 10);
  const currentPage = Number.isFinite(pageParam) && pageParam > 0 ? pageParam : 1;

  const [categories, setCategories] = useState([]);
  const [items, setItems] = useState([]);
  const [meta, setMeta] = useState({});
  // loading / ready / failed —— 空列表属于 ready，不是一种「状态」
  const [state, setState] = useState('loading');
  const [errorMessage, setErrorMessage] = useState('');

  const load = useCallback(async () => {
    setState('loading');
    setErrorMessage('');

    const res = await call('api.catalogs.index', {
      query: { page: currentPage, per_page: PER_PAGE, category: category || undefined },
    }).catch((error) => ({ error }));

    if (res.error) {
      setErrorMessage(messageOf(res.error));
      setState('failed');
      return;
    }

    const pg = pageOf(res);
    setItems(pg.items);
    setMeta(pg.meta);
    setState('ready');
  }, [call, currentPage, category]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    // 筛选条拿不到就只留「全部」，不打断主内容：列表本身才是这一页的主角
    (async () => {
      const res = await call('api.categories.index').catch((error) => ({ error }));
      if (res.error) return;
      setCategories((bodyOf(res)?.data ?? []).filter((c) => Number(c.published_count) > 0));
    })();
  }, [call]);

  function selectCategory(slug) {
    // 换分类必回第 1 页：page 一律不带
    setSearchParams(slug ? { category: slug } : {});
  }

  function goPage(page) {
    const next = { ...Object.fromEntries(searchParams) };
    if (page > 1) next.page = String(page);
    else delete next.page;
    setSearchParams(next);
  }

  return (
    <div className="shell py-10 sm:py-14">
      <header>
        <h1 className="text-2xl font-semibold text-gray-900 sm:text-3xl">企业画册</h1>
        <p className="lead mt-2">按分类浏览我们公开的全部画册，点开任意一本即可在线翻阅。</p>
      </header>

      {/* 分类筛选条 */}
      <div className="mt-6 flex flex-wrap items-center gap-2">
        <Button shape="round" type={category === '' ? 'primary' : 'default'} onClick={() => selectCategory('')}>
          全部
        </Button>
        {categories.map((c) => (
          <Button
            key={c.slug}
            shape="round"
            type={category === c.slug ? 'primary' : 'default'}
            onClick={() => selectCategory(c.slug)}
          >
            {c.name}
            <span className="ml-1 opacity-70">{c.published_count}</span>
          </Button>
        ))}
      </div>

      {state === 'ready' ? <p className="mt-6 text-sm text-gray-500">共 {meta.total ?? 0} 本画册</p> : null}

      {state === 'loading' ? (
        <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }, (_, i) => i).map((n) => (
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
          className="mt-6"
          type="error"
          showIcon
          message={`画册列表加载失败：${errorMessage}`}
          action={
            <Button size="small" type="primary" onClick={load}>
              重新加载
            </Button>
          }
        />
      ) : null}

      {state === 'ready' && !items.length ? (
        <div className="surface mt-6 py-16">
          <Empty
            description={
              <span>
                <span className="block text-base font-medium text-gray-800">这个分类下暂时没有画册</span>
                <span className="lead mt-2 block">换个分类看看，或直接联系我们索取最新画册。</span>
              </span>
            }
          >
            <div className="flex justify-center gap-3">
              {category ? (
                <Button type="primary" shape="round" onClick={() => selectCategory('')}>
                  查看全部画册
                </Button>
              ) : null}
              <Button shape="round" onClick={() => navigate('/contact')}>
                联系我们
              </Button>
            </div>
          </Empty>
        </div>
      ) : null}

      {state === 'ready' && items.length ? (
        <>
          <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((catalog) => (
              <CatalogCard key={catalog.id} catalog={catalog} />
            ))}
          </div>
          {Number(meta.last_page) > 1 ? (
            <div className="mt-10 flex justify-center">
              <Pagination
                current={currentPage}
                total={Number(meta.total) || 0}
                pageSize={Number(meta.per_page) || PER_PAGE}
                onChange={goPage}
                showSizeChanger={false}
              />
            </div>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
