<!-- src/views/Dashboard.vue -->
<template>
  <Layout>
    <template #header>
      <DefaultHeader />
    </template>
    
    <component v-if="currentComponent" :is="currentComponent"></component>
    <div v-else class="adbl-page dashboard-content">
      <div v-if="errorMessage" class="adbl-empty">
        <i class="bi bi-exclamation-circle"></i>
        <p>{{ errorMessage }}</p>
      </div>
      <div v-else>
        <!-- Calendário de Tarefas -->
        <h2 class="ad-section-title">Calendário</h2>
        <div class="adbl-card cal-card">
          <div class="adbl-card__body">
            <TaskCalendar ref="taskCalendar" />
          </div>
        </div>

        <!-- Ranking dos Tribunais -->
        <h2 class="ad-section-title section-spaced">Ranking por Tribunal</h2>
        <div class="adbl-card">
          <div v-if="isLoading" class="adbl-card__body">
            <p class="loading-text">Carregando...</p>
          </div>
          <ul v-else class="rank-list">
            <li v-for="(court, index) in topCourts" :key="court.court_systems_id">
              <a
                :href="court.court_system.private_page"
                target="_blank"
                class="rank-item"
              >
                <span class="rank-pos">{{ index + 1 }}</span>
                <div class="rank-info">
                  <div class="rank-name">{{ court.court_system.title }}</div>
                  <div class="rank-slug">{{ court.court_system.slug || 'N/A' }}</div>
                </div>
                <span class="rank-count">{{ court.process_count }}</span>
                <i class="bi bi-chevron-right rank-chev"></i>
              </a>
            </li>
          </ul>
        </div>
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
.section-spaced {
  margin-top: 20px;
}

.cal-card :deep(.adbl-card__body) {
  padding: 12px;
}

.loading-text {
  margin: 0;
  color: var(--ad-muted, #8b93a3);
  font-size: 13.5px;
}

/* ── Ranking por tribunal ── */
.rank-list {
  list-style: none;
  margin: 0;
  padding: 0;
}

.rank-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 13px 16px;
  border-top: 1px solid var(--ad-line, #e6e8ee);
  text-decoration: none;
  color: inherit;
  transition: background-color 0.15s ease;
}

.rank-list li:first-child .rank-item {
  border-top: none;
}

.rank-item:hover {
  background-color: #f7f8fa;
}

.rank-pos {
  flex-shrink: 0;
  width: 26px;
  height: 26px;
  border-radius: 8px;
  background: var(--ad-navy, #16223f);
  color: #fff;
  font-size: 12.5px;
  font-weight: 700;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.rank-info {
  flex: 1;
  min-width: 0;
}

.rank-name {
  font-size: 13.5px;
  font-weight: 600;
  color: var(--ad-ink, #1a2233);
  line-height: 1.3;
}

.rank-slug {
  font-size: 12px;
  color: var(--ad-muted, #8b93a3);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.rank-count {
  flex-shrink: 0;
  min-width: 26px;
  height: 22px;
  padding: 0 8px;
  border-radius: 999px;
  background: #eef1f7;
  color: var(--ad-navy, #16223f);
  font-size: 12px;
  font-weight: 700;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.rank-chev {
  flex-shrink: 0;
  color: var(--ad-muted, #8b93a3);
  font-size: 13px;
}
</style>
