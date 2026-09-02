/**
 * Vue 应用入口。
 *
 * import 顺序是刻意安排的 —— CSS 产物顺序 = 模块求值顺序：
 *   1. `vue` 本身不带样式，放最前不影响结果；
 *   2. 求值组件树时，ElementPlusResolver 注入的按需样式（含 ElMessage 等函数式 API 的样式）先落位；
 *   3. 最后注入 `virtual:uno.css`（preflight + 工具类），使工具类排在组件库样式之后 ——
 *      同特异度下后来者胜，`bg-brand-500` 这类才能覆盖 Element Plus 默认值。
 *
 * resources/css/app.css 不在此引入：它是 laravel-vite-plugin 的独立入口，
 * Blade 的 @vite 里已排在最前（见 vite.config.js 的 input）。
 */
import { createApp } from 'vue';
import App from './App.vue';
import 'virtual:uno.css';

createApp(App).mount('#app');
