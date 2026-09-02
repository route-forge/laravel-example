<template lang="pug">
header(class='sticky top-0 z-10 border-b border-gray-200 bg-white/85 backdrop-blur')
  div(class='shell flex h-16 items-center justify-between gap-4')
    div(class='flex items-center gap-2.5')
      div(class='grid h-8 w-8 place-items-center rounded-lg bg-brand-500 font-semibold text-white') R
      span(class='text-base font-semibold text-gray-900') {{ brand }}
    nav(class='hidden items-center gap-7 text-sm text-gray-600 md:flex')
      a(class='nav-link', href='#features') 能力
      a(class='nav-link', href='#next') 下一步
    el-button(size='small', type='primary', @click='emit("contact")') 联系
</template>

<script setup>
defineProps({
  brand: { type: String, default: '企业画册' },
});

const emit = defineEmits(['contact']);
</script>

<style scoped>
.nav-link {
  @apply transition-colors hover:text-brand-600;
}
</style>
