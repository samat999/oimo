<template>
  <div class="page">
    <div class="head-row">
      <div class="hello">
        <h1>Планы</h1>
        <p>Нажмите ячейку, измените штуки или сумму — сохранится само. {{ PERIOD[period] }}.</p>
      </div>
      <PeriodChips v-model="period" :items="chips" />
    </div>
    <div class="card table-card">
      <div class="table-scroll">
        <table class="table">
          <thead>
            <tr>
              <th>Кому</th>
              <th>Штук</th>
              <th>Сумма, сом</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="r in slice" :key="r.key">
              <td>{{ r.name }}</td>
              <td>
                <input class="cell" type="number" v-model.number="r.pieces" @change="save(r)" />
              </td>
              <td>
                <input class="cell" type="number" v-model.number="r.amount" @change="save(r)" />
              </td>
              <td class="muted">{{ saved[r.key] || '' }}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <Pager v-model:page="page" v-model:size="size" :total="total" :pages="pages" :from="from" :to="to" />
    </div>
  </div>
</template>
<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { api } from '../../api.js'
import PeriodChips from '../../components/PeriodChips.vue'
import { PERIOD } from '../../lib/labels.js'
import { usePager } from '../../lib/pager.js'
import Pager from '../../components/Pager.vue'
const period = ref('week')
const chips = [
  { id: 'week', label: 'Неделя' },
  { id: 'month', label: 'Месяц' },
  { id: 'year', label: 'Год' },
]
const plans = ref([])
const users = ref([])
const saved = reactive({})
onMounted(load)
async function load() {
  const d = await api('/api/owner/plans')
  plans.value = d.plans
  users.value = d.users
}
const rows = computed(() => {
  const p = period.value === 'day' ? 'week' : period.value
  const list = [
    { key: p + ':store', name: 'Весь магазин', period: p, userId: null, ...pick(null, p) },
    ...users.value.map((u) => ({
      key: p + ':' + u.id,
      name: u.name,
      period: p,
      userId: u.id,
      ...pick(u.id, p),
    })),
  ]
  return list
})
const { page, size, total, pages, slice, from, to, reset } = usePager(rows)
watch(period, reset)
function pick(userId, p) {
  const row = plans.value.find((x) => x.period === p && (x.userId || null) === userId)
  return { pieces: row?.pieces || 0, amount: row?.amount || 0, id: row?.id }
}
async function save(r) {
  const plan = await api('/api/owner/plans', {
    method: 'POST',
    body: JSON.stringify({ period: r.period, userId: r.userId, pieces: r.pieces, amount: r.amount }),
  })
  const i = plans.value.findIndex((x) => x.period === r.period && (x.userId || null) === r.userId)
  if (i >= 0) plans.value[i] = plan.plan
  else plans.value.push(plan.plan)
  saved[r.key] = 'сохранено'
  setTimeout(() => { saved[r.key] = '' }, 1200)
}
</script>
