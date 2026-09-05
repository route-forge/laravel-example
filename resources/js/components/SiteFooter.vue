<script setup>
/**
 * 前台页脚：品牌简介 + 联系方式 + 快速导航 + 备案号。
 *
 * 联系方式全部来自站点基础资料；后台没填的字段整行隐藏，不留「电话：」这类半截标签。
 * 「管理入口」是示例项目的自用链接（访客不该有权限，进到 /manage 会被后台门闩送回登录页），
 * 放在右下角弱化处理。
 */
import { useSiteSettings } from '@/composables/useSiteSettings.js';

const { siteName, intro, contacts, icp } = useSiteSettings();

const year = new Date().getFullYear();
</script>

<template lang="pug">
footer(class='mt-20 border-t border-gray-200 bg-gray-50')
  div(class='shell grid gap-10 py-12 md:grid-cols-3')
    //- 品牌
    div
      h3(class='text-base font-semibold text-gray-900') {{ siteName }}
      p(v-if='intro', class='lead mt-3 line-clamp-4', v-text='intro')
      p(v-else, class='lead mt-3') 在线企业画册示例站，内容全部由后台维护。

    //- 联系方式
    div
      h3(class='text-sm font-semibold text-gray-900') 联系我们
      ul(class='mt-3 space-y-2 text-sm text-gray-600')
        li(v-if='contacts.phone')
          a(class='hover:text-brand-600', :href='"tel:" + contacts.phone', v-text='contacts.phone')
        li(v-if='contacts.email')
          a(class='hover:text-brand-600', :href='"mailto:" + contacts.email', v-text='contacts.email')
        li(v-if='contacts.address', class='leading-6', v-text='contacts.address')
        li(v-if='!contacts.phone && !contacts.email && !contacts.address', class='text-gray-400')
          | 联系方式待后台补充
      router-link(
        v-if='contacts.phone || contacts.email || contacts.address',
        class='mt-3 inline-block text-sm font-medium text-brand-600 hover:text-brand-700',
        :to='{ name: "contact" }'
      ) 在线留言 →

    //- 快速导航
    div
      h3(class='text-sm font-semibold text-gray-900') 快速导航
      ul(class='mt-3 space-y-2 text-sm text-gray-600')
        li
          router-link(class='hover:text-brand-600', :to='{ name: "home" }') 首页
        li
          router-link(class='hover:text-brand-600', :to='{ name: "catalogs" }') 企业画册
        li
          router-link(class='hover:text-brand-600', :to='{ name: "contact" }') 联系我们

  //- 版权与备案
  div(class='border-t border-gray-200')
    div(class='shell flex flex-wrap items-center gap-x-4 gap-y-1 py-4 text-xs text-gray-500')
      span © {{ year }} {{ siteName }}
      span(v-if='icp', v-text='icp')
      router-link(class='ml-auto text-gray-400 hover:text-gray-600', :to='{ name: "manage.dashboard" }') 管理入口
</template>
