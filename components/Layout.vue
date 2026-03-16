<!-- src/components/Layout.vue -->
<template>
  <div id="adbl-popup" class="offcanvas-layout">
    <div class="card h-100">
      <!-- Header condicional -->
      <div v-if="$slots.header" class="card-header">
        <slot name="header"></slot>
      </div>

      <!-- Corpo do card -->
      <div class="card-body flex-grow-1 overflow-auto">
        <slot></slot>
      </div>

      <!-- Footer condicional -->
      <div v-if="$slots.footer" class="card-footer">
        <slot name="footer"></slot>
      </div>
    </div>
  </div>
</template>

<style scoped>
#adbl-popup {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.offcanvas-layout .card {
  border: none;
  border-radius: 0;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.card-header {
  flex-shrink: 0;
  border-bottom: none;
  background-color: transparent;
  padding: 0;
}

.card-body {
  flex: 1;
  overflow-y: auto;
  padding: 0;
}

.card-footer {
  flex-shrink: 0;
  border-top: 1px solid #dee2e6;
  background-color: #f8f9fa;
  padding: 1rem;
}
</style>
