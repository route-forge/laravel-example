/**
 * 站点基础资料（api.site.show）的前台共享状态。
 *
 * 收在一处的理由：站点名称 / Logo / 联系方式同时被页头、页脚、首页、联系页要，
 * 各组件自己 call() 会让同一个请求在首屏重复发四次。这里是「模块级单例 + 首次调用触发」：
 *
 *   status: idle → loading → ready | failed
 *   site  : null → 后端 SiteSettingResource 的字段对象
 *
 * 降级口径（与 route-forge 的「校验必抛错」不冲突）：
 *   - 站点资料是展示型数据，取不到时页头用默认站名占位、页脚隐藏缺失行，**不白屏**；
 *     「校验必抛错」管的是路由名/参数写错这类开发期错误，运行时网络失败不在其列。
 *   - 真正的业务取数（画册列表 / 详情 / 提交留言）不走这里，仍按 call() 的 error 分支
 *     明确报错并可重试 —— 那些地方静默降级等于骗访客「内容就是这些」。
 *
 * ⚠ useForgeApi 内部依赖 inject，必须在组件 setup 期间调用，因此本组合式只能在 setup 里用。
 */
import { computed, reactive } from 'vue';
import { useForgeApi } from '@route-forge/vue';
import { bodyOf, messageOf } from '@/support/api.js';

export const DEFAULT_SITE_NAME = '企业画册';

const state = reactive({ status: 'idle', site: null, error: null });

/** @typedef {ReturnType<typeof useSiteSettings>} SiteSettingsView */
export function useSiteSettings() {
  const { call } = useForgeApi('public');

  async function load(force) {
    if (state.status === 'loading') return;
    if (state.status === 'ready' && !force) return;

    state.status = 'loading';

    const res = await call('api.site.show').catch((error) => ({ error }));

    if (res.error) {
      state.status = 'failed';
      state.error = res.error;
      // 留痕但不打扰访客：页头页脚会退化，控制台里能查到原因
      console.warn('[site] 站点基础资料加载失败，前台使用占位内容：', messageOf(res.error));
      return;
    }

    state.site = bodyOf(res) ?? null;
    state.status = 'ready';
  }

  // 同步置为 loading，保证同一帧内后挂载的组件不会重复发请求
  if (state.status === 'idle') load(false);

  const site = computed(() => state.site);

  return {
    site,
    status: computed(() => state.status),
    ready: computed(() => state.status === 'ready'),
    /** 占位后的站名：页头 / 页脚 / 标题一律用它，避免出现空白品牌位 */
    siteName: computed(() => site.value?.site_name || DEFAULT_SITE_NAME),
    slogan: computed(() => site.value?.brand_slogan || ''),
    logoUrl: computed(() => site.value?.logo_url || ''),
    intro: computed(() => site.value?.intro || ''),
    /** 联系方式三件套：任一为空则对应行整行隐藏，不留「电话：」这种半截标签 */
    contacts: computed(() => ({
      phone: site.value?.contact_phone || '',
      email: site.value?.contact_email || '',
      address: site.value?.contact_address || '',
    })),
    icp: computed(() => site.value?.icp || ''),
    reload: () => load(true),
  };
}
