import { message } from 'antd';
import { router } from '@/router.jsx';

/**
 * @route-forge/react 的 Provider 配置：把 CSRF 与「会话过期」这两件跨页面的横切关注点
 * 收在这里的声明式拦截器里（React 无 forge.ready() 门闩，也不像 vue 那样命令式 use()）。
 *
 * 摘要来源无需在此指定：Blade 里的 @forgeSummary 已在 window.__ROUTE_FORGE__ 注入一次性摘要，
 * core 会优先读它；manage 层级是 lazy，首次用到时由 core 去 GET /_forge/routes/manage 补明细。
 *
 * interceptors 的每个键只描述「一个」拦截器，写法三选一：函数 / [resolve, reject] 元组 /
 * { resolve, reject } 对象（见 SPEC）。
 */

/** 从 document.cookie 读指定 cookie 值（Laravel 会把 CSRF 以 URL 编码放进 XSRF-TOKEN）。 */
function getCookie(name) {
  const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
  return match ? decodeURIComponent(match[2]) : null;
}

/** 从错误对象里稳健地取 HTTP 状态码：不同适配层分别挂在 response / context / 顶层。 */
function statusOf(error) {
  return error?.response?.status ?? error?.context?.status ?? error?.status ?? null;
}

export default {
  interceptors: {
    // 请求前：实时读 cookie 注入 X-XSRF-TOKEN。
    // ⚠ 不能像 vue 那样从响应头轮换热更新 —— 默认 fetch 适配层拿不到 Set-Cookie（浏览器禁止 JS 读），
    //   而浏览器本身会自动维护 XSRF-TOKEN cookie，故每次请求现读现用最可靠。
    request: (config) => {
      const csrf = getCookie('XSRF-TOKEN');
      if (csrf) {
        config.headers = { ...config.headers, 'X-XSRF-TOKEN': csrf };
      }
      return config;
    },

    // 响应：只做 401 全局兜底 —— 会话过期后任何一次 manage 调用都会到这里，
    // 统一提示并送回登录页；登录页自身不接管（防循环跳转）。
    response: {
      resolve: (response) => response,
      reject: (error) => {
        if (statusOf(error) === 401 && window.location.pathname !== '/manage/login') {
          message.warning('登录已过期，请重新登录');
          router.navigate('/manage/login', { replace: true });
        }
        return Promise.reject(error);
      },
    },
  },
};
