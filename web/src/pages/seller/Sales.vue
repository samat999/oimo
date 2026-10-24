<template>
  <div class="page">
    <div class="hello">
      <h1>Мои отчёты</h1>
      <p>Статус продажи после проверки владельца. Нажмите строку, чтобы открыть фото.</p>
    </div>
    <div class="card table-card">
      <button v-for="s in slice" :key="s.id" type="button" class="list-row" @click="look = s">
        <span class="thumb">
          <img v-if="s.photoUrl" :src="s.photoUrl" alt="" />
        </span>
        <SaleFacts :sale="s" />
        <span class="list-side">
          <span class="pill" :class="s.status">{{ label[s.status] }}</span>
        </span>
      </button>
      <p v-if="!sales.length" class="muted" style="padding: 8px">Пока нет отчётов.</p>
      <Pager v-model:page="page" v-model:size="size" :total="total" :pages="pages" :from="from" :to="to" />
    </div>
    <PhotoModal :item="look" @close="look = null" />
  </div>
</template>
<script setup>
import { onMounted, ref } from 'vue'
import { api } from '../../api.js'
import { usePager } from '../../lib/pager.js'
import Pager from '../../components/Pager.vue'
import PhotoModal from '../../components/PhotoModal.vue'
import SaleFacts from '../../components/SaleFacts.vue'
const sales = ref([])
const look = ref(null)
const { page, size, total, pages, slice, from, to } = usePager(sales)
const label = { pending: 'На проверке', confirmed: 'Подтверждён', rejected: 'Отклонён' }
onMounted(async () => {
  sales.value = (await api('/api/seller/sales')).sales
})
</script>
