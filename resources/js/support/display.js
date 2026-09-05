/**
 * 前台展示层的零依赖小工具：日期与正文预处理。
 *
 * 为什么要单列一个文件：画册卡片、详情页页头、翻页内页三处都要「把后端字段变成能看的文字」，
 * 各自内联会让同一口径出现三份副本（后端 published_at 是 ISO8601，不是文档里设想 YYYY-MM-DD）。
 */

/**
 * ISO8601 → `2026年3月15日`。
 *
 * 空值 / 非法值返回空串，由调用方决定隐藏整行还是显示占位 —— 这里不返回「未知日期」，
 * 因为把兜底文案塞进格式化函数会让调用方失去选择权。
 *
 * @param {string | null | undefined} value
 * @returns {string}
 */
export function formatDate(value) {
  if (!value) return '';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';

  return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`;
}

/**
 * 把后端正文切成段落。
 *
 * 当前 catalog_pages.body 是纯文本（Seeder 与后台表单都没有富文本编辑器），因此前台
 * 按「空行分段 + 单个换行保留」渲染，**不使用 v-html** —— 一旦哪天要上富文本，
 * 必须显式改造这里（并配服务端净化），不能让 v-html 悄悄长在模板里。
 *
 * @param {string | null | undefined} text
 * @returns {string[]} 段落数组；无内容时为空数组
 */
export function toParagraphs(text) {
  if (!text) return [];

  return String(text)
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
}

/**
 * 校验并归一化主题色（后端 rules 已是 `#rrggbb`，此处只防脏数据/旧数据）。
 *
 * @param {string | null | undefined} value
 * @param {string} fallback
 * @returns {string}
 */
export function resolveAccent(value, fallback = '#1668ac') {
  return /^#[0-9a-fA-F]{6}$/.test(String(value ?? '')) ? value : fallback;
}
