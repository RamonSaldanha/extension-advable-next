<template>
    <Layout>
        <template #header>
            <DefaultHeader />
        </template>
        <!-- Componentes dinâmicos baseados na URL atual -->
        <component v-if="currentComponent" :is="currentComponent"></component>

        <!-- Conteúdo padrão quando não há processo detectado -->
        <div v-else class="container mt-4">
            <div class="row">
                <div class="col-12">
                    <div class="card">
            
                        <div class="card-body">
                            <div class="empty-state">
                                <div class="empty-state-icon">
                                    <i class="bi bi-search"></i>
                                </div>
                                <h6 class="empty-state-title">Encontre seus processos</h6>
                                <p class="empty-state-description">
                                    Use o campo de busca
                                    <i class="bi bi-arrow-up text-primary mx-1"></i>
                                    acima para pesquisar processos
                                </p>
                                <div class="empty-state-hint">
                                    <i class="bi bi-lightbulb text-warning me-1"></i>
                                    <small class="text-muted">Digite o número do processo ou nome das partes</small>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </Layout>
</template>

<script setup>
import { ref, onMounted, watchEffect, shallowRef } from 'vue';
import Layout from '@/components/Layout.vue';
import DefaultHeader from '@/components/DefaultHeader.vue';

// Importar componentes de tribunais
import processPagePJESeabra from '@/components/tribunais/processPagePJESeabra.vue';
import processPagePJETrabalho from '@/components/tribunais/processPagePJETrabalho.vue';
import processPagePJEJfrn from '@/components/tribunais/processPagePJEJfrn.vue';

const currentUrl = ref('');
const currentComponent = shallowRef(null);
const currentComponentName = ref('');

onMounted(async () => {
  if (browser && browser.tabs) {
    browser.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
      if (tabs && tabs.length > 0) {
        currentUrl.value = tabs[0].url;
      }
    });
  }
});

// Lógica de redirecionamento automático para processos na aba ProcessIndex
watchEffect(() => {
  if (currentUrl.value.includes('https://pje.jfrn.jus.br/pje/Processo/ConsultaProcesso/')) {
    currentComponent.value = processPagePJEJfrn;
    currentComponentName.value = 'processPagePJEJfrn';
  } else if (currentUrl.value.includes('Processo/ConsultaProcesso/Detalhe/')) {
    currentComponent.value = processPagePJESeabra;
    currentComponentName.value = 'processPagePJESeabra';
  } else if (
    currentUrl.value.includes('jus.br/pjekz/processo/') ||
    currentUrl.value.includes('jus.br/consultaprocessual/detalhe-processo/')
  ) {
    currentComponent.value = processPagePJETrabalho;
    currentComponentName.value = 'processPagePJETrabalho';
  } else {
    // Não há processo detectado, mostra conteúdo padrão
    currentComponent.value = null;
    currentComponentName.value = '';
  }
});
</script>

<style scoped>
.card {
    border: 1px solid #dee2e6;
    border-radius: 0.375rem;
}

.empty-state {
    text-align: center;
    padding: 3rem 2rem;
}

.empty-state-icon {
    font-size: 3rem;
    color: #6c757d;
    margin-bottom: 1.5rem;
}

.empty-state-title {
    color: #495057;
    font-weight: 600;
    margin-bottom: 1rem;
}

.empty-state-description {
    color: #6c757d;
    margin-bottom: 1.5rem;
    font-size: 1rem;
}

.empty-state-hint {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.25rem;
    margin-top: 1rem;
}

.bi-arrow-up {
    animation: bounce 2s infinite;
}

@keyframes bounce {
    0%, 20%, 50%, 80%, 100% {
        transform: translateY(0);
    }
    40% {
        transform: translateY(-5px);
    }
    60% {
        transform: translateY(-3px);
    }
}
</style>
