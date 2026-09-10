import { createRouteForgePlugin } from '@route-forge/vue';
import router from '@/route.js';

function getCookie(name) {
  const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
  return match ? decodeURIComponent(match[2]) : null;
}

function updateCsrfFromSetCookie(setCookieHeader) {
  if (!setCookieHeader) return false;

  const cookies = Array.isArray(setCookieHeader) ? setCookieHeader : [setCookieHeader];
  const xsrfCookie = cookies.find((cookie) => cookie.startsWith('XSRF-TOKEN='));

  if (!xsrfCookie) return false;

  const match = xsrfCookie.match(/XSRF-TOKEN=([^;]+)/);
  if (!match) return false;

  csrf = decodeURIComponent(match[1]);
  return true;
}

let csrf = getCookie('XSRF-TOKEN');

/**
 * 401 全局兜底：core 的 HTTPError 把 HTTP 状态码放在 context.status。
 * 会话过期后任何一次 manage 调用都会走到这里——统一弹提示并送回登录页，
 * 各页面不再自行处理 401。登录页自身不接管（防循环跳转）。
 */
function handleUnauthorized(error) {
  if (error?.context?.status !== 401) return error;
  if (router.currentRoute.value.name === 'manage.login') return error;

  ElMessage.warning('登录已过期，请重新登录');
  router.replace({ name: 'manage.login' });
  return error;
}

const forge = createRouteForgePlugin();

forge.interceptors.request.use((config) => {
  if (csrf) {
    config.headers = { ...config.headers, 'X-XSRF-TOKEN': csrf };
  }
  return config;
});

forge.interceptors.response.use(
  function (response) {
    updateCsrfFromSetCookie(response.headers['set-cookie']);
    console.log('Response:', response);
    return response;
  },
  function (error) {
    if (error.response) {
      const updated = updateCsrfFromSetCookie(error.response.headers['set-cookie']);
      if (updated) {
        console.log('🔄 XSRF-TOKEN 已从错误响应中更新');
      }
    }

    console.error('Error:', error);
    return Promise.reject(handleUnauthorized(error));
  },
);

export default forge;
