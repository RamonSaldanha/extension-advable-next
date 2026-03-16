<template>
  <div class="loader-overlay">
    <div class="loader-content">
      <div class="spinner-border text-primary me-2" role="status">
        <span class="visually-hidden">Carregando...</span>
      </div>
      <span>Carregando...</span>
    </div>
  </div>
</template>

<style scoped>
.loader-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(255, 255, 255, 0.8);
  z-index: 9999;
  display: flex;
  justify-content: center;
  align-items: center;
}

.loader-content {
  text-align: center;
}
</style>
