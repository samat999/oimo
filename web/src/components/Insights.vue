<template>
  <div class="insights">
    <div class="card">
      <div class="card-top">
        <div>
          <h3>Динамика</h3>
          <p class="sub">{{ planLine }}</p>
        </div>
        <b class="big-pct">{{ d.plan?.pct || 0 }}%</b>
      </div>
      <div class="prog fat"><i :style="{ width: Math.min(d.plan?.pct || 0, 100) + '%' }" /></div>
      <ChartBars class="desk-only" :rows="rows" />
      <div class="dyn-list mob-only">
        <div v-for="x in rows" :key="'m-' + x.date" class="dyn-row">
          <div class="dyn-head">
            <span>{{ rowTitle(x) }}</span>
            <b>{{ x.count || 0 }} <small>из {{ x.plan || 0 }}</small></b>
          </div>
          <div class="prog"><i :style="{ width: factWidth(x) }" /></div>
        </div>
      </div>
      <div class="table-scroll desk-only">
        <table class="table dyn">
          <thead>
            <tr>
              <th>{{ colName }}</th>
              <th>План</th>
              <th>Факт</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="x in rows" :key="x.date">
              <td>{{ rowTitle(x) }}</td>
              <td>{{ x.plan || 0 }}</td>
              <td>
                <div class="dyn-cell">
                  <b>{{ x.count || 0 }}</b>
                  <div class="prog"><i :style="{ width: factWidth(x) }" /></div>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <p v-if="!rows.length" class="muted">За этот период ещё нет дней.</p>
    </div>
    <p class="story">{{ story }}</p>
    <div class="kpis">
      <div class="kpi">
        <div class="label">Подтверждено</div>
        <b>{{ sales }} шт</b>
        <div class="delta" :class="d.kpis?.sales?.dir">{{ i.salesVs }}</div>
      </div>
      <div class="kpi">
        <div class="label">Выручка</div>
        <b>{{ som(d.kpis?.revenue?.value) }}</b>
        <div class="delta" :class="d.kpis?.revenue?.dir">{{ i.revenueVs }}</div>
      </div>
      <div class="kpi">
        <div class="label">Средний чек</div>
        <b>{{ som(i.avgCheck) }}</b>
        <div class="delta" :class="i.avgDir">{{ i.avgVs }}</div>
      </div>
      <div class="kpi">
        <div class="label">{{ payLabel }}</div>
        <b>{{ som(payValue) }}</b>
        <div class="muted tiny">{{ payHint }}</div>
      </div>
    </div>

    <div class="card">
      <h3>Как идут отчёты</h3>
      <p class="sub">{{ funnelLine }}</p>
      <div class="steps">
        <div v-for="f in d.funnel" :key="f.key" class="step" :class="f.key">
          <b>{{ f.n }}</b>
          <span>{{ f.label }}</span>
        </div>
      </div>
      <div class="funnel">
        <div v-for="f in d.funnel" :key="'b' + f.key" class="fl">
          <span>{{ f.label }}</span>
          <div class="bar"><i :class="tone(f.key)" :style="{ width: f.pct + '%' }" /></div>
          <b>{{ f.pct }}%</b>
        </div>
      </div>
    </div>

    <div class="card" v-if="people.length">
      <h3>{{ peopleTitle }}</h3>
      <p class="sub">{{ peopleSub }}</p>
      <div class="people">
        <div v-for="(t, idx) in people" :key="t.userId" class="person" :class="{ mine: t.userId === mineId }">
          <em>{{ idx + 1 }}</em>
          <div>
            <b>{{ t.name }}</b>
            <small>{{ t.pieces }} из {{ t.plan || 0 }} шт · {{ t.pct }}%</small>
            <div class="prog"><i :style="{ width: Math.min(t.pct || 0, 100) + '%' }" /></div>
          </div>
          <strong v-if="showPay">{{ som(t.salary) }}</strong>
        </div>
      </div>
    </div>
  </div>
</template>
<script setup>
import { computed } from 'vue'
import { som } from '../api.js'
import { insight, pcs, periodNow } from '../lib/insight.js'
import { dayTitle } from '../lib/labels.js'
import ChartBars from './ChartBars.vue'

const props = defineProps({
  d: { type: Object, required: true },
  period: { type: String, default: 'week' },
  mode: { type: String, default: 'owner' },
  mineId: { type: String, default: '' },
})

const MONTHS = ['янв', 'фев', 'мар', 'апр', 'май', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек']
const i = computed(() => insight(props.d, props.period))
const rows = computed(() => props.d.byDay || [])
const colName = computed(() => (props.period === 'year' ? 'Месяц' : 'День'))
function rowTitle(x) {
  const s = String(x.date || '')
  if (s.length >= 10) return dayTitle(s)
  const n = Number(s)
  if (n >= 1 && n <= 12) return MONTHS[n - 1]
  return x.label || s
}
function factWidth(x) {
  const max = Math.max(1, ...rows.value.map((r) => Math.max(Number(r.count) || 0, Number(r.plan) || 0)))
  return Math.round(((Number(x.count) || 0) / max) * 100) + '%'
}
const sales = computed(() => props.d.kpis?.sales?.value || 0)
const payValue = computed(() => props.mode === 'seller' ? props.d.kpis?.salary?.value : props.d.kpis?.payroll?.value)
const payLabel = computed(() => props.mode === 'seller' ? 'Зарплата недели' : 'Фонд зарплат')
const payHint = computed(() => {
  if (props.mode === 'seller') return `бонус ${som(props.d.kpis?.salary?.bonus || 0)} за эту неделю`
  return 'за эту неделю по таблице KPI'
})
const planLine = computed(() => {
  const fact = props.d.plan?.fact || 0
  const need = props.d.plan?.pieces || 0
  if (!need) return `План не задан. Факт за ${periodNow(props.period)}: ${fact} шт`
  if (i.value.leftover === 0) return `План закрыт: ${fact} из ${need} шт`
  return `${fact} из ${need} шт · осталось ${i.value.leftover}`
})
const funnelLine = computed(() => {
  if (!i.value.reports) return 'За период ещё нет отчётов'
  return `Из ${i.value.reports} отчётов подтвердили ${i.value.confirmed} (${i.value.conversion}%). На проверке ${i.value.pending}, отклонили ${i.value.rejected}.`
})
const story = computed(() => {
  const now = periodNow(props.period)
  const n = sales.value
  const money = som(props.d.kpis?.revenue?.value)
  if (props.mode === 'seller') {
    const left = props.d.next?.left
    const next = left ? ` До следующего диапазона KPI ещё ${left} ${pcs(left)}.` : ' Вы уже в верхнем диапазоне KPI.'
    return `За ${now} у вас ${n} подтверждённых ${pcs(n)} на ${money}. Это ${i.value.salesVs}.${next}`
  }
  const plan = i.value.leftover ? ` До плана магазина осталось ${i.value.leftover} шт.` : ' План магазина закрыт.'
  const wait = i.value.pending ? ` ${i.value.pending} отчётов ждут проверки.` : ''
  return `За ${now} магазин закрыл ${n} ${pcs(n)} на ${money}. Это ${i.value.salesVs}.${plan}${wait}`
})
const people = computed(() => {
  if (Array.isArray(props.d.ranking) && props.d.ranking.length) return props.d.ranking
  if (Array.isArray(props.d.team)) return props.d.team
  return []
})
const peopleTitle = computed(() => props.mode === 'seller' ? 'Ваше место' : 'Кто закрывает план')
const peopleSub = computed(() => {
  if (props.mode === 'seller') return `Место ${props.d.place || '—'} из ${Number(props.d.team) || people.value.length}`
  return 'Факт и зарплата недели по KPI'
})
const showPay = computed(() => props.mode === 'owner')
function tone(key) {
  return { pending: 'w', confirmed: 'g', rejected: 'r' }[key] || ''
}
</script>
