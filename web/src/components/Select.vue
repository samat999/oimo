<template>
  <div class="sel" :class="{ open, mini, grow }" ref="root">
    <button type="button" class="sel-btn" :disabled="disabled" @click="toggle">
      <span class="sel-label" :class="{ ph: !current }">{{ current?.label || placeholder }}</span>
      <svg class="sel-caret" viewBox="0 0 12 12" aria-hidden="true">
        <path d="M2.2 4.3 6 8.1l3.8-3.8" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" />
      </svg>
    </button>
    <div class="sel-menu" v-if="open">
      <button
        v-for="o in options"
        :key="String(o.value)"
        type="button"
        class="sel-opt"
        :class="{ on: same(o.value), off: o.disabled }"
        :disabled="o.disabled"
        @click="pick(o)"
      >
        {{ o.label }}
      </button>
    </div>
  </div>
</template>
<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
const props = defineProps({
  modelValue: { type: [String, Number], default: '' },
  options: { type: Array, default: () => [] },
  placeholder: { type: String, default: 'Выберите' },
  disabled: { type: Boolean, default: false },
  mini: { type: Boolean, default: false },
  grow: { type: Boolean, default: false },
})
const emit = defineEmits(['update:modelValue'])
const root = ref(null)
const open = ref(false)
const current = computed(() => props.options.find((o) => same(o.value)))
function same(v) {
  return String(v) === String(props.modelValue)
}
function toggle() {
  if (props.disabled) return
  open.value = !open.value
}
function pick(o) {
  if (o.disabled) return
  emit('update:modelValue', o.value)
  open.value = false
}
function onDoc(e) {
  if (!root.value?.contains(e.target)) open.value = false
}
function onKey(e) {
  if (e.key === 'Escape') open.value = false
}
onMounted(() => {
  document.addEventListener('pointerdown', onDoc)
  document.addEventListener('keydown', onKey)
})
onBeforeUnmount(() => {
  document.removeEventListener('pointerdown', onDoc)
  document.removeEventListener('keydown', onKey)
})
</script>
