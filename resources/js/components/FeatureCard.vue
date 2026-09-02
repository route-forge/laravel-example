<template lang="pug">
div(class='surface h-full')
  div(class='flex items-start justify-between gap-3')
    h3(class='text-base font-semibold text-gray-900') {{ title }}
    el-tag(size='small', type='success', effect='plain') done
  p(class='card-desc mt-2') {{ desc }}
  el-progress(class='mt-4', :percentage='progress', :stroke-width='6', :show-text='false')
  slot
</template>

<script setup>
defineProps({
  title: { type: String, required: true },
  desc: { type: String, default: '' },
  progress: { type: Number, default: 0 },
});
</script>

<style scoped>
/* 命名避开 shortcut `lead`，防止同一类名两处来源 */
.card-desc {
  @apply text-sm leading-6 text-gray-600;
}
</style>
