<template>
  <div class="pager" v-if="total > 20 || pages > 1">
    <label class="pager-size">
      По
      <Select
        mini
        :model-value="size"
        :options="sizeOpts"
        @update:model-value="setSize"
      />
    </label>
    <span>{{ from }}–{{ to }} из {{ total }}</span>
    <div class="pager-pages">
      <button type="button" :disabled="page <= 1" @click="go(page - 1)" aria-label="Назад">
        <svg viewBox="0 0 12 12" aria-hidden="true"><path d="M7.8 2.2 4 6l3.8 3.8" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" /></svg>
      </button>
      <button
        v-for="n in nums"
        :key="n"
        type="button"
        :class="{ on: n === page }"
        @click="go(n)"
      >
        {{ n }}
      </button>
      <button type="button" :disabled="page >= pages" @click="go(page + 1)" aria-label="Вперёд">
        <svg viewBox="0 0 12 12" aria-hidden="true"><path d="M4.2 2.2 8 6l-3.8 3.8" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" /></svg>
      </button>
    </div>
  </div>
</template>
<script setup>
import { computed } from 'vue'
import { PAGE_SIZES } from '../lib/pager.js'
import Select from './Select.vue'
const props = defineProps({
  page: { type: Number, default: 1 },
  size: { type: Number, default: 20 },
  total: { type: Number, default: 0 },
  pages: { type: Number, default: 1 },
  from: { type: Number, default: 0 },
  to: { type: Number, default: 0 },
  sizes: { type: Array, default: () => PAGE_SIZES },
})
const emit = defineEmits(['update:page', 'update:size'])
const nums = computed(() => {
  const last = Math.max(1, props.pages)
  if (last <= 7) return Array.from({ length: last }, (_, i) => i + 1)
  const cur = props.page
  let start = Math.max(1, cur - 2)
  let end = Math.min(last, start + 4)
  start = Math.max(1, end - 4)
  return Array.from({ length: end - start + 1 }, (_, i) => start + i)
})
function scrollList() {
  const main = document.querySelector('.main')
  if (main && getComputedStyle(main).overflowY !== 'visible') {
    main.scrollTo({ top: 0 })
    return
  }
  globalThis.scrollTo({ top: 0 })
}
function go(n) {
  const next = Math.min(Math.max(1, n), Math.max(1, props.pages))
  if (next === props.page) return
  emit('update:page', next)
  scrollList()
}
const sizeOpts = computed(() => props.sizes.map((n) => ({ value: n, label: String(n) })))
function setSize(n) {
  emit('update:size', Number(n))
}
</script>
