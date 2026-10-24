<template>
  <div class="page">
    <div class="hello">
      <h1>Роли и доступ</h1>
      <p>Роль задаёт базовые права. У сотрудника можно включить или выключить модуль отдельно.</p>
    </div>
    <div class="filters">
      <button class="btn" :class="tab === 'roles' ? '' : 'ghost'" @click="tab = 'roles'">Роли</button>
      <button class="btn" :class="tab === 'people' ? '' : 'ghost'" @click="tab = 'people'">Сотрудники</button>
    </div>
    <div v-if="tab === 'roles'" class="card">
      <h3>{{ ROLE_NAME[role] }}</h3>
      <p class="sub">Владелец всегда видит всё. Меняйте продавца и менеджера.</p>
      <div class="filters">
        <Select v-model="role" :options="roleOpts" />
      </div>
      <AccessGrid v-if="roles[role]" v-model="roles[role]" :modules="modules" :locked="role === 'owner'" />
      <button class="btn head-btn" style="margin-top: 12px" :disabled="role === 'owner'" @click="saveRoles">Сохранить роль</button>
      <p v-if="msg" class="muted">{{ msg }}</p>
    </div>
    <div v-else class="card">
      <h3>Права сотрудника</h3>
      <p class="sub">Сначала роль, затем точечные галочки. Пустой сброс вернёт права роли.</p>
      <div class="field">
        <label>Сотрудник</label>
        <Select grow v-model="uid" placeholder="Выберите" :options="peopleOpts" @update:modelValue="pick" />
      </div>
      <template v-if="person">
        <AccessGrid v-model="grid" :modules="modules" />
        <div class="split" style="margin-top: 12px">
          <button class="btn" @click="savePerson">Сохранить сотруднику</button>
          <button class="btn ghost" @click="resetPerson">Как у роли</button>
        </div>
        <p v-if="msg" class="muted">{{ msg }}</p>
      </template>
    </div>
  </div>
</template>
<script setup>
import { computed, onMounted, ref } from 'vue'
import { api, ROLE_NAME } from '../../api.js'
import AccessGrid from '../../components/AccessGrid.vue'
import Select from '../../components/Select.vue'
const tab = ref('roles')
const role = ref('seller')
const modules = ref([])
const roles = ref({})
const users = ref([])
const uid = ref('')
const person = ref(null)
const grid = ref({})
const msg = ref('')
const roleOpts = [
  { value: 'seller', label: 'Продавец' },
  { value: 'manager', label: 'Менеджер' },
  { value: 'owner', label: 'Владелец', disabled: true },
]
const peopleOpts = computed(() => [
  { value: '', label: 'Выберите' },
  ...users.value.map((u) => ({ value: u.id, label: `${u.name} · ${ROLE_NAME[u.role]}` })),
])
onMounted(async () => {
  const d = await api('/api/owner/roles')
  modules.value = d.modules
  roles.value = d.roles
  users.value = (await api('/api/owner/users')).users
})
async function saveRoles() {
  msg.value = ''
  await api('/api/owner/roles', { method: 'POST', body: JSON.stringify({ roles: roles.value }) })
  msg.value = 'Роль сохранена. У сотрудников без своих галочек права обновятся сразу.'
}
async function pick() {
  msg.value = ''
  if (!uid.value) {
    person.value = null
    return
  }
  const d = await api('/api/owner/users/' + uid.value)
  person.value = d.user
  grid.value = JSON.parse(JSON.stringify(d.user.access || {}))
}
async function savePerson() {
  msg.value = ''
  await api('/api/owner/users/' + person.value.id, {
    method: 'POST',
    body: JSON.stringify({ name: person.value.name, login: person.value.login, access: grid.value }),
  })
  msg.value = 'Права сотрудника сохранены'
}
async function resetPerson() {
  await api('/api/owner/users/' + person.value.id, {
    method: 'POST',
    body: JSON.stringify({ name: person.value.name, login: person.value.login, access: {} }),
  })
  await pick()
  msg.value = 'Вернули права роли'
}
</script>
