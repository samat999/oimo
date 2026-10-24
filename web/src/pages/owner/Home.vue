<template>
  <div class="page">
    <div class="head-row">
      <div class="hello">
        <h1>{{ d.greeting?.hi }}, {{ first }}</h1>
        <p>{{ d.greeting?.date }} · отчёт {{ d.range?.from }} — {{ d.range?.to }}</p>
      </div>
      <PeriodChips v-model="period" />
    </div>
    <RaceCard :week="d.leaders?.week" :month="d.leaders?.month" />
    <Insights :d="d" :period="period" mode="owner" />
    <button class="btn ghost xls" type="button" @click="xls">Скачать Excel за период</button>
  </div>
</template>
<script setup>
import { onMounted, ref, watch } from 'vue'
import { api, getToken, getUser } from '../../api.js'
import PeriodChips from '../../components/PeriodChips.vue'
import RaceCard from '../../components/RaceCard.vue'
import Insights from '../../components/Insights.vue'
const user = getUser()
const first = user?.name?.split(' ')[0] || ''
const period = ref('week')
const d = ref({ funnel: [], byDay: [], team: [], kpis: {}, plan: {}, greeting: {}, range: {} })
async function load() {
  d.value = await api('/api/owner/overview?period=' + period.value)
}
onMounted(load)
watch(period, load)
async function xls() {
  const blob = await fetch('/api/owner/export.xlsx', { headers: { Authorization: 'Bearer ' + getToken() } }).then((r) => r.blob())
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = 'oimo-otchet.xlsx'
  a.click()
}
</script>
