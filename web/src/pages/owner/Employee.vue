<template>
  <div class="page" v-if="user">
    <p class="muted"><router-link to="/owner/team">Сотрудники</router-link> / {{ user.name }}</p>
    <div class="hello">
      <h1>{{ user.name }}</h1>
      <p>{{ user.login }} · {{ ROLE_NAME[user.role] }} · {{ user.active ? 'активен' : 'заблокирован' }}</p>
    </div>
    <div class="kpis">
      <div class="kpi"><div class="label">Продажи недели</div><b>{{ d.kpis?.sales?.value || 0 }}</b></div>
      <div class="kpi"><div class="label">План</div><b>{{ d.plan?.fact || 0 }} / {{ d.plan?.pieces || 0 }}</b></div>
      <div class="kpi"><div class="label">Зарплата</div><b>{{ som(d.kpis?.salary?.value) }}</b></div>
      <div class="kpi"><div class="label">Место</div><b>{{ d.place }}</b></div>
    </div>
    <div class="card" style="margin-top: 12px">
      <h3>Профиль</h3>
      <p class="sub">Изменения вступают сразу. Пустой пароль не меняет текущий.</p>
      <div class="field"><label>Имя</label><input v-model="form.name" /></div>
      <div class="field"><label>Логин</label><input v-model="form.login" /></div>
      <div class="field">
        <label>Роль</label>
        <Select grow v-model="form.role" :options="roleOpts" />
      </div>
      <div class="field"><label>Новый пароль</label><input v-model="form.password" type="password" autocomplete="new-password" /></div>
      <h3 style="margin-top: 8px">Модули</h3>
      <p class="sub">Видимость и право менять данные. Снимается поверх роли.</p>
      <AccessGrid v-model="form.access" :modules="modules" />
      <p v-if="msg" class="muted">{{ msg }}</p>
      <p v-if="err" class="err">{{ err }}</p>
      <div class="split">
        <button class="btn" @click="save">Сохранить</button>
        <button class="btn ghost" @click="toggle">{{ user.active ? 'Заблокировать' : 'Разблокировать' }}</button>
      </div>
    </div>
    <div class="card" style="margin-top: 12px">
      <h3>Последние отчёты</h3>
      <div v-for="s in slice" :key="s.id" class="row">
        <div>
          <b>{{ s.model }}</b>
          <div class="muted">{{ s.serial }} · {{ s.price }} сом</div>
        </div>
        <span class="pill" :class="s.status">{{ STATUS[s.status] }}</span>
      </div>
      <p v-if="!recent.length" class="muted">Пока нет отчётов.</p>
      <Pager v-model:page="page" v-model:size="size" :total="total" :pages="pages" :from="from" :to="to" />
    </div>
  </div>
</template>
<script setup>
import { onMounted, reactive, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { api, ROLE_NAME, som } from '../../api.js'
import { STATUS } from '../../lib/labels.js'
import AccessGrid from '../../components/AccessGrid.vue'
import { MODULES } from '../../lib/modules.js'
import { usePager } from '../../lib/pager.js'
import Pager from '../../components/Pager.vue'
import Select from '../../components/Select.vue'
const roleOpts = [
  { value: 'seller', label: 'Продавец' },
  { value: 'manager', label: 'Менеджер' },
]
const route = useRoute()
const user = ref(null)
const d = ref({})
const recent = ref([])
const { page, size, total, pages, slice, from, to, reset } = usePager(recent)
const form = reactive({ name: '', login: '', password: '', role: 'seller', access: {} })
const modules = MODULES
const msg = ref('')
const err = ref('')
async function load() {
  reset()
  const r = await api('/api/owner/users/' + route.params.id)
  user.value = r.user
  d.value = r.stats || {}
  recent.value = r.recent || []
  form.name = r.user.name
  form.login = r.user.login
  form.role = r.user.role
  form.access = JSON.parse(JSON.stringify(r.user.access || {}))
  form.password = ''
}
onMounted(load)
watch(() => route.params.id, load)
async function save() {
  err.value = ''
  msg.value = ''
  try {
    const r = await api('/api/owner/users/' + user.value.id, {
      method: 'POST',
      body: JSON.stringify({
        name: form.name,
        login: form.login,
        password: form.password,
        role: form.role,
        access: form.access,
      }),
    })
    user.value = r.user
    form.password = ''
    msg.value = 'Сохранено'
  } catch (e) {
    err.value = e.message
  }
}
async function toggle() {
  await api('/api/owner/users/' + user.value.id + '/toggle', { method: 'POST', body: '{}' })
  await load()
}
</script>
