<!-- src/views/About.vue -->
<template>
  <Layout>
    <template #header>
      <DefaultHeader />
    </template>

    <div>
      <h1>Sobre</h1>
      <p>Esta é uma extensão em desenvolvimento.</p>
    </div>

    <template #footer>
      <p class="text-center">© 2022 Advable LTDA.</p>
    </template>
  </Layout>
</template>

<script setup>
import Layout from '@/components/Layout.vue';
import DefaultHeader from '@/components/DefaultHeader.vue';
</script>

<style scoped>
</style>
