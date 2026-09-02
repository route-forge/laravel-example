<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>@yield('title', config('app.name', 'Laravel'))</title>
  <meta
    name="description"
    content="@yield('description', 'route-forge × Laravel 整合示例 / 企业画册')">
  <meta name="theme-color" content="#1668ac">

  @fonts

  {{-- app.css 在前、app.js 在后：UnoCSS 与 Element Plus 的样式随 JS 依赖图注入，
       因此基线变量先落位，工具类后落位（同特异度下后来者胜） --}}
  @vite(['resources/css/app.css', 'resources/js/app.js'])

  @stack('head')
</head>

{{-- 下面这几个原子类写在 Blade 里，用于验证 uno.config.js 的 content.filesystem 是否真的扫到了模板 --}}
<body class="bg-white text-gray-800 antialiased">
{{-- #app 内的占位块会在 Vue 挂载时被整体替换，只为避免首屏纯白 --}}
<div id="app">
  <div class="flex min-h-screen items-center justify-center">
    <p class="text-sm text-gray-400">正在加载画册…</p>
  </div>
</div>
@forgeSummary
<noscript>
  <p class="p-6 text-center text-sm text-gray-500">
    本页画册内容由 Vue 渲染，需要开启 JavaScript 后查看。
  </p>
</noscript>

@stack('scripts')
</body>
</html>
