<template>
  <div class="chart-wrap">
    <div class="chart" :style="{ gridTemplateColumns: 'repeat(' + (rows.length || 1) + ', 1fr)' }">
      <div v-for="x in rows" :key="x.date" class="col" tabindex="0">
        <div class="tip">
          <b>{{ title(x) }}</b>
          <span>План: {{ x.plan || 0 }} шт</span>
          <span>Факт: {{ x.count || 0 }} шт</span>
        </div>
        <i class="plan" :style="{ height: h(x.plan) }" />
        <i class="fact" :style="{ height: h(x.count) }" />
      </div>
    </div>
    <div class="axis" :style="{ gridTemplateColumns: 'repeat(' + (rows.length || 1) + ', 1fr)' }">
      <span v-for="x in rows" :key="'a' + x.date">{{ x.label }}</span>
    </div>
    <div class="legend"><span><b class="plan" />план</span><span><b class="fact" />факт</span></div>
  </div>
</template>
<script setup>
import { dayTitle } from '../lib/labels.js'
const props = defineProps({ rows: { type: Array, default: () => [] } })
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
