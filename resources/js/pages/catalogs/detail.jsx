import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { Button, Skeleton } from 'antd';
import { useForgeApi } from '@route-forge/react';
import PageFlip from '@/components/PageFlip.jsx';
import { bodyOf, messageOf } from '@/support/api.js';
import { formatDate, resolveAccent } from '@/support/display.js';

/** 稳健取状态码：不同适配层分别挂 context / response / 顶层（与后台 401 兜底同一取法）。 */
function httpStatus(error) {
  return error?.context?.status ?? error?.response?.status ?? error?.status ?? null;
}

/**
 * 前台 · 画册详情 = 元信息 + 翻页阅读器。
 *
 * api.catalogs.show（必填 slug）一次带出整本 pages（后端刻意塞进详情响应，翻阅不再发请求）。
 * 未发布 / 不存在由后端 404。404 与其他错误必须分开：前者给返回入口，后者给重试 ——
 * 混成一句「加载失败」会诱导访客反复刷新。
 */
export default function CatalogDetailPage() {
  const { slug: slugParam } = useParams();
  const slug = String(slugParam ?? '');
  const navigate = useNavigate();
  const { call } = useForgeApi({ level: 'public' });

  const [catalog, setCatalog] = useState(null);
  // loading / ready / missing（404 或无内容）/ failed
  const [state, setState] = useState('loading');
  const [errorMessage, setErrorMessage] = useState('');

  const load = useCallback(async () => {
    if (!slug) {
      setState('missing');
      return;
    }

    setState('loading');
    setErrorMessage('');
    setCatalog(null);

    const res = await call('api.catalogs.show', { params: { slug } }).catch((error) => ({ error }));

    if (res.error) {
      if (httpStatus(res.error) === 404) {
        setState('missing');
        return;
      }
      setErrorMessage(messageOf(res.error));
      setState('failed');
      return;
    }

    const body = bodyOf(res) ?? {};
    const data = body.data ?? body;
    setCatalog(data);
    setState(data?.id ? 'ready' : 'missing');
  }, [call, slug]);

  // 深链改 slug（如从别本画册分享链接过来）也要重取
  useEffect(() => {
    load();
  }, [load]);

  if (state === 'loading') {
    return (
      <div className="shell py-16">
        <div className="mx-auto max-w-md space-y-4 text-center">
          <p className="text-sm text-gray-500">正在载入画册…</p>
          <Skeleton active style={{ borderRadius: 16 }} paragraph={{ rows: 4 }} />
        </div>
      </div>
    );
  }

  if (state === 'missing') {
    return (
      <div className="shell py-20 text-center">
        <h1 className="text-xl font-semibold text-gray-900">这本画册不存在或已下架</h1>
        <p className="lead mt-2">链接可能过期，也可能画册刚被撤下。可以到列表页看我们当前公开的画册。</p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Button type="primary" shape="round" onClick={() => navigate('/catalogs')}>
            浏览全部画册
          </Button>
          <Button shape="round" onClick={() => navigate('/contact')}>
            联系我们索取
          </Button>
        </div>
      </div>
    );
  }

  if (state === 'failed') {
    return (
      <div className="shell py-20 text-center">
        <h1 className="text-xl font-semibold text-gray-900">画册加载失败</h1>
        <p className="lead mt-2">{errorMessage}</p>
        <div className="mt-8">
          <Button type="primary" shape="round" onClick={load}>
            重新加载
          </Button>
        </div>
      </div>
    );
  }

  const accent = resolveAccent(catalog.theme_color);
  const publishedText = formatDate(catalog.published_at);
  const pages = catalog.pages ?? [];

  return (
    <div>
      {/* 元信息 */}
      <div className="shell pt-8">
        <Link className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-brand-600" to="/catalogs">
          ← 返回画册列表
        </Link>

        <div className="mt-5 flex flex-wrap items-center gap-2 text-xs text-gray-500">
          {catalog.category ? (
            <span className="rounded-full bg-brand-50 px-2 py-0.5 font-medium text-brand-600">{catalog.category.name}</span>
          ) : null}
          <span>{catalog.page_count} 页</span>
          {publishedText ? <span>发布于 {publishedText}</span> : null}
        </div>

        <h1 className="mt-3 text-2xl font-semibold text-gray-900 sm:text-3xl">{catalog.title}</h1>
        {catalog.subtitle ? <p className="mt-2 text-base text-gray-600">{catalog.subtitle}</p> : null}
        {catalog.summary ? <p className="lead mt-4 max-w-3xl">{catalog.summary}</p> : null}
      </div>

      {/* 阅读区：浅灰底衬托「纸」，满幅不受 shell 宽度限制 */}
      <div className="mt-8 bg-gray-100/70 py-8 sm:py-10">
        {pages.length ? (
          <PageFlip pages={pages} accent={accent} catalogTitle={catalog.title} />
        ) : (
          <p className="shell text-center text-sm text-gray-500">这本画册还没有内页，后台补充后即可翻阅。</p>
        )}
      </div>

      {/* 收尾引导 */}
      <div className="shell mt-10 flex flex-wrap items-center justify-between gap-4">
        <p className="lead">需要纸质版或定制版本？告诉我们画册名称即可。</p>
        <Button type="primary" shape="round" onClick={() => navigate('/contact')}>
          联系我们
        </Button>
      </div>
    </div>
  );
}
