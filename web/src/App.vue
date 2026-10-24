<template>
  <router-view v-if="isLogin" />
  <div v-else class="shell">
    <aside class="side">
      <div class="side-brand">OIMO<small>Sales CRM</small></div>
      <nav>
        <template v-for="g in menu" :key="g.group">
          <p class="side-group">{{ g.group }}</p>
          <router-link
            v-for="i in g.items"
            :key="i.to"
            :to="i.to"
            :class="{ on: active(i) }"
          >
            <Icon :name="i.icon" />
            <span>{{ i.label }}</span>
          </router-link>
        </template>
      </nav>
      <component
        :is="leaderLink ? 'router-link' : 'div'"
        v-if="leaders.week"
        class="side-race"
        :to="leaderLink"
      >
        <small>Лидер недели</small>
        <b>{{ leaders.week.name }}</b>
        <span>{{ leaders.week.pieces }} продаж</span>
      </component>
      <div class="side-user">
        <b>{{ user?.name }}</b>
        <span>{{ ROLE_NAME[user?.role] || user?.role }}</span>
        <button class="btn ghost" type="button" @click="out">Выйти</button>
      </div>
    </aside>
    <div class="main">
      <header class="topbar">
        <div class="mob-brand">OIMO</div>
        <router-link class="search" to="/journal">
          <Icon name="search" />
          <span>Серийный, модель, сотрудник</span>
        </router-link>
        <router-link v-if="can('sale', 'edit')" to="/new" class="btn">+ Продажа</router-link>
        <router-link v-else-if="can('review')" to="/owner/review" class="btn">Проверка</router-link>
      </header>
      <router-view />
      <nav class="tabs" :class="{ five: tabs.main.length + (tabs.extra.length ? 1 : 0) === 5 }">
        <router-link v-for="i in tabs.main" :key="i.to" :to="i.to" :class="{ on: active(i) }">
          <Icon :name="i.icon" />
          <span>{{ i.short }}</span>
        </router-link>
        <button v-if="tabs.extra.length" type="button" :class="{ on: more }" @click="more = true">
          <Icon name="more" />
          <span>Ещё</span>
        </button>
      </nav>
    </div>
    <div v-if="more" class="overlay" @click.self="more = false">
      <div class="more-sheet">
        <div class="modal-head">
          <h3>Модули</h3>
          <button class="btn ghost" type="button" @click="more = false">Закрыть</button>
        </div>
        <router-link v-for="i in tabs.extra" :key="i.to" :to="i.to" class="more-item" @click="more = false">
          <Icon :name="i.icon" />
          <span>{{ i.label }}</span>
        </router-link>
        <button class="more-item" type="button" @click="out">
          <Icon name="logout" />
          <span>Выйти</span>
        </button>
      </div>
    </div>
  </div>
</template>
<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { api, can, getToken, getUser, logout, ROLE_NAME, setUser } from './api.js'
import Icon from './components/Icon.vue'
const route = useRoute()
const router = useRouter()
const isLogin = computed(() => route.path === '/login')
const user = ref(getUser())
const leaders = ref({})
const more = ref(false)
watch(() => route.fullPath, () => {
  user.value = getUser()
  more.value = false
}, { immediate: true })
onMounted(async () => {
  if (!getToken()) return
  try {
    const me = await api('/api/me')
    setUser(me.user)
    user.value = me.user
    leaders.value = me.leaders || {}
  } catch {
    /* keep cached user */
  }
})
const menu = computed(() => {
  const u = user.value
  if (!u) return []
  const see = (m) => can(m)
  const groups = []
  const work = []
  if (see('home') && u.role !== 'seller') work.push({ to: '/owner', label: 'Главная', short: 'Главная', icon: 'home', match: (p) => p === '/owner' })
  if (see('home') && u.role === 'seller') work.push({ to: '/', label: 'Главная', short: 'Главная', icon: 'home', match: (p) => p === '/' })
  if (see('sale')) work.push({ to: '/new', label: 'Продажа', short: 'Продажа', icon: 'sale' })
  if (see('review')) work.push({ to: '/owner/review', label: 'Проверка', short: 'Проверка', icon: 'review' })
  if (see('journal') || see('sales')) work.push({ to: '/journal', label: 'Журнал', short: 'Журнал', icon: 'journal', match: (p) => p === '/journal' || p === '/sales' || p === '/owner/journal' })
  if (see('rank')) work.push({ to: '/rank', label: 'Гонка', short: 'Гонка', icon: 'rank' })
  if (work.length) groups.push({ group: 'Работа', items: work })
  const team = []
  if (see('team')) team.push({ to: '/owner/team', label: 'Сотрудники', short: 'Команда', icon: 'team', match: (p) => p.startsWith('/owner/team') })
  if (see('plans')) team.push({ to: '/owner/plans', label: 'Планы', short: 'Планы', icon: 'plans' })
  if (team.length) groups.push({ group: 'Команда', items: team })
  const pay = []
  if (see('kpi')) pay.push({ to: '/owner/kpi', label: 'KPI', short: 'KPI', icon: 'kpi' })
  if (see('access')) pay.push({ to: '/owner/access', label: 'Доступ', short: 'Доступ', icon: 'access' })
  if (pay.length) groups.push({ group: 'Настройки', items: pay })
  return groups
})
const menuFlat = computed(() => menu.value.flatMap((g) => g.items))
const tabs = computed(() => {
  const all = menuFlat.value
  if (all.length <= 4) return { main: all, extra: [] }
  const prefer = ['/owner', '/', '/owner/review', '/new', '/journal']
  const main = []
  for (const p of prefer) {
    const item = all.find((x) => x.to === p)
    if (item && !main.includes(item) && main.length < 3) main.push(item)
  }
  for (const item of all) {
    if (main.length >= 3) break
    if (!main.includes(item)) main.push(item)
  }
  return { main, extra: all.filter((x) => !main.includes(x)) }
})
const leaderLink = computed(() => {
  const w = leaders.value.week
  if (!w) return ''
  if (can('rank') && route.path !== '/rank') return '/rank'
  if (can('team') && w.userId) return '/owner/team/' + w.userId
  if (can('rank')) return '/rank'
  return ''
})
function active(i) {
  return i.match ? i.match(route.path) : route.path === i.to
}
function out() {
  more.value = false
  logout()
  router.replace('/login')
}
</script>
