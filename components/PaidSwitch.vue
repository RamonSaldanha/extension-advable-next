<!-- PaidSwitch.vue — toggle compacto de "Pago" (switch + rótulo), como na web. -->
<template>
  <label class="fin-switch" :title="paid ? 'Marcar como não pago' : 'Marcar como pago'">
    <input
      class="fin-switch__input"
      type="checkbox"
      :checked="paid"
      @change="$emit('change', $event.target.checked)"
    />
    <span class="fin-switch__track"><span class="fin-switch__thumb"></span></span>
    <span v-if="showLabel" class="fin-switch__label">Pago</span>
  </label>
</template>

<script setup>
defineProps({
  paid: { type: Boolean, default: false },
  // Mostra o texto "Pago". Nas listas o chip de situação já indica, então é
  // desligado para evitar redundância; no modal fica ligado (não há chip lá).
  showLabel: { type: Boolean, default: true },
});
defineEmits(['change']);
</script>
