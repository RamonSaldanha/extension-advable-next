<!-- src/views/Dashboard.vue -->
<template>
  <Layout>
    <template #header>
      <DefaultHeader />
    </template>
    
    <component v-if="currentComponent" :is="currentComponent"></component>
    <div v-else class="dashboard-content">
      <div v-if="errorMessage">
        <p>{{ errorMessage }}</p>
      </div>
      <div v-else>
        <!-- Calendário de Tarefas -->
        <Card title="Calendário de Tarefas" icon="bi-calendar3" class="mb-3">
          <template #body>
            <TaskCalendar ref="taskCalendar" />
          </template>
        </Card>

        <!-- Ranking dos Tribunais -->
        <Card title="Ranking por Tribunal" icon="bi-building">
          <template #listGroup>
            <div v-if="isLoading" class="mt-3">
              <p class="p-3">Carregando...</p>
            </div>
            <div class="list-group list-group-flush" v-else>
              <a
                v-for="(court, index) in topCourts"
                :key="court.court_systems_id"
                :href="court.court_system.private_page"
                target="_blank"
                class="list-group-item p-3 list-group-item-action d-flex justify-content-between align-items-center"
              >
                <div class="d-flex align-items-center">
                  <div class="ranking-position me-3">
                    <span class="badge bg-primary">#{{ index + 1 }}</span>
                  </div>
                  <div>
                    <p class="fw-semibold mb-1">{{ court.court_system.title }}</p>
                    <div class="text-muted small">{{ court.court_system.slug || 'N/A' }}</div>
                  </div>
                </div>
                <div class="ranking-count">
                  <span class="badge bg-secondary">{{ court.process_count }} processos</span>
                  <span class="ms-2"><i class="bi bi-caret-right-fill"></i></span>
                </div>
              </a>
            </div>
          </template>
        </Card>
      </div>
    </div>
  </Layout>
</template>

<script setup>
// import { useRouter } from 'vue-router'
import { ref, onMounted, watchEffect, shallowRef, computed } from 'vue';
import { useRouter } from 'vue-router'

const router = useRouter()
import Layout from '@/components/Layout.vue';
import DefaultHeader from '@/components/DefaultHeader.vue';
import { useAuthStore } from '@/stores/auth';
import api from '@/api/axios';

import Card from '@/components/Card.vue';
import TaskCalendar from '@/components/TaskCalendar.vue';

const isLoading = ref(false);
const auth = useAuthStore();
const user = computed(() => auth.user);
const topCourts = ref([]);

import processPagePJESeabra from '@/components/tribunais/processPagePJESeabra.vue';
import processPagePJETrabalho from '@/components/tribunais/processPagePJETrabalho.vue';
import processPagePJEJfrn from '@/components/tribunais/processPagePJEJfrn.vue';
import WhatsappCRM from '@/components/WhatsappCRM.vue';

const currentUrl = ref('');
const currentComponent = shallowRef(null);
const currentComponentName = ref('');
const errorMessage = ref('');

const chatId = ref(null)
const chatName = ref(null)
const taskCalendar = ref(null)

function fetchTopCourts() {
  const teamId = user.value?.current_team_id;
  isLoading.value = true;
  if (!teamId) {
    console.error('team_id não encontrado no localStorage');
    return;
  }

  api.get(`/top-court-systems`)
    .then(response => {
      isLoading.value = false;
      topCourts.value = response.data;
    })
    .catch(error => {
      isLoading.value = false;
      console.error('Erro ao buscar os tribunais:', error);
    });
}

onMounted(async () => {
  // Verificar se há um chat armazenado
  try {
    const result = await browser.storage.local.get(['currentChat']);
    if (result.currentChat) {
      chatId.value = result.currentChat.chatId;
      chatName.value = result.currentChat.chatName;
    }
  } catch (e) {
    console.error('Erro ao buscar chat armazenado:', e);
  }

  if (browser && browser.tabs) {
    try {
      const tabs = await browser.tabs.query({ active: true, currentWindow: true });
      if (tabs && tabs.length > 0) {
        currentUrl.value = tabs[0].url;
      }
    } catch (e) {
      console.error('Erro ao buscar aba ativa:', e);
    }
  }
});

// Função para atualizar o chat
const updateChat = (info) => {
  // Verificar se o chat realmente mudou
  if (chatId.value === info.chatId && chatName.value === info.chatName) {
    return;
  }
  
  chatId.value = info.chatId
  chatName.value = info.chatName
  console.log('Chat atualizado:', info)
  
  // Armazenar o chat atual
  browser.storage.local.set({ currentChat: info });
  
  // Não redirecionar automaticamente mais
  // O usuário deve ir manualmente para a aba WhatsApp
}

// Função para redirecionar para a página de pessoa
const redirectToPerson = () => {
  router.push({
    name: 'Person',
    params: {
      chatId: chatId.value,
      chatName: chatName.value
    }
  })
}

// Dashboard não escuta mudanças de chat do WhatsApp
// Redirecionamento automático é responsabilidade da aba WhatsApp

const getChat = async () => {
  try {
    const tabs = await browser.tabs.query({ active: true, currentWindow: true });
    if (tabs && tabs.length > 0) {
      const response = await browser.tabs.sendMessage(tabs[0].id, { type: 'GET_WHATSAPP_CHAT_ID' });
      if (response && response.chatId) {
        updateChat(response);
      }
    }
  } catch (e) {
    console.error('Erro ao obter chat:', e);
  }
}

const whatsappCall = () => {
  getChat();
};

// Dashboard não executa redirecionamentos automáticos
// Apenas exibe o ranking de tribunais
watchEffect(() => {
  // Dashboard sempre mostra o conteúdo padrão (ranking de tribunais)
  currentComponent.value = null;
  currentComponentName.value = '';
  fetchTopCourts();
});
</script>

<style scoped>

.ranking-position .badge {
  min-width: 32px;
  font-weight: 600;
  font-size: 0.75rem;
}

.ranking-count .badge {
  font-weight: 600;
  font-size: 0.7rem;
}

.list-group-item {
  transition: all 0.2s ease;
  border-left: 3px solid transparent;
}

.list-group-item:hover {
  background-color: #f8f9fa;
  border-left-color: #0d6efd;
  transform: translateX(2px);
}

.mb-3 {
  margin-bottom: 1rem;
}
</style>
