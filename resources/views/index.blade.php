<!DOCTYPE html>
{{--
  单页应用的唯一服务端入口：后端不再为每个栏目出一个 Blade 页面，
  这里只负责三件事 —— 注入 forge 摘要、注入 CSRF token、挂载 Vue。
  页面路由（/catalogs/xxx、/manage/messages …）全部由前端 vue-router 维护，
  非 /api、/_forge 的请求都由 routes/web.php 的回退路由落到本文件。
--}}
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>{{ config('app.name', 'Laravel') }} · 企业画册</title>
  <meta name="description" content="route-forge × Laravel × Vue 3 企业画册示例">
  <meta name="theme-color" content="#1668ac">

  {{-- @forgeSummary 放进 <head>、早于 @vite：它输出的是一段一次性 window 访问器脚本
       （defineProperty + 读后即 delete），必须在前端 bundle 求值前就位。
       app.js 是 type=module（defer），放在这里才是契约本意，也避免以后有人改成
       非 defer 脚本时静默失效。 --}}
  @forgeSummary
  @fonts
  {{-- app.css 在前、app.js 在后：UnoCSS 与 Element Plus 的样式随 JS 依赖图注入，
       因此基线变量先落位，工具类后落位（同特异度下后来者胜） --}}
  @vite(['resources/css/app.css', 'resources/js/app.js'])
</head>

{{-- 这几个原子类写在 Blade 里，用于验证 uno.config.js 的 content.filesystem 是否真的扫到了模板 --}}
<body class="bg-white text-gray-800 antialiased">
{{-- #app 内的占位块会在 Vue 挂载时被整体替换，只为避免首屏纯白 --}}
<div id="app">
  <style>
    .boot-loading {
      display: flex;
      min-height: 100vh;
      align-items: center;
      justify-content: center;

      > p {
        font-size: 16px;
        color: #999;
      }
    }
  </style>
  <div class="boot-loading">
    <p>正在加载画册…</p>
  </div>
</div>
<noscript>
  <p class="p-6 text-center text-sm text-gray-500">
    本站内容全部由 Vue 渲染，需要开启 JavaScript 后查看。
  </p>
</noscript>
</body>
</html>
