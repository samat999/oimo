<template>
  <div class="page">
    <div class="head-row">
      <div class="hello">
        <h1>Таблица KPI</h1>
        <p>{{ hint }}</p>
      </div>
      <PeriodChips v-model="period" :items="chips" />
    </div>
    <div class="note">
      Зарплата считается только за календарную неделю, пн–вс. Ставка выбранного диапазона идёт на все подтверждённые продажи недели, плюс бонус.
    </div>
    <div class="card table-card">
      <div class="table-scroll">
        <table class="table">
          <thead>
            <tr>
              <th>От, шт</th>
              <th>До, шт</th>
              <th>Ставка</th>
              <th>Бонус</th>
              <th>Пример</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(r, i) in kpi" :key="i">
              <td><input class="cell" type="number" v-model.number="r.min" /></td>
              <td><input class="cell" type="number" v-model.number="r.max" /></td>
              <td><input class="cell" type="number" v-model.number="r.rate" /></td>
              <td><input class="cell" type="number" v-model.number="r.bonus" /></td>
              <td class="muted">{{ example(r) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <div class="split" style="margin-top: 12px">
        <button class="btn ghost" @click="kpi.push({ min: 0, max: 0, rate: 0, bonus: 0 })">Добавить диапазон</button>
        <button class="btn" @click="save">Сохранить таблицу</button>
      </div>
      <p v-if="msg" class="muted">{{ msg }}</p>
    </div>
    <div class="card" style="margin-top: 12px">
      <h3>Сейчас на неделе</h3>
      <p class="sub">кто в каком диапазоне по подтверждённым продажам</p>
      <div v-for="t in slice" :key="t.userId" class="row">
        <div>
          <b>{{ t.name }}</b>
          <div class="muted">{{ t.pieces }} шт · ставка {{ t.rate }} · бонус {{ t.bonus }}</div>
        </div>
        <span>{{ som(t.salary) }}</span>
      </div>
      <Pager v-model:page="page" v-model:size="size" :total="total" :pages="pages" :from="from" :to="to" />
    </div>
  </div>
</template>
<script setup>
import { computed, onMounted, ref } from 'vue'
import { api, som } from '../../api.js'
import PeriodChips from '../../components/PeriodChips.vue'
import { usePager } from '../../lib/pager.js'
import Pager from '../../components/Pager.vue'
const period = ref('week')
const chips = [
  { id: 'week', label: 'Неделя' },
  { id: 'month', label: 'Месяц' },
  { id: 'year', label: 'Год' },
]
const kpi = ref([])
const team = ref([])
const msg = ref('')
const { page, size, total, pages, slice, from, to } = usePager(team)
const hint = computed(() => {
  if (period.value === 'week') return 'Рабочий режим: неделя. Меняйте ячейки и сохраните.'
  if (period.value === 'month') return 'Месяц выбран для просмотра. Начисление всё равно идёт по неделе.'
  if (period.value === 'year') return 'Год выбран для просмотра. Начисление всё равно идёт по неделе.'
  return 'День выбран для просмотра. Начисление всё равно идёт по неделе.'
})
onMounted(async () => {
  const d = await api('/api/owner/kpi')
  kpi.value = d.kpi
  team.value = d.team || []
})
function example(r) {
  const n = Number(r.min) || 0
  return n ? `${n} шт → ${((n * Number(r.rate || 0)) + Number(r.bonus || 0)).toLocaleString('ru-RU')} сом` : '—'
}
async function save() {
  await api('/api/owner/kpi', { method: 'POST', body: JSON.stringify({ kpi: kpi.value }) })
  msg.value = 'Сохранено. Новые подтверждения пересчитаются по этой таблице.'
}
</script>
