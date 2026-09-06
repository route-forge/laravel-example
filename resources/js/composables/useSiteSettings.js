import { useCallback, useEffect, useMemo, useSyncExternalStore } from 'react';
import { useForgeApi } from '@route-forge/react';
import { bodyOf, messageOf } from '@/support/api.js';

export const DEFAULT_SITE_NAME = '企业画册';

/**
 * 站点基础资料（api.site.show）的前台共享状态 —— 模块级单例，口径同 vue 分支：
 * 站名 / Logo / 联系方式同时被页头、页脚、首页、联系页消费，各自取数会让同一请求首屏发四次。
 *
 * 降级口径（与 route-forge「校验必抛错」不冲突）：站点资料是展示型数据，取不到时页头用
 * 占位站名、页脚隐藏缺失行，不白屏；真正的业务取数（画册 / 留言）不走这里，仍按 call() 的
 * error 分支明确报错并可重试。
 *
 * React 化说明：状态存在模块作用域，组件经 useSyncExternalStore 订阅；requested 标志让
 * StrictMode 的双调用也只发一次请求。
 */
let store = { status: 'idle', site: null, error: null };
let requested = false;
const listeners = new Set();

function setStore(patch) {
  store = { ...store, ...patch };
  listeners.forEach((notify) => notify());
}

function subscribe(notify) {
  listeners.add(notify);
  return () => listeners.delete(notify);
}

async function fetchSite(call, { force = false } = {}) {
  if (store.status === 'loading') return;
  if (store.status === 'ready' && !force) return;

  setStore({ status: 'loading' });

  const res = await call('api.site.show').catch((error) => ({ error }));

  if (res.error) {
    // 留痕但不打扰访客：页头页脚会退化，控制台里能查到原因
    console.warn('[site] 站点基础资料加载失败，前台使用占位内容：', messageOf(res.error));
    setStore({ status: 'failed', error: res.error });
    return;
  }

  // 单资源信封为 { data: {...} }，防御性兼容直接返回对象的情况
  const body = bodyOf(res) ?? {};
  setStore({ status: 'ready', site: body.data ?? body, error: null });
}

export function useSiteSettings() {
  const { call } = useForgeApi({ level: 'public' });
  const snap = useSyncExternalStore(
    subscribe,
    () => store,
    () => store,
  );

  useEffect(() => {
    if (requested) return;
    requested = true;
    fetchSite(call);
  }, [call]);

  const reload = useCallback(() => fetchSite(call, { force: true }), [call]);

  return useMemo(() => {
    const site = snap.site;

    return {
      site,
      status: snap.status,
      ready: snap.status === 'ready',
      /** 占位后的站名：页头 / 页脚 / 标题一律用它，避免出现空白品牌位 */
      siteName: site?.site_name || DEFAULT_SITE_NAME,
      slogan: site?.brand_slogan || '',
      logoUrl: site?.logo_url || '',
      intro: site?.intro || '',
      /** 联系方式三件套：任一为空则对应行整行隐藏，不留「电话：」这种半截标签 */
      contacts: {
        phone: site?.contact_phone || '',
        email: site?.contact_email || '',
        address: site?.contact_address || '',
      },
      icp: site?.icp || '',
      reload,
    };
  }, [snap, reload]);
}
