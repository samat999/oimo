<template>
  <div class="page">
    <div class="head-row">
      <div class="hello">
        <h1>{{ d.greeting?.hi }}, {{ first }}!</h1>
        <p>{{ d.greeting?.date }} · {{ d.range?.from }} — {{ d.range?.to }}</p>
      </div>
      <PeriodChips v-model="period" />
    </div>
    <RaceCard :week="d.leaders?.week" :month="d.leaders?.month" />
    <div class="kpis">
      <div class="kpi">
        <div class="label">Продажи</div>
        <b>{{ d.kpis?.sales?.value || 0 }}</b>
        <div class="delta" :class="d.kpis?.sales?.dir">{{ vs(d.kpis?.sales) }}</div>
      </div>
      <div class="kpi">
        <div class="label">Выручка</div>
        <b>{{ som(d.kpis?.revenue?.value) }}</b>
        <div class="delta" :class="d.kpis?.revenue?.dir">{{ vs(d.kpis?.revenue) }}</div>
      </div>
      <div class="kpi">
        <div class="label">На проверке</div>
        <b>{{ d.kpis?.pending?.value || 0 }}</b>
        <div class="muted" style="font-size: 12px">не входят в KPI</div>
      </div>
      <div class="kpi">
        <div class="label">Зарплата недели</div>
        <b>{{ som(d.kpis?.salary?.value) }}</b>
        <div class="muted" style="font-size: 12px">бонус {{ som(d.kpis?.salary?.bonus) }}</div>
      </div>
    </div>
    <div class="card" style="margin-top: 12px">
      <h3>Воронка продаж</h3>
      <p class="sub">конверсия по статусам отчёта</p>
      <div class="funnel">
        <div v-for="f in d.funnel" :key="f.key" class="fl">
          <span>{{ f.label }}</span>
          <div class="bar"><i :class="tone(f.key)" :style="{ width: f.pct + '%' }" /></div>
          <b>{{ f.n }}</b>
        </div>
      </div>
    </div>
    <div class="card" style="margin-top: 12px">
      <h3>План / факт</h3>
      <p class="sub">{{ d.plan?.fact || 0 }} из {{ d.plan?.pieces || 0 }} шт · {{ d.plan?.pct || 0 }}%</p>
        <ChartBars :rows="d.byDay || []" />
    </div>
    <div class="stack">
      <div class="card">
        <h3>KPI продавцов</h3>
        <p class="sub">место {{ d.place }} из {{ d.team }} · до бонуса {{ d.next ? d.next.left + ' продаж' : 'максимум' }}</p>
        <table class="table">
          <thead>
            <tr><th>Сотрудник</th><th>Факт</th><th>План</th><th>%</th></tr>
          </thead>
          <tbody>
            <tr v-for="r in d.ranking" :key="r.userId" :class="{ mine: r.userId === user.id }">
              <td>{{ r.name }}</td>
              <td>{{ r.pieces }}</td>
              <td>{{ r.plan }}</td>
              <td>
                <div class="prog"><i :style="{ width: Math.min(r.pct, 100) + '%' }" /></div>
                {{ r.pct }}%
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div class="focus">
        <small>Фокус на период</small>
        <h3>{{ d.next ? 'Ещё ' + d.next.left + ' до следующего диапазона' : 'Верхний диапазон KPI' }}</h3>
        <p>{{ d.next ? 'Начисление ' + som(d.next.total) : 'Ставка и бонус уже максимальные' }}</p>
      </div>
    </div>
  </div>
</template>
<script setup>
import { onMounted, ref, watch } from 'vue'
import { api, getUser, som } from '../../api.js'
import PeriodChips from '../../components/PeriodChips.vue'
import ChartBars from '../../components/ChartBars.vue'
import RaceCard from '../../components/RaceCard.vue'
const user = getUser()
const first = user?.name?.split(' ')[0] || ''
const period = ref('week')
const d = ref({ funnel: [], byDay: [], ranking: [] })
async function load() {
  d.value = await api('/api/seller/home?period=' + period.value)
}
onMounted(load)
watch(period, load)
function vs(x) {
  if (!x || x.dir === 'flat') return '0% к пред. периоду'
  return (x.dir === 'up' ? '+' : '−') + x.pct + '% к пред. периоду'
}
function tone(key) {
  return { pending: 'w', confirmed: 'g', rejected: 'r' }[key] || ''
}
</script>
