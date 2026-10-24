<template>
  <div class="page">
    <div class="head-row">
      <div class="hello">
        <h1>Сотрудники</h1>
        <p>{{ users.length }} продавцов · блокировка сразу закрывает вход</p>
      </div>
      <button class="btn head-btn" @click="open = true">+ Сотрудник</button>
    </div>
    <div class="filters">
      <input v-model="q" placeholder="Имя или логин" />
      <Select v-model="state" :options="stateOpts" />
    </div>
    <div class="card table-card">
      <div class="mob-only">
        <button v-for="u in slice" :key="'m-' + u.id" type="button" class="list-row plain" @click="$router.push('/owner/team/' + u.id)">
          <div>
            <b>{{ u.name }}</b>
            <div class="muted">{{ u.login }} · {{ ROLE_NAME[u.role] || u.role }}</div>
          </div>
          <div class="list-side">
            <span class="pill" :class="u.active ? 'confirmed' : 'rejected'">{{ u.active ? 'Активен' : 'Блок' }}</span>
          </div>
        </button>
      </div>
      <div class="table-scroll desk-only">
        <table class="table">
          <thead>
            <tr>
              <th>Имя</th>
              <th>Логин</th>
              <th>Роль</th>
              <th>Статус</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="u in slice" :key="u.id" class="click" @click="$router.push('/owner/team/' + u.id)">
              <td><b>{{ u.name }}</b></td>
              <td>{{ u.login }}</td>
              <td>{{ ROLE_NAME[u.role] || u.role }}</td>
              <td>
                <span class="pill" :class="u.active ? 'confirmed' : 'rejected'">{{ u.active ? 'Активен' : 'Блок' }}</span>
              </td>
              <td class="muted">Открыть</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p v-if="!shown.length" class="muted" style="padding: 8px">Никого не найдено.</p>
      <Pager v-model:page="page" v-model:size="size" :total="total" :pages="pages" :from="from" :to="to" />
    </div>
    <Modal :open="open" title="Новый продавец" @close="open = false">
      <div class="field"><label>Имя</label><input v-model="form.name" /></div>
      <div class="field"><label>Логин</label><input v-model="form.login" autocomplete="off" /></div>
      <div class="field"><label>Пароль</label><input v-model="form.password" type="password" autocomplete="new-password" /></div>
      <div class="field">
        <label>Роль</label>
        <Select grow v-model="form.role" :options="roleOpts" />
      </div>
      <p v-if="err" class="err">{{ err }}</p>
      <button class="btn" :disabled="busy" @click="create">Создать</button>
    </Modal>
  </div>
</template>
<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { api, ROLE_NAME } from '../../api.js'
import Modal from '../../components/Modal.vue'
import { usePager } from '../../lib/pager.js'
import Pager from '../../components/Pager.vue'
import Select from '../../components/Select.vue'
const stateOpts = [
  { value: '', label: 'Все' },
  { value: 'on', label: 'Активные' },
  { value: 'off', label: 'Заблокированные' },
]
const roleOpts = [
  { value: 'seller', label: 'Продавец' },
  { value: 'manager', label: 'Менеджер' },
]
const users = ref([])
const q = ref('')
const state = ref('')
const open = ref(false)
const busy = ref(false)
const err = ref('')
const form = reactive({ name: '', login: '', password: '', role: 'seller' })
const shown = computed(() =>
  users.value.filter((u) => {
    const n = q.value.trim().toLowerCase()
    const ok = !n || u.name.toLowerCase().includes(n) || u.login.toLowerCase().includes(n)
    if (!ok) return false
    if (state.value === 'on') return u.active
    if (state.value === 'off') return !u.active
    return true
  }),
)
const { page, size, total, pages, slice, from, to, reset } = usePager(shown)
watch([q, state], reset)
async function load() {
  users.value = (await api('/api/owner/users')).users
}
onMounted(load)
async function create() {
  err.value = ''
  busy.value = true
  try {
    await api('/api/owner/users', { method: 'POST', body: JSON.stringify(form) })
    form.name = form.login = form.password = ''
    form.role = 'seller'
    open.value = false
    await load()
  } catch (e) {
    err.value = e.message
  } finally {
    busy.value = false
  }
}
</script>
