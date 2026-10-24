<template>
  <div class="table-scroll">
    <table class="table">
      <thead>
        <tr>
          <th>Модуль</th>
          <th>Видит</th>
          <th>Редактирует</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="m in modules" :key="m.id">
          <td>{{ m.label }}</td>
          <td><input type="checkbox" :checked="!!modelValue[m.id]?.view" :disabled="locked" @change="set(m.id, 'view', $event.target.checked)" /></td>
          <td><input type="checkbox" :checked="!!modelValue[m.id]?.edit" :disabled="locked" @change="set(m.id, 'edit', $event.target.checked)" /></td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
<script setup>
const props = defineProps({
  modelValue: { type: Object, required: true },
  modules: { type: Array, default: () => [] },
  locked: Boolean,
})
const emit = defineEmits(['update:modelValue'])
function set(id, key, val) {
  const next = JSON.parse(JSON.stringify(props.modelValue || {}))
  next[id] = { view: false, edit: false, ...(next[id] || {}), [key]: val }
  emit('update:modelValue', next)
}
</script>
