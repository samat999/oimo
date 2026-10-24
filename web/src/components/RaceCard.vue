<template>
  <component :is="href ? 'router-link' : 'div'" class="race" v-if="week || month" :to="href">
    <div class="race-main">
      <small>Лучший продавец недели</small>
      <h3>{{ week?.name || 'Пока без лидера' }}</h3>
      <p v-if="week">{{ week.pieces }} подтверждённых продаж</p>
    </div>
    <div class="race-sub" v-if="month">
      Лучший месяца · {{ month.name }} · {{ month.pieces }} шт
    </div>
  </component>
</template>
<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { can } from '../api.js'
const props = defineProps({
  week: { type: Object, default: null },
  month: { type: Object, default: null },
})
const route = useRoute()
const href = computed(() => {
  const w = props.week
  if (!w) return ''
  if (can('rank') && route.path !== '/rank') return '/rank'
  if (can('team') && w.userId) return '/owner/team/' + w.userId
  if (can('rank')) return '/rank'
  return ''
})
</script>
