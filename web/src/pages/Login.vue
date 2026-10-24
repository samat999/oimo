<template>
  <div class="login">
    <form class="box" @submit.prevent="go">
      <div class="logo">OIM<span>O</span></div>
      <h1>Авторизация</h1>
      <div class="field">
        <label>Логин</label>
        <input v-model="login" autocomplete="username" />
      </div>
      <div class="field">
        <label>Пароль</label>
        <input v-model="password" type="password" autocomplete="current-password" />
      </div>
      <p v-if="err" class="err">{{ err }}</p>
      <button class="btn" :disabled="busy">Войти</button>
      <p class="muted" style="margin-top: 16px; font-size: 13px; text-align: center">
        Владелец: owner / Owner123<br />
        Продавец: aibek или alina / Seller123
      </p>
    </form>
  </div>
</template>
<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { api, setAuth } from '../api.js'
const router = useRouter()
const login = ref('aibek')
const password = ref('Seller123')
const err = ref('')
const busy = ref(false)
async function go() {
  err.value = ''
  busy.value = true
  try {
    const d = await api('/api/login', { method: 'POST', body: JSON.stringify({ login: login.value, password: password.value }) })
    setAuth(d)
    router.replace(d.start || (d.user.role === 'seller' ? '/' : '/owner'))
  } catch (e) {
    err.value = e.message
  } finally {
    busy.value = false
  }
}
</script>
