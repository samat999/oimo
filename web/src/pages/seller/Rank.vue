<template>
  <div class="page">
    <div class="head-row">
      <div class="hello">
        <h1>Гонка</h1>
        <p>Кто впереди на этой неделе и за месяц. Чужие зарплаты скрыты.</p>
      </div>
      <PeriodChips v-model="period" />
    </div>
    <RaceCard :week="leaders.week" :month="leaders.month" />
    <div class="card">
      <div class="table-scroll">
      <table class="table">
        <thead>
          <tr><th>Место</th><th>Сотрудник</th><th>Факт</th><th>План</th></tr>
        </thead>
        <tbody>
          <tr v-for="r in slice" :key="r.place" :class="{ mine: r.mine }">
            <td>{{ r.place }}</td>
            <td>{{ r.name }}</td>
            <td>{{ r.pieces }} шт</td>
            <td>
              <div class="prog"><i :style="{ width: Math.min(r.pct, 100) + '%' }" /></div>
              {{ r.pct }}%
            </td>
          </tr>
        </tbody>
      </table>
      </div>
      <Pager v-model:page="page" v-model:size="size" :total="total" :pages="pages" :from="from" :to="to" />
    </div>
  </div>
</template>
<script setup>
import { onMounted, ref, watch } from 'vue'
import { api } from '../../api.js'
import PeriodChips from '../../components/PeriodChips.vue'
import RaceCard from '../../components/RaceCard.vue'
import { usePager } from '../../lib/pager.js'
import Pager from '../../components/Pager.vue'
const period = ref('week')
const ranking = ref([])
const leaders = ref({})
const { page, size, total, pages, slice, from, to, reset } = usePager(ranking)
async function load() {
  reset()
  ranking.value = (await api('/api/rank?period=' + period.value)).ranking
  const me = await api('/api/me')
  leaders.value = me.leaders || {}
}
onMounted(load)
watch(period, load)
</script>
