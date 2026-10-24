<template>
  <nav class="owner-nav">
    <router-link to="/owner" :class="{ on: $route.path === '/owner' }">Обзор</router-link>
    <router-link to="/owner/review" :class="{ on: $route.path === '/owner/review' }">Проверка</router-link>
    <router-link to="/journal" :class="{ on: $route.path === '/journal' }">Журнал</router-link>
    <router-link to="/owner/team" :class="{ on: $route.path === '/owner/team' }">Сотрудники</router-link>
    <router-link to="/owner/plans" :class="{ on: $route.path === '/owner/plans' }">Планы</router-link>
    <router-link to="/owner/kpi" :class="{ on: $route.path === '/owner/kpi' }">KPI</router-link>
  </nav>
</template>
