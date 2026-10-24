import { computed, ref, watch } from 'vue'

export const PAGE_SIZES = [20, 50, 100]

export function usePager(listRef, initial = 20) {
  const page = ref(1)
  const size = ref(initial)
  const items = computed(() => listRef.value || [])
  const total = computed(() => items.value.length)
  const pages = computed(() => Math.max(1, Math.ceil(total.value / size.value) || 1))
  const slice = computed(() => {
    const start = (page.value - 1) * size.value
    return items.value.slice(start, start + size.value)
  })
  const from = computed(() => (total.value ? (page.value - 1) * size.value + 1 : 0))
  const to = computed(() => Math.min(page.value * size.value, total.value))
  watch(size, () => {
    page.value = 1
  })
  watch(pages, (n) => {
    if (page.value > n) page.value = n
  })
  function reset() {
    page.value = 1
  }
  return { page, size, sizes: PAGE_SIZES, total, pages, slice, from, to, reset }
}
