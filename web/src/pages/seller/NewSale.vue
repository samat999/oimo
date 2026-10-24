<template>
  <div class="page">
    <div class="hello">
      <h1>Новая продажа</h1>
      <p>Каждая единица — отдельная запись. Неподтверждённые продажи не идут в KPI.</p>
    </div>
    <form class="card" @submit.prevent="send">
      <label class="cam">
        <input ref="file" type="file" accept="image/*" capture="environment" hidden @change="pick" />
        <img v-if="photo" :src="photo" alt="" />
        <span v-else>Нажмите, чтобы сфотографировать товар</span>
      </label>
      <div class="field" style="margin-top: 14px">
        <label>Модель / название</label>
        <input v-model="model" required placeholder="OIMO Air 2" />
      </div>
      <div class="field">
        <label>Серийный номер</label>
        <input v-model="serial" required placeholder="SN-000000" />
      </div>
      <div class="field">
        <label>Продажная стоимость, сом</label>
        <input v-model.number="price" type="number" min="1" required />
      </div>
      <div class="field">
        <label>Тип оплаты</label>
        <Select grow v-model="payment" :options="payOpts" />
      </div>
      <div class="field">
        <label>Комментарий</label>
        <textarea v-model="comment" rows="2" />
      </div>
      <p v-if="err" class="err">{{ err }}</p>
      <button class="btn" :disabled="busy">Отправить на проверку</button>
    </form>
  </div>
</template>
<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { api } from '../../api.js'
import Select from '../../components/Select.vue'
const router = useRouter()
const photo = ref('')
const model = ref('')
const serial = ref('')
const price = ref(null)
const payment = ref('Наличные')
const comment = ref('')
const types = ref(['Наличные', 'Перевод', 'Рассрочка'])
const payOpts = computed(() => types.value.map((p) => ({ value: p, label: p })))
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
