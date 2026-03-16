<!-- App.vue -->
<template>
  <div class="adbl-container">
    <div v-if="processNumber && !isViewingProcessInternally" class="process-found">
      Acessando o processo n.º
      <router-link :to="{ name: 'ProcessIndex' }">
        {{ processNumber }}
      </router-link>
    </div>
    <router-view></router-view>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue';
import { useRoute } from 'vue-router';

const route = useRoute();
const processNumber = ref('');

// Computed para verificar se estamos visualizando um processo internamente na extensão
const isViewingProcessInternally = computed(() => {
  return route.name === 'ProcessView';
});

function findProcessNumber(html) {
  const processPattern = /\s*(\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4})[A-Za-z]?\s*/;
  const matches = html.match(processPattern);
  return matches ? matches[0] : null;
}

async function getCurrentTabHtml() {
  try {
    const response = await browser.runtime.sendMessage({ type: 'GET_CURRENT_TAB_HTML' });
    return response?.html || '';
  } catch {
    return '';
  }
}

onMounted(async () => {
  if (typeof browser !== 'undefined' && browser.tabs) {
    try {
      const tabs = await browser.tabs.query({ active: true, currentWindow: true });
      if (tabs && tabs.length > 0) {
        const html = await getCurrentTabHtml();
        processNumber.value = findProcessNumber(html);
      }
    } catch (error) {
      console.error('Erro ao obter HTML:', error);
    }
  }
});
</script>

<style scoped>

</style>
