<!-- src/views/About.vue -->
<template>
  <Layout>
    <template #header>
      <DefaultHeader />
    </template>

    <div class="adbl-page">
      <div class="ad-page-head">
        <h1 class="ad-page-title">Sobre</h1>
        <p class="ad-page-sub">Esta é uma extensão em desenvolvimento.</p>
      </div>
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
