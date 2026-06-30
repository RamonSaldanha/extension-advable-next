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
        <div v-if="dashboardError" class="dashboard-alert">
          <i class="bi bi-exclamation-circle"></i>
          <span>{{ dashboardError }}</span>
        </div>

        <!-- Calendário de Tarefas -->
        <h2 class="ad-section-title">Calendário</h2>
        <div class="adbl-card cal-card">
          <div class="adbl-card__body">
            <TaskCalendar ref="taskCalendar" />
          </div>
        </div>

        <!-- Processos protocolados por mês -->
        <h2 class="ad-section-title section-spaced">Processos Protocolados</h2>
        <div class="adbl-card chart-card">
          <div class="adbl-card__body">
            <p v-if="isLoading" class="loading-text">Carregando...</p>
            <div v-else class="column-chart" aria-label="Processos protocolados por mês">
              <div
                v-for="bar in processMonthBars"
                :key="bar.key"
                class="column-chart__item"
                :title="`${bar.label}: ${bar.value}`"
              >
                <span class="column-chart__value">{{ bar.value }}</span>
                <span class="column-chart__plot">
                  <span class="column-chart__bar column-chart__bar--rose" :style="{ height: bar.height }"></span>
                </span>
                <span class="column-chart__label">{{ bar.label }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Ranking dos Sistemas -->
        <h2 class="ad-section-title section-spaced">Ranking por Sistema</h2>
        <div class="adbl-card chart-card">
          <div class="adbl-card__body">
            <p v-if="isLoading" class="loading-text">Carregando...</p>
            <p v-else-if="courtBars.length === 0" class="loading-text">Nenhum sistema com processos.</p>
            <div v-else class="column-chart column-chart--ranking" aria-label="Ranking por sistema">
              <component
                :is="bar.url ? 'a' : 'div'"
                v-for="bar in courtBars"
                :key="bar.key"
                :href="bar.url"
                :target="bar.url ? '_blank' : undefined"
                :rel="bar.url ? 'noopener noreferrer' : undefined"
                class="column-chart__item column-chart__item--link"
                :title="`${bar.title}: ${bar.value}`"
              >
                <span class="column-chart__value">{{ bar.value }}</span>
                <span class="column-chart__plot">
                  <span class="column-chart__bar" :style="{ height: bar.height }"></span>
                </span>
                <span class="column-chart__label column-chart__label--system">{{ bar.label }}</span>
              </component>
            </div>
          </div>
        </div>
      </div>
    </div>
  </Layout>
</template>

<script setup>
// import { useRouter } from 'vue-router'
import { ref, onMounted, watch, shallowRef, computed } from 'vue';
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
const dashboardError = ref('');
const processesPerMonth = ref({ labels: [], data: [] });

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

function makeBars(labels = [], data = []) {
  const values = labels.map((label, index) => ({
    key: `${label}-${index}`,
    label,
    value: Number(data[index] || 0),
  }));
  const max = Math.max(...values.map((bar) => bar.value), 1);

  return values.map((bar) => ({
    ...bar,
    height: bar.value > 0 ? `${Math.max((bar.value / max) * 100, 7)}%` : '0%',
  }));
}

function systemAbbreviation(court) {
  const system = court?.court_system || {};
  const slug = system.slug || system.system_name;

  if (slug) {
    return String(slug).replace(/\s+/g, '').toUpperCase() || 'N/A';
  }

  return String(system.title || 'N/A')
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word[0])
    .join('')
    .slice(0, 8)
    .toUpperCase() || 'N/A';
}

const processMonthBars = computed(() => makeBars(
  processesPerMonth.value.labels || [],
  processesPerMonth.value.data || [],
));

const courtBars = computed(() => {
  const values = topCourts.value.map((court) => ({
    key: court.court_systems_id,
    label: systemAbbreviation(court),
    title: court.court_system?.title || court.court_system?.slug || 'Sistema',
    value: Number(court.process_count || 0),
    url: court.court_system?.private_page || null,
  }));
  const max = Math.max(...values.map((bar) => bar.value), 1);

  return values.map((bar) => ({
    ...bar,
    height: bar.value > 0 ? `${Math.max((bar.value / max) * 100, 10)}%` : '0%',
  }));
});

async function fetchDashboardData() {
  const teamId = user.value?.current_team_id;
  if (!teamId) {
    console.error('team_id não encontrado no localStorage');
    return;
  }

  isLoading.value = true;
  dashboardError.value = '';

  try {
    const [statsResponse, topCourtsResponse] = await Promise.all([
      api.get('/dashboard/stats'),
      api.get('/top-court-systems'),
    ]);

    processesPerMonth.value = statsResponse.data?.processes_per_month || { labels: [], data: [] };
    topCourts.value = Array.isArray(topCourtsResponse.data) ? topCourtsResponse.data : [];
  } catch (error) {
    dashboardError.value = 'Não foi possível carregar os dados do dashboard.';
    console.error('Erro ao buscar os dados do dashboard:', error);
  } finally {
    isLoading.value = false;
  }
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
// Apenas exibe o conteúdo padrão
watch(() => user.value?.current_team_id, (teamId) => {
  currentComponent.value = null;
  currentComponentName.value = '';
  if (teamId) fetchDashboardData();
}, { immediate: true });
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

.dashboard-alert {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
  padding: 10px 12px;
  border-radius: 12px;
  background: #fff4e8;
  color: #9a4b08;
  font-size: 13px;
}

.chart-card :deep(.adbl-card__body) {
  padding: 14px 12px 12px;
}

.column-chart {
  display: flex;
  align-items: stretch;
  gap: 8px;
  min-height: 188px;
  overflow-x: auto;
  padding-bottom: 2px;
}

.column-chart--ranking {
  gap: 14px;
  justify-content: space-around;
}

.column-chart__item {
  flex: 1 0 34px;
  min-width: 34px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-end;
  gap: 6px;
  color: inherit;
  text-decoration: none;
}

.column-chart--ranking .column-chart__item {
  flex-basis: 48px;
  min-width: 48px;
}

.column-chart__item--link:hover .column-chart__bar {
  background: #0f1a32;
}

.column-chart__value {
  min-height: 16px;
  color: var(--ad-ink, #1a2233);
  font-size: 11.5px;
  font-weight: 700;
}

.column-chart__plot {
  width: 100%;
  height: 124px;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  border-bottom: 1px solid var(--ad-line, #e6e8ee);
}

.column-chart__bar {
  width: 72%;
  max-width: 30px;
  min-height: 2px;
  border-radius: 8px 8px 2px 2px;
  background: var(--ad-navy, #16223f);
  transition: height 0.2s ease, background-color 0.15s ease;
}

.column-chart__bar--rose {
  background: #9e2755;
}

.column-chart__label {
  max-width: 48px;
  color: var(--ad-muted, #8b93a3);
  font-size: 10.5px;
  line-height: 1.15;
  text-align: center;
  white-space: normal;
}

.column-chart__label--system {
  max-width: 64px;
  color: var(--ad-ink, #1a2233);
  font-weight: 700;
}
</style>
