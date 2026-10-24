<template>
  <div class="period" :class="{ wrap: long }">
    <button v-for="p in list" :key="p.id" :class="{ on: modelValue === p.id }" @click="$emit('update:modelValue', p.id)">
      {{ p.label }}
    </button>
  </div>
</template>
<script setup>
import { computed } from 'vue'
const props = defineProps({
  modelValue: { type: String, default: 'week' },
  items: { type: Array, default: null },
})
defineEmits(['update:modelValue'])
const list = computed(
  () =>
    props.items || [
      { id: 'day', label: 'День' },
      { id: 'week', label: 'Неделя' },
      { id: 'month', label: 'Месяц' },
      { id: 'year', label: 'Год' },
    ],
)
const long = computed(() => list.value.some((p) => String(p.label).length > 8))
</script>
