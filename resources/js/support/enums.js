/**
 * 管理端共享枚举与文案映射（值口径严格对齐后端模型常量）：
 *   Catalog: draft / published
 *   CatalogPage: LAYOUTS = cover,text,split,image,quote,back；TONES = light,dark
 *   ContactMessage: new,read,replied,archived
 *
 * 单列一份的原因同 vue 分支：同一套标签/正则在多个页面复用，内联会散成多份副本。
 */

export const BRAND_COLOR = '#1668ac';

/** slug 规则：小写字母/数字，段间单个连字符（与后端 regex 一致）。 */
export const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;

/** 主题色：#rrggbb（与后端 regex 一致）。 */
export const HEX_COLOR_PATTERN = /^#[0-9a-fA-F]{6}$/;

export const CATALOG_STATUS_OPTIONS = [
  { value: 'draft', label: '草稿' },
  { value: 'published', label: '已发布' },
];

export const LAYOUT_LABELS = {
  cover: '封面',
  text: '纯文本',
  split: '图文分栏',
  image: '大图',
  quote: '引用',
  back: '封底',
};

/** 版式下拉顺序即后端 LAYOUTS 顺序。 */
export const LAYOUT_OPTIONS = ['cover', 'text', 'split', 'image', 'quote', 'back'].map((v) => ({
  value: v,
  label: LAYOUT_LABELS[v],
}));

export const TONE_OPTIONS = [
  { value: 'light', label: '浅色' },
  { value: 'dark', label: '深色' },
];

/** 留言状态 → Tag 颜色 + 文案。 */
export const MESSAGE_STATUS_META = {
  new: { label: '未读', color: 'error' },
  read: { label: '已读', color: 'default' },
  replied: { label: '已回复', color: 'success' },
  archived: { label: '已归档', color: 'warning' },
};

export const MESSAGE_STATUS_OPTIONS = ['new', 'read', 'replied', 'archived'].map((v) => ({
  value: v,
  label: MESSAGE_STATUS_META[v].label,
}));

export function messageStatusMeta(status) {
  return MESSAGE_STATUS_META[status] ?? { label: status, color: 'default' };
}
