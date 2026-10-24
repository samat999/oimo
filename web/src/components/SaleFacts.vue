<template>
  <div class="sale">
    <div class="sale-head">
      <div>
        <h3>{{ sale.model }}</h3>
        <p v-if="seller" class="muted">{{ seller }}</p>
      </div>
      <div class="sale-sum">{{ som(sale.price) }}</div>
    </div>
    <div class="sale-grid">
      <div>
        <small>Серийный</small>
        <b>{{ sale.serial }}</b>
      </div>
      <div>
        <small>Оплата</small>
        <b>{{ sale.payment }}</b>
      </div>
      <div>
        <small>Комментарий</small>
        <b>{{ sale.comment || '—' }}</b>
      </div>
    </div>
    <p v-if="sale.rejectReason" class="err" style="margin: 8px 0 0">{{ sale.rejectReason }}</p>
  </div>
</template>
<script setup>
import { som } from '../api.js'
defineProps({
  sale: { type: Object, required: true },
  seller: { type: String, default: '' },
})
</script>
