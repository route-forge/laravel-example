import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';
import laravel from 'laravel-vite-plugin';
import { bunny } from 'laravel-vite-plugin/fonts';
import UnoCSS from 'unocss/vite';
import react from '@vitejs/plugin-react';

/**
 * 前端构建插件链（执行顺序即文档 05 约定的顺序，别随意调换）：
 *
 *   laravel  →  UnoCSS  →  react
 *
 * - laravel：与 Blade 的 @vite 指令协同，提供 HMR 与 Blade/路由文件变动刷新；
 *   入口从共享基座的 app.js 换成 React 的 app.jsx。
 * - UnoCSS：扫描 blade + jsx/js 源码，把原子类转成 CSS（配置见 uno.config.js）。
 * - react：编译 JSX + Fast Refresh（组件级热替换、保留 state）。
 *
 * 注：文档 05 提到的 @ant-design/vite-plugin（antd 按需优化）在 npm 上并不存在，
 * 且 antd v5 本身是 CSS-in-JS + ESM 包，产物只含用到的组件样式，无需该插件即可 tree-shake。
 */
export default defineConfig({
    plugins: [
        laravel({
            input: ['resources/css/app.css', 'resources/js/app.jsx'],
            refresh: true,
            fonts: [
                bunny('Instrument Sans', {
                    weights: [400, 500, 600],
                }),
            ],
        }),

        UnoCSS(),

        react(),
    ],

    resolve: {
        alias: {
            '@': fileURLToPath(new URL('./resources/js', import.meta.url)),
        },
    },

    server: {
        watch: {
            ignored: ['**/storage/framework/views/**'],
        },
    },
});
