<template>
  <div class="page">
    <div class="head-row">
      <div class="hello">
        <h1>Журнал продаж</h1>
        <p v-if="staff">{{ sales.length }} записей · все статусы в одной таблице</p>
        <p v-else>Ваши отчёты. Статус после проверки владельца.</p>
      </div>
    </div>
    <div class="filters">
      <input v-model="q" :placeholder="staff ? 'Серийный, модель, продавец или комментарий' : 'Серийный, модель или комментарий'" @input="apply" />
      <Select v-model="status" :options="statusOpts" @update:modelValue="apply" />
      <Select v-if="staff" v-model="userId" :options="sellerOpts" @update:modelValue="apply" />
      <button class="btn ghost" @click="clear">Сбросить</button>
    </div>
    <div class="card table-card">
      <div class="table-scroll">
        <table class="table">
          <thead>
            <tr>
              <th>Дата</th>
              <th v-if="staff">Продавец</th>
              <th>Модель</th>
              <th>Серийный</th>
              <th>Комментарий</th>
              <th>Оплата</th>
              <th>Сумма</th>
              <th>Статус</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="s in slice" :key="s.id">
              <td class="muted">{{ when(s.createdAt) }}</td>
              <td v-if="staff">{{ s.sellerName }}</td>
              <td>{{ s.model }}</td>
              <td>{{ s.serial }}</td>
              <td class="clip" :title="s.comment || ''">{{ s.comment || '—' }}</td>
              <td>{{ s.payment }}</td>
              <td>{{ som(s.price) }}</td>
              <td><span class="pill" :class="s.status">{{ STATUS[s.status] }}</span></td>
            </tr>
          </tbody>
        </table>
      </div>
      <p v-if="!sales.length" class="muted" style="padding: 8px">Ничего не найдено.</p>
      <Pager v-model:page="page" v-model:size="size" :total="total" :pages="pages" :from="from" :to="to" />
    </div>
  </div>
</template>
<script setup>
import { computed, onMounted, ref } from 'vue'
import { api, can, som } from '../../api.js'
import { STATUS, when } from '../../lib/labels.js'
import { usePager } from '../../lib/pager.js'
import Pager from '../../components/Pager.vue'
import Select from '../../components/Select.vue'
const staff = can('journal')
const sales = ref([])
const raw = ref([])
const q = ref('')
const status = ref('')
const userId = ref('')
const statusOpts = [
  { value: '', label: 'Все статусы' },
  { value: 'pending', label: 'Новый' },
  { value: 'confirmed', label: 'Подтверждён' },
  { value: 'rejected', label: 'Отклонён' },
]
const sellerOpts = computed(() => {
  const seen = new Map()
  for (const s of raw.value) {
    if (s.userId && !seen.has(s.userId)) seen.set(s.userId, s.sellerName || s.userId)
  }
  return [{ value: '', label: 'Все продавцы' }, ...[...seen].map(([value, label]) => ({ value, label }))]
})
const { page, size, total, pages, slice, from, to, reset: resetPage } = usePager(sales)
function apply() {
  resetPage()
  const text = q.value.trim().toLowerCase()
  let rows = raw.value
  if (status.value) rows = rows.filter((s) => s.status === status.value)
  if (staff && userId.value) rows = rows.filter((s) => s.userId === userId.value)
  if (text) {
    rows = rows.filter(
      (s) =>
        String(s.serial).toLowerCase().includes(text) ||
        String(s.model).toLowerCase().includes(text) ||
        String(s.sellerName || '').toLowerCase().includes(text) ||
        String(s.comment || '').toLowerCase().includes(text),
    )
  }
  sales.value = rows
}
async function load() {
  raw.value = staff
    ? (await api('/api/owner/sales')).sales
    : (await api('/api/seller/sales')).sales
  apply()
}
function clear() {
  q.value = ''
  status.value = ''
  userId.value = ''
  apply()
}
onMounted(load)
</script>
