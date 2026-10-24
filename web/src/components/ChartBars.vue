<template>
  <div class="chart-wrap">
    <div class="chart" :style="{ gridTemplateColumns: 'repeat(' + (rows.length || 1) + ', minmax(0, 1fr))' }">
      <div v-for="x in rows" :key="x.date" class="col" :class="{ pick: pick?.date === x.date }" tabindex="0" @click="pick = x">
        <div class="tip">
          <b>{{ title(x) }}</b>
          <span>План: {{ x.plan || 0 }} шт</span>
          <span>Факт: {{ x.count || 0 }} шт</span>
        </div>
        <i class="plan" :style="{ height: h(x.plan) }" />
        <i class="fact" :style="{ height: h(x.count) }" />
      </div>
    </div>
    <div class="axis" :style="{ gridTemplateColumns: 'repeat(' + (rows.length || 1) + ', minmax(0, 1fr))' }">
      <span v-for="x in rows" :key="'a' + x.date">{{ x.label }}</span>
    </div>
    <div v-if="pick" class="chart-note">
      <b>{{ title(pick) }}</b>
      факт {{ pick.count || 0 }} шт · план {{ pick.plan || 0 }} шт
    </div>
    <div class="legend"><span><b class="plan" />план на день</span><span><b class="fact" />факт</span></div>
  </div>
</template>
<script setup>
import { ref, watch } from 'vue'
import { dayTitle } from '../lib/labels.js'
const props = defineProps({ rows: { type: Array, default: () => [] } })
const pick = ref(null)
watch(() => props.rows, () => { pick.value = null })
function max() {
  return Math.max(1, ...props.rows.flatMap((x) => [x.count || 0, x.plan || 0]))
}
function h(n) {
  return Math.max(4, Math.round((Number(n || 0) / max()) * 120)) + 'px'
}
function title(x) {
  return String(x.date || '').length >= 10 ? dayTitle(x.date) : x.label
}
</script>
