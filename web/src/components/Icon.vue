<template>
  <svg class="ico" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path :d="d" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
  </svg>
</template>
<script setup>
import { computed } from 'vue'
const props = defineProps({ name: { type: String, required: true } })
const paths = {
  home: 'M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1v-9.5Z',
  sale: 'M7 7h10l1 13H6L7 7Zm3-3h4a2 2 0 0 1 2 2v1H8V6a2 2 0 0 1 2-2Zm-.5 9.5h7',
  review: 'M8 4h8a2 2 0 0 1 2 2v14l-3.2-2-2.8 2-2.8-2L6 20V6a2 2 0 0 1 2-2Zm2 5h4M10 12h4',
  journal: 'M7 4h10a2 2 0 0 1 2 2v14H7a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Zm0 0v16M10 8h6M10 12h6M10 16h4',
  rank: 'M8 20V10h3v10H8Zm5 0V6h3v14h-3Zm-10 0v-5h3v5H3Zm2.5-9 3-3 2.2 2.2L16 6',
  team: 'M9 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm7-1a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5ZM4.5 19a4.5 4.5 0 0 1 9 0v1h-9v-1Zm10 .2c.4-1.6 1.6-2.8 3.2-3.3A4 4 0 0 1 21 20v1h-6.5',
  plans: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm0-15v6l4 2',
  kpi: 'M4 19h16M6 16V9m6 7V5m6 11v-4',
  access: 'M12 3 5 6v6c0 4.2 2.9 7.4 7 8.5 4.1-1.1 7-4.3 7-8.5V6l-7-3Zm-3 9 2.2 2.2L16 9.5',
  more: 'M6 12h.01M12 12h.01M18 12h.01',
  logout: 'M10 7V5a1 1 0 0 1 1-1h8v16h-8a1 1 0 0 1-1-1v-2M4 12h10M7 9l-3 3 3 3',
  search: 'm20 20-4.4-4.4M10.5 18a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15Z',
}
const d = computed(() => paths[props.name] || paths.home)
</script>
