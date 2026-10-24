<template>
  <div class="page">
    <div class="head-row">
      <div class="hello">
        <h1>{{ d.greeting?.hi }}, {{ first }}</h1>
        <p>{{ d.greeting?.date }} · {{ d.range?.from }} — {{ d.range?.to }}</p>
      </div>
      <PeriodChips v-model="period" />
    </div>
    <router-link class="sale-cta" to="/new">
      <b>Новая продажа</b>
      <span>Фото, серийник, сумма — одна минута</span>
    </router-link>
    <RaceCard :week="d.leaders?.week" :month="d.leaders?.month" />
    <Insights :d="d" :period="period" mode="seller" :mine-id="user?.id" />
  </div>
</template>
<script setup>
import { onMounted, ref, watch } from 'vue'
import { api, getUser } from '../../api.js'
import PeriodChips from '../../components/PeriodChips.vue'
import RaceCard from '../../components/RaceCard.vue'
import Insights from '../../components/Insights.vue'
const user = getUser()
const first = user?.name?.split(' ')[0] || ''
const period = ref('week')
const d = ref({ funnel: [], byDay: [], ranking: [], kpis: {}, plan: {}, greeting: {}, range: {} })
async function load() {
  d.value = await api('/api/seller/home?period=' + period.value)
}
onMounted(load)
watch(period, load)
</script>
