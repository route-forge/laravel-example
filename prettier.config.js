/**
 * Prettier 配置。
 *
 * 与 .editorconfig 的关系：Prettier 3 的 CLI 默认读取 .editorconfig，且其中的
 * indent_size 会覆盖下面的 tabWidth —— 所以两份文件的缩进必须一致
 * （已在 .editorconfig 里为 js/ts/jsx/tsx/vue/pug/json/css/html/blade.php 统一为 2）。
 *
 * @prettier/plugin-pug 负责 `.pug` 文件与 SFC 内 `<template lang="pug">` 的格式化。
 * pug 是缩进敏感语言，自动重排存在把嵌套结构改坏的风险，因此：
 *   - 不启用 `pugExplicitParens`/`pugClassLocation` 等会改写选择器书写习惯的选项；
 *   - 跑 `pnpm run format` 后必须看一次 git diff，确认 pug 块只动了空白。
 *
 * @type {import('prettier').Config}
 */
export default {
  printWidth: 100,
  tabWidth: 2,
  useTabs: false,
  semi: true,
  singleQuote: true,
  quoteProps: 'as-needed',
  trailingComma: 'all',
  bracketSpacing: true,
  bracketSameLine: false,
  arrowParens: 'always',
  endOfLine: 'lf',
  htmlWhitespaceSensitivity: 'css',
  vueIndentScriptAndStyle: false,
  plugins: ['@prettier/plugin-pug'],
  // 【关键】强制 class 以属性形式输出，禁止 `.a.b` 简写。
  // 默认值 literal 会把 class="a b" 折叠成简写，而 UnoCSS 默认提取器不按点号切 token，
  // 整串 `h2.text-2xl.font-semibold.text-gray-900` 会被当成一个未知类名 ——
  // 实测表现是这排工具类在产物 CSS 里静默全部消失（本项目 CSS 曾因此少 3 kB），
  // 只在提取结果里留痕，构建不报错。属性形式还顺带规避了 `md:py-20`、`bg-white/85`
  // 这类含冒号/斜杠的值被 pug 解析器误判的问题。可选值：literal | attribute | as-is。
  pugClassNotation: 'attribute',
  overrides: [
    {
      files: ['*.pug', '*.jade'],
      options: { parser: 'pug' },
    },
    {
      files: ['*.md'],
      options: { proseWrap: 'preserve', embeddedLanguageFormatting: 'off' },
    },
  ],
};
