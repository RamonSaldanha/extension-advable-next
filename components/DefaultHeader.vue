<!-- src/components/DefaultHeader.vue -->
<template>
  <ChangeTeamModal 
    :isVisible="isChangeTeamModalVisible"
    @close="closeChangeTeamModal"
  />
  
  <!-- Menu de navegação com tabs -->
  <div class="navigation-tabs">
    <div class="tabs-container p-0 ">
      <button 
        class="tab-button"
        :class="{ active: activeTab === 'dashboard' }"
        @click="setActiveTab('dashboard')"
      >
        <i class="bi bi-grid-3x3-gap-fill tab-icon"></i>
        <span class="tab-text">Dashboard</span>
      </button>
<!--       
      <button 
        class="tab-button"
        :class="{ active: activeTab === 'configuracoes' }"
        @click="setActiveTab('configuracoes')"
      >
        <i class="bi bi-gear-fill tab-icon"></i>
        <span class="tab-text">Preferências</span>
      </button> -->
      
      <button 
        class="tab-button"
        :class="{ active: activeTab === 'processes' }"
        @click="setActiveTab('processes')"
      >
        <i class="bi bi-hammer tab-icon"></i>
        <span class="tab-text">Processos</span>
      </button>

      <button 
        class="tab-button"
        :class="{ active: activeTab === 'tasks' }"
        @click="setActiveTab('tasks')"
      >
        <i class="bi bi-check2-square tab-icon"></i>
        <span class="tab-text">Tarefas</span>
      </button>
      
      <button
        class="tab-button"
        :class="{ active: activeTab === 'actions' }"
        @click="setActiveTab('actions')"
      >
        <i class="bi bi-lightning-charge tab-icon"></i>
        <span class="tab-text">Ações</span>
      </button>

      <button
        class="tab-button"
        :class="{ active: activeTab === 'whatsapp' }"
        @click="setActiveTab('whatsapp')"
      >
        <i class="bi bi-whatsapp tab-icon"></i>
        <span class="tab-text">WhatsApp</span>
      </button>
<!--       
      <button 
        class="tab-button"
        :class="{ active: activeTab === 'documentos' }"
        @click="setActiveTab('documentos')"
      >
        <i class="bi bi-folder-fill tab-icon"></i>
        <span class="tab-text">Documentos</span>
      </button> -->
      
      <button 
        class="tab-button"
        :class="{ active: activeTab === 'person' }"
        @click="setActiveTab('person')"
      >
        <i class="bi bi-people-fill tab-icon"></i>
        <span class="tab-text">Clientes</span>
      </button>
      
      <!-- Avatar do usuário dentro do menu -->
      <div class="user-profile-tab">
        <div class="dropdown">
          <a
            href="#"
            class="user-profile-link"
            data-bs-toggle="dropdown"
            aria-expanded="false"
          >
            <img
              :src="user.profile_photo_url"
              alt="Usuário"
              width="32"
              height="32"
              class="user-avatar"
            />
          </a>
          <ul class="dropdown-menu dropdown-menu-end">
            <li>
              <a class="dropdown-item" @click="openChangeTeamModal">Trocar de Time</a>
            </li>
            <li>
              <a class="dropdown-item" @click="logout">Sair</a>
            </li>
          </ul>
        </div>
      </div>
    </div>
  </div>
  
  <!-- Campo de busca -->
  <div class="search-section">
    <div class="search-input-wrapper">
      <i class="bi bi-search search-icon"></i>
      <input
        v-model="searchQuery"
        type="text"
        class="search-input"
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
import { computed, ref, onMounted, watch } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import ChangeTeamModal from './ChangeTeamModal.vue';
import { searchProcesses } from '@/api/process';
import debounce from 'lodash.debounce'; // Importa debounce do lodash

// Importe a imagem do logotipo
import logoImage from '@/assets/icon48.png';

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

// Variável para armazenar a imagem do logotipo
const logo = logoImage;

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
    case 'WhatsApp':
      activeTab.value = 'whatsapp';
      break;
    case 'Person':
    case 'PersonGeneral':
    case 'EditPerson':
      activeTab.value = 'person';
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
    case 'whatsapp':
      router.push({ name: 'WhatsApp' });
      break;
    case 'person':
      router.push({ name: 'PersonGeneral' });
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
/* Campo de Busca */
.search-section {
  padding: 12px 20px;
  background-color: #ffffff;
  position: relative;
  border-bottom: 0px solid #e5e7eb;
}

.search-input-wrapper {
  position: relative;
  max-width: 100%;
}

.search-icon {
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  color: #9ca3af;
  font-size: 16px;
  z-index: 1;
}

.search-input {
  width: 100%;
  padding: 8px 16px 8px 36px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 14px;
  color: #374151;
  background-color: #ffffff;
  transition: all 0.2s ease;
  box-sizing: border-box;
  outline: none;
  height: 36px;
}

.search-input:focus {
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.search-input::placeholder {
  color: #9ca3af;
  font-size: 14px;
}

/* Resultados da Busca */
.search-results {
  position: absolute;
  top: 100%;
  left: 20px;
  right: 20px;
  background-color: #ffffff;
  border: 1px solid #d1d5db;
  border-top: none;
  border-radius: 0 0 6px 6px;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  z-index: 1000;
  max-height: 300px;
  overflow-y: auto;
  margin-top: -1px;
}

.search-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  gap: 8px;
  color: #6b7280;
}

.loading-spinner {
  width: 16px;
  height: 16px;
  border: 2px solid #e5e7eb;
  border-top: 2px solid #3b82f6;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.search-result-item {
  padding: 12px 16px;
  cursor: pointer;
  border-bottom: 1px solid #f3f4f6;
  transition: background-color 0.2s ease;
}

.search-result-item:hover {
  background-color: #f8f9fa;
}

.search-result-item:last-child {
  border-bottom: none;
  border-radius: 0 0 6px 6px;
}

.search-result-item:first-child:last-child {
  border-radius: 0 0 6px 6px;
}

.process-number {
  font-weight: 600;
  color: #1f2937;
  font-size: 14px;
  margin-bottom: 2px;
}

.process-description {
  color: #6b7280;
  font-size: 13px;
  line-height: 1.4;
}

/* Menu de Navegação com Tabs */
.navigation-tabs {
  background-color: #f8f9fa;
  border-bottom: 1px solid #e5e7eb;
  padding: 0;
}

.tabs-container {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 20px;
}

.tab-button {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 12px 16px;
  background: none;
  border: none;
  cursor: pointer;
  color: #6b7280;
  text-decoration: none;
  transition: all 0.2s ease;
  min-width: 80px;
  gap: 2px;
  position: relative;
  flex: 1;
  max-width: 120px;
}

.tab-button:hover {
  background-color: #f3f4f6;
  color: #374151;
}

.tab-button.active {
  color: #3b82f6;
  background-color: transparent;
}

.tab-button.active::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 3px;
  background-color: #3b82f6;
  border-radius: 2px 2px 0 0;
}

.tab-icon {
  font-size: 18px;
  margin-bottom: 1px;
}

.tab-text {
  font-size: 12px;
  font-weight: 500;
  white-space: nowrap;
}

/* Avatar do usuário no menu */
.user-profile-tab {
  margin-left: auto;
  padding: 8px 15px;
}

.user-profile-link {
  display: flex;
  align-items: center;
  text-decoration: none;
}

.user-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  object-fit: cover;
}

/* Dropdown */
.dropdown-menu {
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  padding: 8px 0;
}

.dropdown-item {
  padding: 8px 16px;
  font-size: 14px;
  color: #374151;
  cursor: pointer;
  border: none;
  background: none;
  width: 100%;
  text-align: left;
}

.dropdown-item:hover {
  background-color: #f3f4f6;
  color: #1f2937;
}

/* Responsividade */
@media (max-width: 768px) {
  .tabs-container {
    padding: 0 16px;
  }
  
  .tab-button {
    min-width: 60px;
    padding: 10px 8px;
  }
  
  .tab-text {
    line-height: 12px;
    font-size: 12px;
  }
}
</style>
