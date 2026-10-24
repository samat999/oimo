<template>
  <div class="page">
    <div class="head-row">
      <div class="hello">
        <h1>Проверка отчётов</h1>
        <p>{{ nNew }} новых · {{ all.length }} всего. Новые сверху, решение сразу входит в KPI.</p>
      </div>
      <div class="period">
        <button type="button" :class="{ on: tab === 'pending' }" @click="setTab('pending')">Новые</button>
        <button type="button" :class="{ on: tab === 'all' }" @click="setTab('all')">Все</button>
        <button type="button" :class="{ on: tab === 'confirmed' }" @click="setTab('confirmed')">Подтверждённые</button>
        <button type="button" :class="{ on: tab === 'rejected' }" @click="setTab('rejected')">Отклонённые</button>
      </div>
    </div>
    <div class="card table-card">
      <div class="mob-only review-list">
        <article v-for="s in slice" :key="'m-' + s.id" class="review-card">
          <button class="thumb" type="button" @click="look = s">
            <img v-if="s.photoUrl" :src="s.photoUrl" alt="" />
          </button>
          <div class="review-main">
            <div class="review-top">
              <div>
                <b>{{ s.model }}</b>
                <div class="muted">{{ s.serial }}</div>
                <div class="muted">{{ s.sellerName }} · {{ when(s.createdAt) }}</div>
              </div>
              <div class="list-side">
                <div class="sale-sum">{{ som(s.price) }}</div>
                <span class="pill" :class="s.status">{{ STATUS_REVIEW[s.status] }}</span>
              </div>
            </div>
            <p v-if="s.comment" class="muted review-note">{{ s.comment }}</p>
            <p v-if="s.rejectReason" class="err">{{ s.rejectReason }}</p>
            <template v-if="s.status === 'pending'">
              <div class="check-actions" v-if="!ask[s.id]">
                <button class="btn ok" type="button" @click.stop="decide(s, 'confirmed')">Подтвердить</button>
                <button class="btn bad" type="button" @click.stop="askReject(s)">Отклонить</button>
              </div>
              <div class="check-reject" v-else>
                <label>Причина отклонения</label>
                <Select grow v-model="reason[s.id]" placeholder="Выберите причину" :options="rejectOpts" />
                <div class="check-actions">
                  <button class="btn bad" type="button" @click="decide(s, 'rejected')">Отклонить</button>
                  <button class="btn ghost" type="button" @click="ask[s.id] = false">Назад</button>
                </div>
              </div>
              <p v-if="err[s.id]" class="err">{{ err[s.id] }}</p>
            </template>
          </div>
        </article>
      </div>
      <div class="table-scroll desk-only">
        <table class="table">
          <thead>
            <tr>
              <th></th>
              <th>Серийный</th>
              <th>Сотрудник</th>
              <th>Комментарий</th>
              <th>Сумма</th>
              <th>Статус</th>
            </tr>
          </thead>
          <tbody>
            <template v-for="s in slice" :key="s.id">
              <tr class="click" :class="{ fresh: s.status === 'pending', on: openId === s.id }" @click="onRow(s)">
                <td style="width: 52px">
                  <button class="thumb mini" type="button" @click.stop="look = s">
                    <img v-if="s.photoUrl" :src="s.photoUrl" alt="" />
                  </button>
                </td>
                <td>
                  <b>{{ s.serial }}</b>
                  <div class="muted">{{ s.model }}</div>
                </td>
                <td>{{ s.sellerName }}</td>
                <td class="clip" :title="s.comment || ''">{{ s.comment || '—' }}</td>
                <td>{{ som(s.price) }}</td>
                <td><span class="pill" :class="s.status">{{ STATUS_REVIEW[s.status] }}</span></td>
              </tr>
              <tr v-if="openId === s.id" class="check-extra">
                <td colspan="6">
                  <div class="check-more">
                    <span><small>Дата</small>{{ when(s.createdAt) }}</span>
                    <span><small>Название</small>{{ s.model }}</span>
                    <span><small>Серийный</small>{{ s.serial }}</span>
                    <span><small>Сотрудник</small>{{ s.sellerName }}</span>
                    <span><small>Сумма</small>{{ som(s.price) }}</span>
                    <span><small>Оплата</small>{{ s.payment }}</span>
                    <span><small>Комментарий</small>{{ s.comment || '—' }}</span>
                    <span><small>Статус</small>{{ STATUS_REVIEW[s.status] }}</span>
                    <span v-if="s.rejectReason" class="err"><small>Причина</small>{{ s.rejectReason }}</span>
                  </div>
                  <template v-if="s.status === 'pending'">
                    <div class="check-actions" v-if="!ask[s.id]">
                      <button class="btn ok" type="button" @click.stop="decide(s, 'confirmed')">Подтвердить</button>
                      <button class="btn bad" type="button" @click.stop="askReject(s)">Отклонить</button>
                    </div>
                    <div class="check-reject" v-else @click.stop>
                      <label>Причина отклонения</label>
                      <Select grow v-model="reason[s.id]" placeholder="Выберите причину" :options="rejectOpts" />
                      <div class="check-actions">
                        <button class="btn bad" type="button" @click="decide(s, 'rejected')">Отклонить</button>
                        <button class="btn ghost" type="button" @click="ask[s.id] = false">Назад</button>
                      </div>
                    </div>
                    <p v-if="err[s.id]" class="err">{{ err[s.id] }}</p>
                  </template>
                </td>
              </tr>
            </template>
          </tbody>
        </table>
      </div>
      <p v-if="!shown.length" class="muted" style="padding: 8px">{{ empty }}</p>
      <Pager v-model:page="page" v-model:size="size" :total="total" :pages="pages" :from="from" :to="to" />
    </div>
    <PhotoModal :item="look" @close="look = null" />
  </div>
</template>
<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { api, som } from '../../api.js'
import { REJECT_REASONS, when } from '../../lib/labels.js'
import { usePager } from '../../lib/pager.js'
import Pager from '../../components/Pager.vue'
import PhotoModal from '../../components/PhotoModal.vue'
import Select from '../../components/Select.vue'
const STATUS_REVIEW = { pending: 'Новый', confirmed: 'Подтверждён', rejected: 'Отклонён' }
const all = ref([])
const tab = ref('all')
const shown = computed(() => {
  if (tab.value === 'all') return all.value
  return all.value.filter((s) => s.status === tab.value)
})
const { page, size, total, pages, slice, from, to, reset } = usePager(shown)
const nNew = computed(() => all.value.filter((s) => s.status === 'pending').length)
const empty = computed(() => {
  if (tab.value === 'pending') return 'Новых отчётов нет.'
  if (tab.value === 'confirmed') return 'Подтверждённых отчётов нет.'
  if (tab.value === 'rejected') return 'Отклонённых отчётов нет.'
  return 'Отчётов пока нет.'
})
const reason = reactive({})
const ask = reactive({})
const err = reactive({})
const look = ref(null)
const openId = ref(null)
const rejectOpts = REJECT_REASONS
watch(tab, reset)
async function load() {
  const rows = (await api('/api/owner/sales')).sales
  rows.sort((a, b) => {
    if (a.status === 'pending' && b.status !== 'pending') return -1
    if (b.status === 'pending' && a.status !== 'pending') return 1
    return String(b.createdAt).localeCompare(String(a.createdAt))
  })
  all.value = rows
}
onMounted(load)
function setTab(id) {
  tab.value = id
  openId.value = null
}
function onRow(s) {
  openId.value = openId.value === s.id ? null : s.id
}
function askReject(s) {
  ask[s.id] = true
  if (!reason[s.id]) reason[s.id] = ''
}
async function decide(s, decision) {
  err[s.id] = ''
  try {
    await api('/api/owner/sales/' + s.id + '/decide', {
      method: 'POST',
      body: JSON.stringify({ decision, reason: reason[s.id] || '' }),
    })
    ask[s.id] = false
    openId.value = null
    await load()
  } catch (e) {
    err[s.id] = e.message
  }
}
</script>
