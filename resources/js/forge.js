import { createRouteForgePlugin } from '@route-forge/vue';

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

export default createRouteForgePlugin({
  interceptors: {
    request: [
      (config) => {
        if (csrf) {
          config.headers = { ...config.headers, 'X-XSRF-TOKEN': csrf };
        }
        return config;
      },
    ],
    response: [
      (response) => {
        updateCsrfFromSetCookie(response.headers['set-cookie']);
        console.log('Response:', response);
        return response;
      },
      (error) => {
        if (error.response) {
          const updated = updateCsrfFromSetCookie(error.response.headers['set-cookie']);
          if (updated) {
            console.log('🔄 XSRF-TOKEN 已从错误响应中更新');
          }
        }

        console.error('Error:', error);
        return Promise.reject(error);
      },
    ],
  },
});
