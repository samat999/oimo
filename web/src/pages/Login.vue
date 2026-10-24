<template>
  <div class="login">
    <form class="box" autocomplete="off" @submit.prevent="go">
      <div class="logo">OIM<span>O</span></div>
      <h1>Авторизация</h1>
      <div class="field">
        <label>Логин</label>
        <input v-model="login" name="login" autocomplete="off" autocapitalize="off" spellcheck="false" />
      </div>
      <div class="field">
        <label>Пароль</label>
        <input v-model="password" name="password" type="password" autocomplete="new-password" />
      </div>
      <p v-if="err" class="err">{{ err }}</p>
      <button class="btn" :disabled="busy">Войти</button>
    </form>
  </div>
</template>
<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { api, setAuth } from '../api.js'
const router = useRouter()
const login = ref('')
const password = ref('')
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
