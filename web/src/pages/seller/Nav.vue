<template>
  <nav class="tabs">
    <router-link to="/" :class="{ on: $route.path === '/' }">Главная</router-link>
    <router-link to="/new" :class="{ on: $route.path === '/new' }">Продажа</router-link>
    <router-link to="/journal" :class="{ on: $route.path === '/journal' }">Журнал</router-link>
    <router-link to="/rank" :class="{ on: $route.path === '/rank' }">Рейтинг</router-link>
  </nav>
</template>
