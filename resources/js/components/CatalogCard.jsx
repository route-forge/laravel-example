import { Link } from 'react-router';
import { Card, Tag } from 'antd';
import { formatDate, resolveAccent } from '@/support/display.js';

/**
 * 画册卡片：首页与列表页共用，整卡即链接。
 *
 * 消费 api.catalogs.index 列表项形状（不带 pages）：
 *   { id, slug, title, subtitle, summary, cover_image, theme_color, category, page_count, published_at }
 *
 * ⚠ 主题色只能走内联样式：UnoCSS 靠静态扫描类名字面量，变量拼出来的类名产物里不会有规则。
 * 无封面时的「主题色渐变 + 首字巨标 + 细线」装饰面板是示例数据的**主路径**（Seeder 不内置素材），
 * 让占位版面本身成立，而不是看起来像缺图。
 */
export default function CatalogCard({ catalog }) {
  const accent = resolveAccent(catalog.theme_color);
  const publishedText = formatDate(catalog.published_at);
  const pageCount = Number(catalog.page_count) || 0;
  const initial = String(catalog.title ?? '').trim().slice(0, 1);

  const media = catalog.cover_image ? (
    <img src={catalog.cover_image} alt={catalog.title} className="h-full w-full object-cover" loading="lazy" />
  ) : (
    <div
      className="absolute inset-0"
      style={{
        background: `linear-gradient(135deg, ${accent} 0%, ${accent} 45%, rgba(7,42,69,0.85) 100%)`,
      }}
    >
      <span
        className="pointer-events-none absolute right-4 select-none font-serif leading-none text-white/15"
        style={{ bottom: '-1.5rem', fontSize: '9rem' }}
      >
        {initial}
      </span>
      <div className="pointer-events-none absolute inset-x-5 top-5 h-px bg-white/25" />
      <div className="pointer-events-none absolute inset-x-5 h-px bg-white/20" style={{ bottom: '4rem' }} />
    </div>
  );

  const cover = (
    <div className="relative overflow-hidden bg-gray-100" style={{ aspectRatio: '4 / 3' }}>
      {media}
      <div className="absolute left-4 top-4 rounded-full bg-black/35 px-2.5 py-1 text-xs text-white backdrop-blur-sm">
        {pageCount} 页
      </div>
    </div>
  );

  return (
    <Link to={`/catalogs/${catalog.slug}`} className="block h-full">
      <Card
        hoverable
        cover={cover}
        styles={{ body: { padding: '1.25rem', display: 'flex', flexDirection: 'column', flex: '1 1 auto' } }}
        className="flex h-full flex-col"
      >
        <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
          {catalog.category ? (
            <Tag color="blue" className="!m-0">
              {catalog.category.name}
            </Tag>
          ) : (
            <Tag className="!m-0">未分类</Tag>
          )}
          {publishedText ? <span>{publishedText}</span> : null}
        </div>

        <h3 className="mt-2 line-clamp-2 text-base font-semibold text-gray-900">{catalog.title}</h3>
        {catalog.subtitle ? <p className="mt-1 line-clamp-1 text-sm text-gray-500">{catalog.subtitle}</p> : null}
        {catalog.summary ? (
          <p className="mt-2 line-clamp-2 text-sm leading-6 text-gray-600">{catalog.summary}</p>
        ) : null}

        <span className="mt-auto inline-flex items-center gap-1 pt-4 text-sm font-medium text-brand-600">
          开始翻阅 <span aria-hidden="true">→</span>
        </span>
      </Card>
    </Link>
  );
}
