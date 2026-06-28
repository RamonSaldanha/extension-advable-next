<!-- src/components/DefaultHeader.vue -->
<template>
  <ChangeTeamModal 
    :isVisible="isChangeTeamModalVisible"
    @close="closeChangeTeamModal"
  />
  
  <!-- Navegação por ícones (perfil no mesmo nível) -->
  <nav class="nav-bar">
    <button class="nav-item" :class="{ active: activeTab === 'dashboard' }" @click="setActiveTab('dashboard')">
      <i class="bi bi-grid-1x2-fill nav-ico"></i>
      <span class="nav-label">Dashboard</span>
    </button>
    <button class="nav-item" :class="{ active: activeTab === 'processes' }" @click="setActiveTab('processes')">
      <i class="bi bi-hammer nav-ico"></i>
      <span class="nav-label">Processos</span>
    </button>
    <button class="nav-item" :class="{ active: activeTab === 'tasks' }" @click="setActiveTab('tasks')">
      <i class="bi bi-check2-square nav-ico"></i>
      <span class="nav-label">Tarefas</span>
    </button>
    <button class="nav-item" :class="{ active: activeTab === 'actions' }" @click="setActiveTab('actions')">
      <i class="bi bi-lightning-charge nav-ico"></i>
      <span class="nav-label">Ações</span>
    </button>
    <button class="nav-item" :class="{ active: activeTab === 'person' }" @click="setActiveTab('person')">
      <i class="bi bi-people-fill nav-ico"></i>
      <span class="nav-label">Clientes</span>
    </button>
    <button class="nav-item" :class="{ active: activeTab === 'finance' }" @click="setActiveTab('finance')">
      <i class="bi bi-cash-coin nav-ico"></i>
      <span class="nav-label">Finanças</span>
    </button>

    <div class="dropdown nav-profile">
      <a
        href="#"
        class="user-profile-link"
        data-bs-toggle="dropdown"
        aria-expanded="false"
        :title="user?.name || 'Usuário'"
      >
        <i class="bi bi-person-circle user-avatar-icon"></i>
      </a>
      <ul class="dropdown-menu dropdown-menu-end">
        <li>
          <a class="dropdown-item dropdown-item--toggle" href="#" @click.prevent="toggleDocked">
            <span class="dd-toggle-label">
              <i class="bi bi-layout-sidebar-inset-reverse"></i> Encaixar na lateral
            </span>
            <i class="bi dd-toggle-state" :class="dockedMode ? 'bi-toggle-on' : 'bi-toggle-off'"></i>
          </a>
        </li>
        <li><hr class="dropdown-divider" /></li>
        <li>
          <a class="dropdown-item" @click="openChangeTeamModal">Trocar de Time</a>
        </li>
        <li>
          <a class="dropdown-item" @click="logout">Sair</a>
        </li>
      </ul>
    </div>
  </nav>

  <!-- Campo de busca -->
  <div class="search-section">
    <div class="ad-search">
      <span class="ad-search__icon"><i class="bi bi-search"></i></span>
      <input
        v-model="searchQuery"
        type="text"
        class="ad-search__input"
        placeholder="Digite o número do processo ou nome da parte"
        @input="handleSearch"
        @focus="showSearchResults = true"
        @blur="hideSearchResults"
      />
    </div>

    <!-- Resultados da busca -->
    <div v-if="showSearchResults && (processos.length > 0 || isSearching)" class="search-results">
      <div v-if="isSearching" class="search-loading">
        <div class="loading-spinner"></div>
        <span>Buscando...</span>
      </div>
      <div v-else>
        <div
          v-for="process in processos"
          :key="process.id"
          class="search-result-item"
          @mousedown="onSelectProcess(process)"
        >
          <div class="process-number">{{ process.process_num }}</div>
          <div class="process-description">{{ process.description }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, onMounted, onUnmounted, watch } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import ChangeTeamModal from './ChangeTeamModal.vue';
import { searchProcesses } from '@/api/process';
import debounce from 'lodash.debounce'; // Importa debounce do lodash

const processos = ref([]);
const searchQuery = ref('');
const isSearching = ref(false);
const showSearchResults = ref(false);
const activeTab = ref('processos'); // Tab ativa por padrão

const router = useRouter();
const route = useRoute();
const auth = useAuthStore();
const user = computed(() => auth.user);
const isChangeTeamModalVisible = ref(false);

// Modo encaixado (painel lateral fixo). Persistido em browser.storage.local e
// sincronizado com o content script, que faz a injeção e a reserva de espaço na
// página. Aqui é só o liga/desliga e o reflexo do estado atual.
const dockedMode = ref(false);
let dockedChangeListener = null;

function readDockedMode() {
  if (typeof browser !== 'undefined' && browser.storage && browser.storage.local) {
    browser.storage.local
      .get('dockedMode')
      .then((res) => {
        dockedMode.value = !!(res && res.dockedMode);
      })
      .catch(() => {});
  }
}

function toggleDocked() {
  const next = !dockedMode.value;
  dockedMode.value = next;
  if (typeof browser !== 'undefined' && browser.storage && browser.storage.local) {
    browser.storage.local.set({ dockedMode: next }).catch(() => {});
  }
}

// Função para determinar qual aba deve estar ativa baseada na rota atual
const updateActiveTabFromRoute = () => {
  const routeName = route.name;
  
  switch(routeName) {
    case 'Dashboard':
      activeTab.value = 'dashboard';
      break;
    case 'ProcessIndex':
      activeTab.value = 'processes';
      break;
    case 'Tasks':
    case 'AddTask':
    case 'TaskDetail':
      activeTab.value = 'tasks';
      break;
    case 'Actions':
      activeTab.value = 'actions';
      break;
    case 'Person':
    case 'PersonGeneral':
    case 'EditPerson':
    case 'PersonFinance':
      activeTab.value = 'person';
      break;
    case 'Finance':
      activeTab.value = 'finance';
      break;
    case 'ProcessView':
    case 'EditCase':
      activeTab.value = 'processes';
      break;
    default:
      activeTab.value = 'dashboard';
  }
};

// Observar mudanças na rota
watch(() => route.name, () => {
  updateActiveTabFromRoute();
}, { immediate: true });

onMounted(() => {
  updateActiveTabFromRoute();
  readDockedMode();
  if (typeof browser !== 'undefined' && browser.storage && browser.storage.onChanged) {
    dockedChangeListener = (changes, area) => {
      if (area === 'local' && changes.dockedMode) {
        dockedMode.value = !!changes.dockedMode.newValue;
      }
    };
    browser.storage.onChanged.addListener(dockedChangeListener);
  }
});

onUnmounted(() => {
  if (
    dockedChangeListener &&
    typeof browser !== 'undefined' &&
    browser.storage &&
    browser.storage.onChanged
  ) {
    browser.storage.onChanged.removeListener(dockedChangeListener);
    dockedChangeListener = null;
  }
});

const openChangeTeamModal = () => {
  isChangeTeamModalVisible.value = true;
};

const closeChangeTeamModal = () => {
  isChangeTeamModalVisible.value = false;
};

// Função para fazer logout
const logout = () => {
  auth.logout();
  router.push({ name: 'Login' });
};

// Função para definir a tab ativa
const setActiveTab = (tab) => {
  activeTab.value = tab;
  // Aqui você pode adicionar navegação específica para cada tab
  switch(tab) {
    case 'dashboard':
      router.push({ name: 'Dashboard' });
      break;
    case 'configuracoes':
      // router.push({ name: 'Configuracoes' });
      break;
    case 'processes':
      router.push({ name: 'ProcessIndex' });
      break;
    case 'tasks':
      router.push({ name: 'Tasks' });
      break;
    case 'actions':
      router.push({ name: 'Actions' });
      break;
    case 'person':
      router.push({ name: 'PersonGeneral' });
      break;
    case 'finance':
      router.push({ name: 'Finance' });
      break;
    case 'documentos':
      // router.push({ name: 'Documentos' });
      break;
    case 'relatorios':
      // router.push({ name: 'Relatorios' });
      break;
  }
};

// Função para buscar processos com debounce de 500ms
const debouncedSearch = debounce((searchTerm) => {
  if (!searchTerm || searchTerm.length < 3) {
    processos.value = [];
    showSearchResults.value = false;
    return;
  }

  isSearching.value = true;
  showSearchResults.value = true;

  searchProcesses(searchTerm)
    .then(data => {
      processos.value = data.map(process => {
        const partyNames = process.peoples.map(p => p.name).join(', ');
        return {
          id: process.id,
          process_num: process.process_num,
          description: partyNames || process.description,
        };
      });
    })
    .catch(error => {
      console.error('Erro ao buscar os processos:', error);
    })
    .finally(() => {
      isSearching.value = false;
    });
}, 500); // 500ms de debounce

// Função para manipular a busca
const handleSearch = (event) => {
  const value = event.target.value;
  searchQuery.value = value;
  debouncedSearch(value);
};

// Função para esconder resultados com delay
const hideSearchResults = () => {
  setTimeout(() => {
    showSearchResults.value = false;
  }, 200);
};

function onSelectProcess(process) {
  console.log(process);
  searchQuery.value = process.process_num;
  showSearchResults.value = false;
  if (process && process.id) {
    router.push({ name: 'ProcessView', params: { id: process.id } });
  }
}
</script>

<style scoped>
/* ── Navegação por ícones (perfil no mesmo nível) ── */
.nav-bar {
  display: flex;
  align-items: stretch;
  justify-content: space-between;
  padding: 6px 8px 0;
  background: #fff;
  border-bottom: 1px solid var(--ad-line, #e6e8ee);
}

.nav-item {
  flex: 1 1 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  padding: 9px 2px 10px;
  background: none;
  border: none;
  border-bottom: 2px solid transparent;
  cursor: pointer;
  color: var(--ad-ink, #1a2233);
  transition: color 0.15s ease, border-color 0.15s ease;
  min-width: 0;
}

.nav-ico {
  font-size: 18px;
  line-height: 1;
}

.nav-label {
  font-size: 11px;
  font-weight: 600;
  white-space: nowrap;
  letter-spacing: 0.01em;
}

.nav-item:hover {
  color: var(--ad-navy, #16223f);
}

.nav-item.active {
  color: var(--ad-navy, #16223f);
  border-bottom-color: var(--ad-navy, #16223f);
}

/* Perfil do usuário no mesmo nível do menu */
.nav-profile {
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  padding: 0 6px 8px 6px;
}

.user-profile-link {
  display: flex;
  align-items: center;
  text-decoration: none;
}

.user-avatar-icon {
  font-size: 26px;
  line-height: 1;
  color: var(--ad-navy, #16223f);
  display: block;
  transition: color 0.2s ease;
}

.user-profile-link:hover .user-avatar-icon {
  color: var(--ad-navy-700, #0f1a32);
}

/* ── Campo de Busca ── */
.search-section {
  padding: 12px 16px;
  background: #fff;
  position: relative;
}

/* (.ad-search e filhos vêm do design system global em style.scss) */

/* Resultados da Busca */
.search-results {
  position: absolute;
  top: 100%;
  left: 16px;
  right: 16px;
  background-color: #ffffff;
  border: 1px solid var(--ad-line, #e6e8ee);
  border-radius: 12px;
  box-shadow: 0 8px 24px rgba(20, 28, 50, 0.12);
  z-index: 1000;
  max-height: 300px;
  overflow-y: auto;
  margin-top: 6px;
}

.search-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  gap: 8px;
  color: var(--ad-muted, #8b93a3);
}

.loading-spinner {
  width: 16px;
  height: 16px;
  border: 2px solid var(--ad-line, #e6e8ee);
  border-top: 2px solid var(--ad-navy, #16223f);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.search-result-item {
  padding: 11px 16px;
  cursor: pointer;
  border-bottom: 1px solid var(--ad-line, #e6e8ee);
  transition: background-color 0.15s ease;
}

.search-result-item:hover {
  background-color: #f7f8fa;
}

.search-result-item:last-child {
  border-bottom: none;
}

.process-number {
  font-weight: 600;
  color: var(--ad-ink, #1a2233);
  font-size: 14px;
  margin-bottom: 2px;
}

.process-description {
  color: var(--ad-muted, #8b93a3);
  font-size: 13px;
  line-height: 1.4;
}

/* Dropdown */
.dropdown-menu {
  border: 1px solid var(--ad-line, #e6e8ee);
  border-radius: 10px;
  box-shadow: 0 8px 24px rgba(20, 28, 50, 0.12);
  padding: 6px 0;
}

.dropdown-item {
  padding: 8px 16px;
  font-size: 14px;
  color: var(--ad-text, #3f4757);
  cursor: pointer;
  border: none;
  background: none;
  width: 100%;
  text-align: left;
}

.dropdown-item:hover {
  background-color: #f3f4f6;
  color: var(--ad-ink, #1a2233);
}

/* Item de liga/desliga (Encaixar na lateral) */
.dropdown-item--toggle {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  text-decoration: none;
}

.dd-toggle-label {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.dd-toggle-state {
  font-size: 18px;
  line-height: 1;
  flex: 0 0 auto;
}

.dd-toggle-state.bi-toggle-on {
  color: var(--ad-navy, #16223f);
}

.dd-toggle-state.bi-toggle-off {
  color: var(--ad-muted, #8b93a3);
}
</style>
