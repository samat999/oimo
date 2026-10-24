<template>
  <div v-if="open" class="overlay" @click.self="$emit('close')">
    <div class="modal" role="dialog">
      <div class="modal-head">
        <h3>{{ title }}</h3>
        <button class="btn ghost" style="width: auto; padding: 6px 10px" @click="$emit('close')">Закрыть</button>
      </div>
      <slot />
    </div>
  </div>
</template>
<script setup>
defineProps({ open: Boolean, title: { type: String, default: '' } })
defineEmits(['close'])
</script>
