import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';
import laravel from 'laravel-vite-plugin';
import { bunny } from 'laravel-vite-plugin/fonts';
import UnoCSS from 'unocss/vite';
import Vue from '@vitejs/plugin-vue';
import AutoImport from 'unplugin-auto-import/vite';
import Components from 'unplugin-vue-components/vite';
import { ElementPlusResolver } from 'unplugin-vue-components/resolvers';

export default defineConfig({
  plugins: [
    laravel({
      input: ['resources/css/app.css', 'resources/js/app.js'],
      refresh: true,
      fonts: [
        bunny('Instrument Sans', {
          weights: [400, 500, 600],
        }),
      ],
    }),

    UnoCSS(),

    Vue(),

    // 自动导入：只服务「无法在模板里解析」的 API —— Element Plus 的函数式调用
    // （ElMessage / ElMessageBox / ElLoading）及其样式。
    // 刻意不预设 imports: ['vue']：ref/computed 等保持显式 import，源码可读性优先。
    AutoImport({
      resolvers: [ElementPlusResolver()],
      // 【坑】dts 必须给绝对路径：传相对路径时 unplugin 实测仍把文件写到项目根目录，
      // 且不报错、不创建目标子目录。
      dts: fileURLToPath(new URL('./resources/js/types/auto-imports.d.ts', import.meta.url)),
    }),

    // 组件按需引入：模板里的 <el-xxx> 与自定义组件零 import，
    // 样式由 resolver 注入 element-plus/es/components/<name>/style/css（不需要全量 CSS）。
    // directives: true（默认）让 v-loading 之类的指令同样按需解析。
    Components({
      resolvers: [ElementPlusResolver()],
      dirs: ['resources/js/components'],
      extensions: ['vue'],
      dts: fileURLToPath(new URL('./resources/js/types/components.d.ts', import.meta.url)),
    }),
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
