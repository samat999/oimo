<template>
  <div v-if="item" class="overlay" @click.self="close">
    <div class="lightbox" :class="{ big: zoom }">
      <div class="modal-head">
        <h3>{{ item.model }} · {{ item.serial }}</h3>
        <button class="btn ghost" type="button" style="width: auto; padding: 6px 10px" @click="close">Закрыть</button>
      </div>
      <button class="lightbox-pic" type="button" @click="zoom = !zoom">
        <img :src="item.photoUrl" alt="" />
      </button>
      <p class="muted" style="margin: 8px 0 0; font-size: 12px">
        {{ zoom ? 'Нажмите, чтобы уменьшить' : 'Нажмите на фото, чтобы увеличить' }}
      </p>
    </div>
  </div>
</template>
<script setup>
import { ref, watch } from 'vue'
const props = defineProps({
  item: { type: Object, default: null },
})
const emit = defineEmits(['close'])
const zoom = ref(false)
watch(
  () => props.item,
  () => {
    zoom.value = false
  },
)
function close() {
  zoom.value = false
  emit('close')
}
</script>
