@extends('layout')

@section('title', '企业画册 · ' . config('app.name', 'Laravel'))

@section('description', 'Laravel + Vue 3 + UnoCSS + Pug + Element Plus 按需引入整合示例')

{{-- 页面内容全部由 resources/js/App.vue 渲染：
     本轮只交付前端基座，栏目结构与内容模型（含 route-forge 命名路由）在后续轮次落地 --}}
