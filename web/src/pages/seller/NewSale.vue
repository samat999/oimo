<template>
  <div class="page sale-page">
    <div class="hello">
      <h1>Новая продажа</h1>
      <p>Одна единица — один отчёт. В KPI попадёт после проверки.</p>
    </div>
    <form class="card sale-form" @submit.prevent="send">
      <label class="cam big">
        <input ref="file" type="file" accept="image/*" capture="environment" hidden @change="pick" />
        <img v-if="photo" :src="photo" alt="" />
        <span v-else>
          <b>Сфотографировать товар</b>
          серийник должен читаться
        </span>
      </label>
      <div class="field">
        <label>Модель</label>
        <input v-model="model" required placeholder="OIMO Air 2" enterkeyhint="next" />
      </div>
      <div class="field">
        <label>Серийный номер</label>
        <input v-model="serial" required placeholder="SN-000000" autocapitalize="characters" enterkeyhint="next" />
      </div>
      <div class="field">
        <label>Цена, сом</label>
        <input v-model.number="price" type="number" inputmode="numeric" min="1" required placeholder="0" />
      </div>
      <div class="field">
        <label>Оплата</label>
        <div class="pay-chips">
          <button v-for="p in types" :key="p" type="button" :class="{ on: payment === p }" @click="payment = p">{{ p }}</button>
        </div>
      </div>
      <div class="field">
        <label>Комментарий · необязательно</label>
        <textarea v-model="comment" rows="2" placeholder="Цвет, комплект, нюанс" />
      </div>
      <p v-if="err" class="err">{{ err }}</p>
      <div class="sale-sticky">
        <button class="btn" :disabled="busy">{{ busy ? 'Отправляем…' : 'Отправить на проверку' }}</button>
      </div>
    </form>
  </div>
</template>
<script setup>
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { api } from '../../api.js'
const router = useRouter()
const photo = ref('')
const model = ref('')
const serial = ref('')
const price = ref(null)
const payment = ref('Наличные')
const comment = ref('')
const types = ref(['Наличные', 'Перевод', 'Рассрочка'])
const err = ref('')
const busy = ref(false)
onMounted(async () => {
  const me = await api('/api/me')
  types.value = me.settings.paymentTypes
  payment.value = types.value[0]
})
function pick(e) {
  const f = e.target.files?.[0]
  if (!f) return
  const r = new FileReader()
  r.onload = () => {
    photo.value = String(r.result)
  }
  r.readAsDataURL(f)
}
async function send() {
  err.value = ''
  busy.value = true
  try {
    await api('/api/sales', {
      method: 'POST',
      body: JSON.stringify({ photo: photo.value, model: model.value, serial: serial.value, price: price.value, payment: payment.value, comment: comment.value }),
    })
    router.replace('/journal')
  } catch (e) {
    err.value = e.message
  } finally {
    busy.value = false
  }
}
</script>
