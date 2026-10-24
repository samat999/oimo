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
            :class="{ on: i.match ? i.match($route.path) : $route.path === i.to }"
          >
            {{ i.label }}
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
        {{ user?.name }}
        <span>{{ ROLE_NAME[user?.role] || user?.role }}</span>
        <button class="btn ghost" style="margin-top: 10px" @click="out">Выйти</button>
      </div>
    </aside>
    <div class="main">
      <header class="topbar">
        <div class="search">Поиск по серийному, модели, сотруднику</div>
        <router-link v-if="can('sale', 'edit')" to="/new" class="btn">+ Продажа</router-link>
        <router-link v-else-if="can('review')" to="/owner/review" class="btn">Проверка</router-link>
      </header>
      <router-view />
      <nav class="tabs" :class="{ wide: menuFlat.length > 4 }">
        <router-link v-for="i in menuFlat" :key="i.to" :to="i.to" :class="{ on: i.match ? i.match($route.path) : $route.path === i.to }">
          {{ i.short || i.label }}
        </router-link>
      </nav>
    </div>
  </div>
</template>
<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { api, can, getToken, getUser, logout, ROLE_NAME, setUser } from './api.js'
const route = useRoute()
const router = useRouter()
const isLogin = computed(() => route.path === '/login')
const user = ref(getUser())
const leaders = ref({})
watch(() => route.fullPath, () => { user.value = getUser() }, { immediate: true })
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
  if (see('home') && u.role !== 'seller') work.push({ to: '/owner', label: 'Главная', short: 'Главная', match: (p) => p === '/owner' })
  if (see('home') && u.role === 'seller') work.push({ to: '/', label: 'Главная', short: 'Главная', match: (p) => p === '/' })
  if (see('sale')) work.push({ to: '/new', label: 'Продажа', short: 'Продажа' })
  if (see('review')) work.push({ to: '/owner/review', label: 'Проверка', short: 'Проверка' })
  if (see('journal') || see('sales')) work.push({ to: '/journal', label: 'Журнал', short: 'Журнал', match: (p) => p === '/journal' || p === '/sales' || p === '/owner/journal' })
  if (see('rank')) work.push({ to: '/rank', label: 'Гонка', short: 'Гонка' })
  if (work.length) groups.push({ group: 'Работа', items: work })
  const team = []
  if (see('team')) team.push({ to: '/owner/team', label: 'Сотрудники', short: 'Команда', match: (p) => p.startsWith('/owner/team') })
  if (see('plans')) team.push({ to: '/owner/plans', label: 'Планы', short: 'Планы' })
  if (team.length) groups.push({ group: 'Команда', items: team })
  const pay = []
  if (see('kpi')) pay.push({ to: '/owner/kpi', label: 'KPI', short: 'KPI' })
  if (see('access')) pay.push({ to: '/owner/access', label: 'Доступ', short: 'Доступ' })
  if (pay.length) groups.push({ group: 'Настройки', items: pay })
  return groups
})
const menuFlat = computed(() => menu.value.flatMap((g) => g.items))
const leaderLink = computed(() => {
  const w = leaders.value.week
  if (!w) return ''
  if (can('rank') && route.path !== '/rank') return '/rank'
  if (can('team') && w.userId) return '/owner/team/' + w.userId
  if (can('rank')) return '/rank'
  return ''
})
function out() {
  logout()
  router.replace('/login')
}
</script>
