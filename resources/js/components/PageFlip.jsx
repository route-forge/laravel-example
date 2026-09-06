import './PageFlip.css';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Button, Progress, Select } from 'antd';
import { LeftOutlined, RightOutlined } from '@ant-design/icons';
import PageSheet from '@/components/PageSheet.jsx';

/**
 * 翻页阅读器：宽屏两页对开、窄屏单页，翻阅过程零请求。
 *
 * 输入是 api.catalogs.show 一次带出的整本 pages（已按 sort_order 排好），
 * 「翻页」纯本地游标移动，不触碰 forge。三件刻意的事（同 vue 分支）：
 * 1. 不引入 page-flip 类三方库（~20kB + 自管翻页期光栅），方向感过渡足以表达「翻」的语义；
 * 2. 对开/单页决定的是「渲染几张纸」这个逻辑，必须用 matchMedia 参与，断点与 UnoCSS lg 对齐；
 * 3. 切视口时保持当前那张纸可见（normalizeCursor），否则从对开缩到单页会莫名跳页。
 */
const SPREAD_QUERY = '(min-width: 1024px)';
const SWIPE_MIN = 48;

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

function useMediaQuery(query) {
  const [matches, setMatches] = useState(() => window.matchMedia(query).matches);
  useEffect(() => {
    const mql = window.matchMedia(query);
    const handler = (e) => setMatches(e.matches);
    mql.addEventListener('change', handler);
    setMatches(mql.matches);
    return () => mql.removeEventListener('change', handler);
  }, [query]);
  return matches;
}

export default function PageFlip({ pages, accent = '#1668ac', catalogTitle = '' }) {
  const isSpread = useMediaQuery(SPREAD_QUERY);
  const [cursor, setCursor] = useState(0);
  const [direction, setDirection] = useState(1); // 1 向后翻 / -1 向前翻

  const total = pages.length;
  const perSpread = isSpread ? 2 : 1;
  // 对开且总页数为奇数时，最后一跨是「1 页真 + 1 页补白」，按左页位置取整
  const maxCursor = isSpread
    ? Math.floor(Math.max(0, total - 1) / 2) * 2
    : Math.max(0, total - 1);
  const spreadCount = Math.max(1, Math.floor(maxCursor / 2) + 1);

  /** 当前一跨要渲染的纸：null = 补白页（不渲染页码、不可翻出去） */
  const sheets = useMemo(() => {
    const result = [];
    for (let offset = 0; offset < perSpread; offset += 1) {
      const index = cursor + offset;
      result.push(
        index < total
          ? { key: pages[index].id ?? index, page: pages[index], number: index + 1 }
          : null,
      );
    }
    return result;
  }, [pages, cursor, perSpread, total]);

  const filled = sheets.filter(Boolean);
  const lastVisibleNumber = filled.length ? filled[filled.length - 1].number : 0;
  const progress = total ? Math.round((lastVisibleNumber / total) * 100) : 0;
  const positionText = useMemo(() => {
    if (!total) return '0 / 0';
    if (!isSpread) return `${cursor + 1} / ${total}`;
    const from = filled.length ? filled[0].number : cursor + 1;
    return `${from}–${lastVisibleNumber} / ${total}`;
  }, [total, isSpread, cursor, filled, lastVisibleNumber]);

  const turn = useCallback(
    (step) => {
      const target = clamp(cursor + step * perSpread, 0, maxCursor);
      if (target === cursor) return;
      setDirection(step > 0 ? 1 : -1);
      setCursor(target);
    },
    [cursor, perSpread, maxCursor],
  );

  const goTo = useCallback(
    (index) => {
      const target = clamp(Number(index) || 0, 0, Math.max(0, total - 1));
      setDirection(target >= cursor ? 1 : -1);
      setCursor(isSpread ? Math.floor(target / 2) * 2 : target);
    },
    [cursor, total, isSpread],
  );

  // 换视口：把游标收进合法范围并对齐到跨页左页，避免跳页
  useEffect(() => {
    setCursor((c) => {
      let next = clamp(c, 0, maxCursor);
      if (isSpread) next = Math.floor(next / 2) * 2;
      return next;
    });
  }, [isSpread, maxCursor]);

  // 换书时回到开头
  useEffect(() => {
    setCursor(0);
    setDirection(1);
  }, [pages]);

  // 键盘翻页；表单与可编辑区域里方向键属于原生行为，不能抢
  useEffect(() => {
    function onKeydown(event) {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      const target = event.target;
      if (target?.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target?.tagName)) return;

      if (event.key === 'ArrowRight' || event.key === 'PageDown' || event.key === ' ') {
        event.preventDefault();
        turn(1);
      } else if (event.key === 'ArrowLeft' || event.key === 'PageUp') {
        event.preventDefault();
        turn(-1);
      } else if (event.key === 'Home') {
        event.preventDefault();
        goTo(0);
      } else if (event.key === 'End') {
        event.preventDefault();
        goTo(total - 1);
      }
    }

    window.addEventListener('keydown', onKeydown);
    return () => window.removeEventListener('keydown', onKeydown);
  }, [turn, goTo, total]);

  const touchStartX = useRef(0);
  function onTouchStart(event) {
    touchStartX.current = event.changedTouches[0]?.clientX ?? 0;
  }
  function onTouchEnd(event) {
    const delta = (event.changedTouches[0]?.clientX ?? 0) - touchStartX.current;
    if (Math.abs(delta) < SWIPE_MIN) return;
    turn(delta < 0 ? 1 : -1); // 手指向右 = 往回翻
  }

  return (
    <div>
      <div
        className="flip__stage"
        data-mode={isSpread ? 'spread' : 'single'}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        <div
          key={`${cursor}-${isSpread ? 'd' : 's'}`}
          className={`flip__spread ${direction >= 0 ? 'flip-enter-next' : 'flip-enter-prev'}`}
        >
          {sheets.map((sheet, slot) =>
            sheet ? (
              <div key={slot} className="flip__sheet">
                <PageSheet
                  page={sheet.page}
                  number={sheet.number}
                  accent={accent}
                  catalogTitle={catalogTitle}
                />
              </div>
            ) : (
              <div key={slot} className="flip__sheet flip__sheet--blank">
                本页留白
              </div>
            ),
          )}
        </div>
      </div>

      {/* 控制条 */}
      <div className="flip__bar">
        <Button shape="circle" icon={<LeftOutlined />} disabled={cursor <= 0} title="上一页（←）" onClick={() => turn(-1)} />

        <div className="flip__meta">
          <div className="flex items-baseline justify-between gap-3 text-xs text-gray-500">
            <span>
              第 {positionText} 页
              {isSpread ? <span className="ml-2 text-gray-400">共 {spreadCount} 跨</span> : null}
            </span>
            <span>{progress}%</span>
          </div>
          <Progress percent={progress} showInfo={false} strokeColor={accent} size="small" />
        </div>

        <div className="flip__toc">
          <Select
            style={{ width: '100%' }}
            placeholder="跳转到页"
            value={cursor}
            onChange={goTo}
            options={pages.map((page, index) => ({
              value: index,
              label: `${index + 1}. ${page.title || '（无标题）'}`,
            }))}
          />
        </div>

        <Button
          shape="circle"
          icon={<RightOutlined />}
          disabled={cursor >= maxCursor}
          title="下一页（→）"
          onClick={() => turn(1)}
        />
      </div>

      <p className="mt-3 text-center text-xs text-gray-400">
        键盘 ← / → 翻页，Home / End 回首页与末页{isSpread ? '' : '，屏幕左右滑动同样可翻'}
      </p>
    </div>
  );
}
