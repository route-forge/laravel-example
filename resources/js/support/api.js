/**
 * forge.api() 返回值的拆包工具。
 *
 * 层次一共三层，别搞混：
 *   call() → { data, error }            ← useForgeApi 的状态壳
 *   data   → ResponseData               ← @route-forge/core 的响应对象（status/headers/data…）
 *   data.data → Laravel 响应体           ← API Resource 的 { data, meta, links } 信封
 *
 * 所以「业务数据」永远在 res.data.data。这里集中拆一次，组件里就不出现三层 .data 的写法。
 * （口径与 vue 分支 support/api.js 完全一致。）
 */

/** @typedef {{ data: unknown, error: unknown }} CallResult useForgeApi.call() 的返回 */

/**
 * 取出 HTTP 响应体（Laravel 侧 json()/Resource 的输出）。
 * @param {CallResult} result
 */
export function bodyOf(result) {
  return result?.data?.data ?? null;
}

/**
 * 取出分页型 Resource 的列表 + meta + links。
 * @param {CallResult} result
 */
export function pageOf(result) {
  const body = bodyOf(result) ?? {};

  return {
    items: Array.isArray(body.data) ? body.data : [],
    meta: body.meta ?? {},
    links: body.links ?? {},
  };
}

/**
 * 从错误对象里取一句能给人看的话。
 *
 * ⚠ 已知限制：@route-forge/core 的 HTTP 适配层在非 2xx 时抛的 HTTPError 只携带
 * status/route/url 等元信息，**不含响应体**，因此 Laravel 的 422 errors 字段目前到不了前端。
 * 本项目的对策是：表单在前端先按同一套规则校验，服务端 422 只作为兜底提示；
 * 要真正回显字段级错误，得在 core 侧把响应体挂到 HTTPError 上（已记为待议项）。
 *
 * @param {unknown} error
 */
export function messageOf(error) {
  if (!error) return '';
  if (typeof error === 'string') return error;
  if (error instanceof Error && error.message) return error.message;

  return '请求未能完成，请稍后重试。';
}
