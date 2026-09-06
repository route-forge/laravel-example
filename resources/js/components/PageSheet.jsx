import './PageSheet.css';
import { resolveAccent, toParagraphs } from '@/support/display.js';

/**
 * 画册内页（单页渲染骨架）。PageFlip 负责「翻」，本组件只负责「这一页长什么样」。
 *
 * 版式按后端白名单分六支：cover / text / split / image / quote / back，
 * 未知值一律降级为 text（与后端同一口径，前后端对「脏数据」处理必须一致）。
 * tone 只有 light / dark，其余值按 light。
 *
 * 尺寸不在这里管：PageFlip 用外层容器决定纸张大小，本组件根节点永远 h-full w-full。
 * ⚠ 主题色是动态值，一律走 style 内联，不进 class。
 */
const KNOWN_LAYOUTS = ['cover', 'text', 'split', 'image', 'quote', 'back'];

export default function PageSheet({ page, catalogTitle = '', accent = '#1668ac', number = null }) {
  const layout = KNOWN_LAYOUTS.includes(page.layout) ? page.layout : 'text';
  const tone = page.tone === 'dark' ? 'dark' : 'light';
  const resolvedAccent = resolveAccent(accent);
  const paragraphs = toParagraphs(page.body);

  // 正文短到一行时的兜底标题：cover/back 用画册名，其余留空
  const heading = page.title || catalogTitle;

  // 无图装饰面板是示例数据的**主路径**（Seeder 不内置版权素材），填了真实 URL 自动切 img
  const artStyle = {
    background: `linear-gradient(150deg, ${resolvedAccent} 0%, ${resolvedAccent} 40%, rgba(7,42,69,0.9) 100%)`,
  };
  const glyph = String(heading ?? '').trim().slice(0, 1) || '册';

  return (
    <div className="sheet" data-layout={layout} data-tone={tone}>
      {layout === 'cover' ? (
        <div className="sheet__pad flex h-full flex-col">
          <div className="flex items-center gap-2 text-[0.6875rem] uppercase opacity-70" style={{ letterSpacing: '0.2em' }}>
            <span className="h-px w-8" style={{ background: resolvedAccent }} />
            <span>COVER</span>
          </div>
          <div className="my-auto">
            <h2 className="sheet__display font-serif leading-tight">{heading}</h2>
            {paragraphs.length ? (
              <p className="mt-5 text-sm leading-7 opacity-80">
                {paragraphs.map((para, i) => (
                  <span key={i} className="block">
                    {para}
                  </span>
                ))}
              </p>
            ) : null}
          </div>
          <div className="text-[0.6875rem] opacity-60">{catalogTitle}</div>
        </div>
      ) : null}

      {layout === 'text' ? (
        <div className="sheet__scroll h-full">
          <div className="sheet__pad">
            {page.title ? <h3 className="sheet__h3">{page.title}</h3> : null}
            <div className="sheet__prose">
              {paragraphs.map((para, i) => (
                <p key={i}>{para}</p>
              ))}
            </div>
            {!paragraphs.length ? <p className="sheet__empty">本页内容待补充</p> : null}
          </div>
        </div>
      ) : null}

      {layout === 'split' ? (
        <div className="flex h-full flex-col">
          <div className="sheet__scroll flex-1">
            <div className="sheet__pad">
              {page.title ? <h3 className="sheet__h3">{page.title}</h3> : null}
              <div className="sheet__prose">
                {paragraphs.map((para, i) => (
                  <p key={i}>{para}</p>
                ))}
              </div>
            </div>
          </div>
          <div className="sheet__figure">
            {page.image ? (
              <img src={page.image} alt={page.title || catalogTitle} loading="lazy" />
            ) : (
              <div style={artStyle}>
                <span className="sheet__glyph font-serif">{glyph}</span>
              </div>
            )}
          </div>
        </div>
      ) : null}

      {layout === 'image' ? (
        <div className="relative h-full">
          {page.image ? (
            <img className="absolute inset-0 h-full w-full object-cover" src={page.image} alt={page.title || catalogTitle} loading="lazy" />
          ) : (
            <div className="absolute inset-0" style={artStyle}>
              <span className="sheet__glyph font-serif">{glyph}</span>
            </div>
          )}
          <div className="sheet__overlay absolute inset-x-0 bottom-0">
            {page.title ? <h3 className="text-base font-semibold">{page.title}</h3> : null}
            {page.body ? <p className="mt-1 text-xs leading-6 opacity-85">{page.body}</p> : null}
          </div>
        </div>
      ) : null}

      {layout === 'quote' ? (
        <div className="sheet__pad flex h-full flex-col justify-center">
          <span className="font-serif text-5xl leading-none" style={{ color: resolvedAccent }}>
            “
          </span>
          <blockquote className="mt-3 font-serif text-xl leading-relaxed sm:text-2xl">
            {paragraphs.map((para, i) => (
              <p key={i} className={i === 0 ? 'mt-0' : 'mt-3'}>
                {para}
              </p>
            ))}
          </blockquote>
          {page.title ? (
            <footer className="mt-6 flex items-center gap-2 text-xs opacity-70">
              <span className="h-px w-6" style={{ background: resolvedAccent }} />
              <span>{page.title}</span>
            </footer>
          ) : null}
        </div>
      ) : null}

      {layout === 'back' ? (
        <div className="sheet__pad flex h-full flex-col">
          <div className="my-auto">
            <h2 className="sheet__display font-serif leading-tight">{heading}</h2>
            {paragraphs.length ? (
              <p className="mt-4 text-sm leading-7 opacity-80">
                {paragraphs.map((para, i) => (
                  <span key={i} className="block">
                    {para}
                  </span>
                ))}
              </p>
            ) : null}
          </div>
          <div className="flex items-end justify-between text-[0.6875rem] opacity-60">
            <span>{catalogTitle}</span>
            <span>END</span>
          </div>
        </div>
      ) : null}

      {/* 页码（补白页不渲染） */}
      {number ? <span className="sheet__num">{number}</span> : null}
    </div>
  );
}
