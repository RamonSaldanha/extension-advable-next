<!-- src/views/ProcessView.vue -->
<template>
  <Layout>
    <template #header>
      <DefaultHeader />
    </template>
    <div class="">
      <div v-if="isLoading" class="mt-3">
        <p>Carregando...</p>
      </div>
      <div v-else-if="errorMessage" class="mt-3">
        <p class="text-danger">{{ errorMessage }}</p>
      </div>
      <div v-else-if="process">
        <!-- Navegação das Tabs -->
        <div class="ad-tabs" id="processTabs" role="tablist">
          <button class="ad-tab active" id="detalhes-tab" data-bs-toggle="tab" data-bs-target="#detalhes" type="button" role="tab" aria-controls="detalhes" aria-selected="true">
            Detalhes
          </button>
          <button class="ad-tab" id="partes-tab" data-bs-toggle="tab" data-bs-target="#partes" type="button" role="tab" aria-controls="partes" aria-selected="false">
            Partes
          </button>
          <button class="ad-tab" id="tarefas-tab" data-bs-toggle="tab" data-bs-target="#tarefas" type="button" role="tab" aria-controls="tarefas" aria-selected="false">
            Tarefas
          </button>
          <button class="ad-tab" id="push-tab" data-bs-toggle="tab" data-bs-target="#push" type="button" role="tab" aria-controls="push" aria-selected="false">
            Push
          </button>
          <button class="ad-tab" id="movimentacoes-tab" data-bs-toggle="tab" data-bs-target="#movimentacoes" type="button" role="tab" aria-controls="movimentacoes" aria-selected="false">
            Movimentações
            <span v-if="unreadMovementsCount > 0" class="ad-tab__badge">{{ unreadMovementsCount }}</span>
          </button>
        </div>
        
        <!-- Conteúdo das Tabs -->
        <div class="tab-content" id="processTabsContent">
          
          <!-- Tab Detalhes -->
          <div class="tab-pane fade show active" id="detalhes" role="tabpanel" aria-labelledby="detalhes-tab"> 
            <div class="px-3">
              <div class="my-3 d-flex align-items-center">
                <div class="form-label">Número:</div>
                <div class="w-100">
                  {{ process.process_num }}
                  <a :href="processDetailsUrl + process.id" target="_blank" class="adble-ml-1">
                    <i class="bi bi-box-arrow-up-right"></i>
                  </a>
                </div>
              </div>
              <div class="mb-3 d-flex align-items-start">
                <div class="form-label">Órgão julgador:</div>
                <div class="w-100">
                  <div class="mb-2" v-if="selectedJurisdiction">{{ selectedJurisdiction.name }}</div>
                  <VueSelect
                    id="jurisdiction"
                    v-model="selectedJurisdiction"
                    :options="jurisdictions"
                    placeholder="Busque e altere o órgão"
                    label="name"
                    :get-option-label="option => option.name"
                    :get-option-key="option => option.id"
                    @search="handleJurisdictionSearch"
                    @option-selected="handleJurisdictionChange"
                    :searchable="true"
                    :loading="isSearchingJurisdiction"
                  />
                </div>
              </div>
              <div class="my-3 d-flex align-items-center">
                <div class="form-label">Valor da causa:</div>
                <div class="w-100">{{ formatNumberToBRL(process.valor_da_causa) }}</div>
              </div>
            </div>        
            <Card class="mt-4" title="Estatísticas de resultados" icon="bi-bar-chart-line-fill">
              <template #body>
                <form class="p-2" @submit.prevent="handleUpdateFields">
                  <!-- Sentença -->
                  <div class="mb-3 d-flex align-items-center">
                    <label for="sentenca" class="form-label me-3" style="min-width: 150px;">Sentença:</label>
                    <select
                      id="sentenca"
                      class="form-select"
                      v-model="updatedFields.sentenca"
                      :style="{ backgroundColor: getBorderColor(updatedFields.sentenca) }"
                    >
                      <option disabled value="">Selecione uma opção</option>
                      <option
                        v-for="option in sentencaOptions"
                        :key="option.id"
                        :value="option.title"
                      >
                        {{ option.title }}
                      </option>
                    </select>
                  </div>
    
                  <!-- Liminar -->
                  <div class="mb-3 d-flex align-items-center">
                    <label for="liminar" class="form-label me-3" style="min-width: 150px;">Liminar:</label>
                    <select
                      id="liminar"
                      class="form-select"
                      v-model="updatedFields.liminar"
                      :style="{ backgroundColor: getBorderColor(updatedFields.liminar) }"
                    >
                      <option disabled value="">Selecione uma opção</option>
                      <option
                        v-for="option in liminarOptions"
                        :key="option.id"
                        :value="option.title"
                      >
                        {{ option.title }}
                      </option>
                    </select>
                  </div>
    
                  <!-- Resultado -->
                  <div class="mb-3 d-flex align-items-center">
                    <label for="resultado" class="form-label me-3" style="min-width: 150px;">Resultado:</label>
                    <select
                      id="resultado"
                      class="form-select"
                      v-model="updatedFields.resultado"
                      :style="{ backgroundColor: getBorderColor(updatedFields.resultado) }"
                    >
                      <option disabled value="">Selecione uma opção</option>
                      <option
                        v-for="option in resultadoOptions"
                        :key="option.id"
                        :value="option.title"
                      >
                        {{ option.title }}
                      </option>
                    </select>
                  </div>
                  
                  <div class="d-flex justify-content-end">
                    <!-- Botão de Atualizar -->
                    <button type="submit" class="adbl-btn adbl-btn--primary" :disabled="isUpdating">
                      {{ isUpdating ? 'Atualizando...' : 'Atualizar' }}
                    </button>
                  </div>
                </form>
              </template>
            </Card>
          </div>
          
          <!-- Tab Partes -->
          <div class="tab-pane fade" id="partes" role="tabpanel" aria-labelledby="partes-tab">


            <!-- Seção para Associar uma Nova Pessoa -->
            <Card title="Associar uma nova pessoa" icon="bi-person-fill-add">
              <template #body>
                <VueSelect
                  v-model="selectedPerson"
                  :options="availablePeople"
                  placeholder="Digite o nome ou CPF da pessoa"
                  label="label"
                  :get-option-label="option => option.label"
                  :get-option-key="option => option.id"
                  @search="debouncedSearch"
                  @option-selected="confirmAttach"
                  :searchable="true"
                  :loading="isSearching"
                />
              </template>
            </Card>

            <!-- Lista de Partes Envolvidas -->
            <Card class="mt-3" title="Partes Envolvidas" icon="bi-person-lines-fill">
              <template #listGroup>
                <ul class="list-group list-group-flush pb-1">
                  <li 
                    class="list-group-item d-flex p-3 justify-content-between align-items-start" 
                    v-for="parte in process.peoples" 
                    :key="parte.id"
                  >
                    <div class="ms-2 me-auto">
                      <div class="fw-bold">{{ parte.name }}</div>
                      <div v-if="parte.cpf">CPF: {{ parte.cpf }}</div>
                      <div>
                        <button
                          class="adbl-btn adbl-btn--danger-soft adbl-btn--sm mt-2"
                          @click="confirmDetach(parte)"
                        >
                          <i class="bi bi-person-dash-fill"></i> Desassociar
                        </button>
                      </div>
                    </div>
                    <span class="ad-pill ad-pill--cat">{{ parte.pivot.polo }}</span>
                  </li>
                </ul>
              </template>
            </Card>
            

          </div>
          
          <!-- Tab Tarefas -->
          <div class="tab-pane fade" id="tarefas" role="tabpanel" aria-labelledby="tarefas-tab">
            <div class="mt-3">
              <ProcessTasksList :processId="processId" />
            </div>
          </div>
          
          <!-- Tab Push -->
          <div class="tab-pane fade" id="push" role="tabpanel" aria-labelledby="push-tab">
            <Card class="mt-3" title="Configurações de Push" icon="bi-broadcast">
              <template #body>
                <!-- Tribunal -->
                <div class="mb-4">
                  <label class="d-block fw-bold mb-3">Tribunal:</label>
                  
                  <span
                    class="ad-pill ad-pill--cat mb-2"
                    v-if="tempSelectedCourt"
                  >
                    {{ tempSelectedCourt.name }}
                  </span>
                  
                  <VueSelect
                    v-model="tempSelectedCourt"
                    :options="courts"
                    placeholder="Buscar tribunal..."
                    label="name"
                    :get-option-label="option => option.name"
                    :get-option-key="option => option.id"
                    @search="handleCourtSearch"
                    @option-selected="handleTempCourtChange"
                    :searchable="true"
                    :loading="isLoadingCourts"
                  />
                </div>

                <div class="mb-4">
                  <label class="d-block fw-bold mb-3">Sistema:</label>

                  <span
                    class="ad-pill ad-pill--muted mb-2"
                    v-if="tempSelectedSystem"
                  >
                    {{ tempSelectedSystem.title }}
                  </span>

                  <VueSelect
                    v-model="tempSelectedSystem"
                    :options="availableSystems"
                    placeholder="Selecionar sistema..."
                    label="title"
                    :get-option-label="option => option.title"
                    :get-option-key="option => option.id"
                    @option-selected="handleTempSystemChange"
                    :searchable="false"
                    :disabled="!tempSelectedCourt || availableSystems.length === 0"
                  />
                  <div v-if="tempSelectedCourt && availableSystems.length === 0" class="proc-note proc-note--warn mt-2">
                    <i class="bi bi-exclamation-triangle me-2"></i>
                    <strong>Atenção:</strong> Este tribunal não possui sistemas associados para push.
                  </div>
                </div>

                <div class="mb-4">
                  <label class="d-block fw-bold mb-3">Status do Push:</label>
                  <div class="form-check form-switch">
                    <input 
                      class="form-check-input" 
                      type="checkbox" 
                      id="pushToggle"
                      v-model="tempPushEnabled"
                      :disabled="!canEnablePush"
                    >
                    <label class="form-check-label" for="pushToggle">
                      {{ tempPushEnabled ? 'Push Ativo' : 'Push Inativo' }}
                    </label>
                  </div>
                  <small v-if="!canEnablePush" class="text-muted">
                    Selecione um tribunal com sistema disponível para ativar o push.
                  </small>
                </div>

                <div v-if="process?.lastQueryInTheSystem" class="proc-note proc-note--info">
                  <i class="bi bi-info-circle me-2"></i>
                  <strong>Última consulta:</strong> {{ formatDate(process.lastQueryInTheSystem) }}
                </div>

                <div v-if="tempPushEnabled && canEnablePush" class="proc-note proc-note--success">
                  <i class="bi bi-check-circle me-2"></i>
                  <strong>Push será ativo!</strong> Este processo será monitorado automaticamente.
                  Atualizações serão detectadas em até 24 horas.
                </div>

                <div class="d-flex justify-content-end mt-4">
                  <button
                    type="button"
                    class="adbl-btn adbl-btn--primary"
                    @click="savePushSettings"
                    :disabled="isSavingPushSettings"
                  >
                    {{ isSavingPushSettings ? 'Salvando...' : 'Salvar Definições' }}
                  </button>
                </div>
              </template>
            </Card>
          </div>
          
          <!-- Tab Movimentações -->
          <div class="tab-pane fade px-3" id="movimentacoes" role="tabpanel" aria-labelledby="movimentacoes-tab">
            <!-- Conteúdo para Movimentações -->
            <h5 class="adble-title">Movimentações <i class="bi bi-arrow-repeat me-1"></i></h5>
            <button
              class="adbl-btn adbl-btn--outline adbl-btn--block adbl-btn--sm mb-3"
              @click="runMarkAllMovementsAsRead"
              :disabled="areAllMovementsRead"
            >
              Marcar Todas como Lidas
            </button>
            <ul class="list-group">
              <li 
                class="list-group-item d-flex justify-content-between align-items-center" 
                v-for="movement in process.movements" 
                :key="movement.id"
              >
                <div>
                  <strong>{{ movement.data }}</strong>: {{ movement.teor }}
                </div>
                <span
                  class="adbl-chip"
                  :class="movement.read ? 'adbl-chip--success' : 'adbl-chip--warning'"
                >
                  {{ movement.read ? 'Lida' : 'Não Lida' }}
                </span>
              </li>
            </ul>
          </div>
          
        </div>
      </div>
      <div v-else class="mt-3">
        <p>Processo não encontrado.</p>
      </div>
    </div>
  </Layout>
</template>

<script setup>
import { ref, onMounted, computed, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import Layout from '@/components/Layout.vue';
import DefaultHeader from '@/components/DefaultHeader.vue';
import Card from '@/components/Card.vue';
import ProcessTasksList from '@/components/ProcessTasksList.vue';
import { 
  getProcessById, 
  detachPersonFromProcess, 
  searchProcesses, 
  attachPersonToProcess, 
  updateProcessField,
  getJurisdictions, // Novo endpoint para buscar jurisdições com busca dinâmica
  updateProcessJurisdiction, // Novo endpoint para atualizar jurisdição
  markAllMovementsAsRead, // Novo endpoint para marcar todas as movimentações como lidas
  getCourts, // Novo endpoint para buscar tribunais
  updateProcessCourt, // Novo endpoint para atualizar tribunal
  updateProcessCourtSystem, // Novo endpoint para atualizar sistema
  toggleProcessPush // Novo endpoint para alternar push
} from '@/api/process'; // Assegure-se de que esses novos métodos estão implementados
import {
  formatNumberToBRL
} from '@/utils'; // Importe os formatters necessários
import Swal from 'sweetalert2';
import VueSelect from "vue3-select-component";
import debounce from 'lodash.debounce';

// Definição das opções estáticas para os campos
const liminarOptions = [
  { id: 1, title: "Não tem" },
  { id: 2, title: "Pendente" },
  { id: 3, title: "Postergada" },
  { id: 4, title: "Parcialmente" },
  { id: 5, title: "Indeferida" },
  { id: 6, title: "Deferida" },
];

const sentencaOptions = [
  { id: 1, title: "Não se aplica" },
  { id: 2, title: "Pendente" },
  { id: 3, title: "Procedente" },
  { id: 4, title: "Improcedente" },
  { id: 5, title: "Parcialmente" },
  { id: 6, title: "Acordo" },
  { id: 7, title: "Extinto" },
  { id: 8, title: "Sobrestado" },
  { id: 9, title: "Desistência" },
];

const resultadoOptions = [
  { id: 1, title: "Não se aplica" },
  { id: 2, title: "Pendente" },
  { id: 3, title: "Favorável" },
  { id: 4, title: "Parcialmente" },
  { id: 5, title: "Desfavorável" },
  { id: 6, title: "Substabelecimento" },
];

// Definição do mapeamento de cores
const defaultColors = {
  'Parcialmente': '#9de4ff',
  'Desistência': '#9de4ff',
  'Substabelecimento': '#9de4ff',
  'Postergada': '#FFE162',
  'Deferida': '#BAFFB4',
  'Indeferida': '#ff8e8e',
  'Pendente': '#FFE162',
  'Procedente': '#BAFFB4',
  'Improcedente': '#ff8e8e',
  'Favorável': '#BAFFB4',
  'Desfavorável': '#ff8e8e',
  'Extinto': '#ffb257',
  'Acordo': '#bbbcff',
  'Despesa': '#ff8e8e',
  'Receita': '#BAFFB4',
  'Sobrestado': '#ffb257'
};

// Função para obter a cor da borda com base no valor do campo
function getBorderColor(fieldValue) {
  return defaultColors[fieldValue] || '#ced4da'; // '#ced4da' é a cor padrão do Bootstrap para bordas
}

/**
 * Variáveis reativas
 */
const route = useRoute();
const router = useRouter();
const processId = route.params.id;

const process = ref(null);
const isLoading = ref(true);
const errorMessage = ref('');

const updatedFields = ref({
  sentenca: '',
  liminar: '',
  resultado: '',
});

const isUpdating = ref(false);

// Jurisdição
const jurisdictions = ref([]);
const selectedJurisdiction = ref(null);
const isSearchingJurisdiction = ref(false);
const isUpdatingJurisdiction = ref(false);

/**
 * Variáveis para Partes
 */
const selectedPerson = ref(null);
const availablePeople = ref([]);
const isSearching = ref(false);

/**
 * Variáveis para Push Management
 */
const courts = ref([]);
const selectedCourt = ref(null);
const selectedSystem = ref(null);
const pushEnabled = ref(false);
const isLoadingCourts = ref(false);
const isUpdatingPush = ref(false);

// Variáveis temporárias para configuração de push (modo edição)
const tempSelectedCourt = ref(null);
const tempSelectedSystem = ref(null);
const tempPushEnabled = ref(false);
const isSavingPushSettings = ref(false);

const unreadMovementsCount = computed(() => {
  return process.value?.movements.filter(movement => movement.read === 0).length || 0;
});

// Computed para sistemas disponíveis baseado no tribunal temporário selecionado
const availableSystems = computed(() => {
  if (!tempSelectedCourt.value) {
    return [];
  }
  
  // Primeiro tenta pegar sistemas do objeto atual
  let systems = tempSelectedCourt.value?.courtSystems || [];
  
  // Se não tem sistemas, tenta buscar na lista de tribunais carregada
  if ((!systems || systems.length === 0) && courts.value.length > 0) {
    const foundCourt = courts.value.find(c => c.id === tempSelectedCourt.value.id);
    if (foundCourt && foundCourt.courtSystems) {
      systems = foundCourt.courtSystems;
      // Atualiza a referência para manter consistência
      tempSelectedCourt.value = foundCourt;
    }
  }
  
  return Array.isArray(systems) ? systems : [];
});

// Computed para verificar se o push pode ser ativado
const canEnablePush = computed(() => {
  return tempSelectedCourt.value && tempSelectedSystem.value;
});

const processDetailsUrl = computed(() => `${import.meta.env.VITE_APP_BASE_URL}process/details/`);

/**
 * Função para buscar os detalhes do processo.
 */
function fetchProcess() {
  getProcessById(processId)
    .then(data => {
      process.value = data;
      // Inicializa os campos atualizados com os valores atuais do processo
      updatedFields.value = {
        sentenca: data.sentenca || '',
        liminar: data.liminar || '',
        resultado: data.resultado || '',
      };
      // Inicializa a jurisdição selecionada
      if (data.orgao_julgador) {
        selectedJurisdiction.value = { id: data.orgao_julgador.id, name: data.orgao_julgador.name };
        // Adiciona a jurisdição atual às opções se ainda não estiver presente
        if (!jurisdictions.value.find(j => j.id === data.orgao_julgador.id)) {
          jurisdictions.value.push({ id: data.orgao_julgador.id, name: data.orgao_julgador.name });
        }
      } else {
        selectedJurisdiction.value = null;
      }
      
      // Inicializa as variáveis de push management
      initializePushSettings(data);
    })
    .catch(error => {
      console.error('Erro ao buscar o processo:', error);
      errorMessage.value = 'Erro ao carregar o processo.';
    })
    .finally(() => {
      isLoading.value = false;
    });
}

/**
 * Função para inicializar as configurações de push
 */
function initializePushSettings(processData) {
  // Inicializa o estado do push
  pushEnabled.value = Boolean(processData.push);
  tempPushEnabled.value = Boolean(processData.push);
  
  // Inicializa o tribunal selecionado se existir
  if (processData.tribunal) {
    // IMPORTANTE: Busca o tribunal na lista já carregada para ter os sistemas completos
    const foundCourt = courts.value.find(c => c.id === processData.tribunal.id);
    
    if (foundCourt) {
      selectedCourt.value = foundCourt;
      tempSelectedCourt.value = foundCourt;
    } else {
      // Fallback: usa os dados do processo
      const courtData = {
        id: processData.tribunal.id,
        name: processData.tribunal.name,
        slug: processData.tribunal.slug,
        courtSystems: processData.tribunal.courtSystems || []
      };
      
      selectedCourt.value = courtData;
      tempSelectedCourt.value = courtData;
      
      // Adiciona à lista para futuras referências
      courts.value.push(courtData);
    }
  } else {
    selectedCourt.value = null;
    tempSelectedCourt.value = null;
  }
  
  // Inicializa o sistema selecionado se existir
  if (processData.sistema) {
    const systemData = {
      id: processData.sistema.id,
      title: processData.sistema.title
    };
    
    selectedSystem.value = systemData;
    tempSelectedSystem.value = systemData;
  } else {
    selectedSystem.value = null;
    tempSelectedSystem.value = null;
  }
}

/**
 * Função para buscar tribunais
 */
async function fetchCourts() {
  isLoadingCourts.value = true;
  try {
    const data = await getCourts();
    
    courts.value = data.map(court => {
      return {
        id: court.id,
        name: court.name,
        slug: court.slug,
        courtSystems: court.courtSystems || []
      };
    });
  } catch (error) {
    console.error('Erro ao buscar tribunais:', error);
    Swal.fire('Erro!', 'Ocorreu um erro ao buscar tribunais.', 'error');
  } finally {
    isLoadingCourts.value = false;
  }
}

/**
 * Função para buscar tribunais com debounce
 */
const handleCourtSearch = debounce((searchTerm) => {
  if (!searchTerm) {
    return;
  }
  // A busca será feita na lista já carregada
  // Aqui poderia implementar busca no backend se necessário
}, 300);



/**
 * Função para lidar com mudança temporária de tribunal (sem persistir)
 */
function handleTempCourtChange(court) {
  if (!court) return;

  // Busca o tribunal completo na lista para obter os sistemas
  const fullCourt = courts.value.find(c => c.id === court.id);
  const courtWithSystems = fullCourt || court;

  // Atualiza as variáveis temporárias
  tempSelectedCourt.value = courtWithSystems;
  
  // Limpa o sistema quando muda de tribunal
  tempSelectedSystem.value = null;
  // Desativa push temporário se não há sistemas disponíveis
  if (!courtWithSystems.courtSystems || courtWithSystems.courtSystems.length === 0) {
    tempPushEnabled.value = false;
  }
}

/**
 * Função para lidar com mudança temporária de sistema (sem persistir)
 */
function handleTempSystemChange(system) {
  if (!system) return;
  
  tempSelectedSystem.value = system;
}

/**
 * Função para salvar as definições de push
 */
async function savePushSettings() {
  isSavingPushSettings.value = true;
  
  try {
    let needsUpdate = false;
    
    // Verifica se o tribunal mudou
    if (selectedCourt.value?.id !== tempSelectedCourt.value?.id) {
      if (tempSelectedCourt.value) {
        await updateProcessCourt(processId, tempSelectedCourt.value.id);
        selectedCourt.value = tempSelectedCourt.value;
        
        // Ao trocar tribunal, limpa o sistema
        selectedSystem.value = null;
        tempSelectedSystem.value = null;
        pushEnabled.value = false;
        tempPushEnabled.value = false;
      }
      needsUpdate = true;
    }
    
    // Verifica se o sistema mudou
    if (selectedSystem.value?.id !== tempSelectedSystem.value?.id) {
      if (tempSelectedSystem.value) {
        await updateProcessCourtSystem(processId, tempSelectedSystem.value.id);
        selectedSystem.value = tempSelectedSystem.value;
      }
      needsUpdate = true;
    }
    
    // Verifica se o estado do push mudou
    if (pushEnabled.value !== tempPushEnabled.value) {
      await toggleProcessPush(processId);
      pushEnabled.value = tempPushEnabled.value;
      needsUpdate = true;
    }
    
    if (needsUpdate) {
      // Recarrega os dados do processo
      await fetchProcess();
      
      Swal.fire({
        title: 'Configurações salvas!',
        text: 'As configurações de push foram atualizadas com sucesso.',
        icon: 'success'
      });
    } else {
      Swal.fire({
        title: 'Nenhuma alteração',
        text: 'Não foram detectadas alterações nas configurações.',
        icon: 'info'
      });
    }
    
  } catch (error) {
    console.error('Erro ao salvar configurações de push:', error);
    
    // Reverte as alterações temporárias
    initializePushSettings(process.value);
    
    let errorMessage = 'Ocorreu um erro ao salvar as configurações de push.';
    
    if (error.response?.data?.message) {
      errorMessage = error.response.data.message;
    }
    
    Swal.fire('Erro!', errorMessage, 'error');
  } finally {
    isSavingPushSettings.value = false;
  }
}

/**
 * Função para formatar data
 */
function formatDate(dateString) {
  if (!dateString) return '';
  return new Date(dateString).toLocaleString('pt-BR');
}

/**
 * Função para buscar jurisdições com base no termo de busca.
 * @param {string} searchTerm - Termo de busca inserido pelo usuário.
 */
function searchJurisdictions(searchTerm) {
  if (!searchTerm) {
    jurisdictions.value = [];
    return;
  }

  isSearchingJurisdiction.value = true;

  getJurisdictions(searchTerm)
    .then(data => {
      jurisdictions.value = data.map(jurisdiction => ({
        id: jurisdiction.id,
        name: jurisdiction.name,
      }));
    })
    .catch(error => {
      console.error('Erro ao buscar jurisdições:', error);
      Swal.fire(
        'Erro!',
        'Ocorreu um erro ao buscar jurisdições.',
        'error'
      );
    })
    .finally(() => {
      isSearchingJurisdiction.value = false;
    });
}

// Função debounce para otimizar as buscas de jurisdições
const handleJurisdictionSearch = debounce((searchTerm) => {
  searchJurisdictions(searchTerm);
}, 500); // 500ms de debounce

/**
 * Função para lidar com a mudança de jurisdição.
 * Utiliza @option-selected para capturar apenas quando uma opção for selecionada.
 */
function handleJurisdictionChange(newJurisdiction) {
  if (!newJurisdiction) return;

  Swal.fire({
    title: 'Tem certeza?',
    text: `Você deseja alterar a jurisdição para "${newJurisdiction.name}"?`,
    icon: 'question',
    showCancelButton: true,
    confirmButtonColor: '#3085d6',
    cancelButtonColor: '#d33',
    confirmButtonText: 'Sim, alterar',
    cancelButtonText: 'Cancelar'
  }).then((result) => {
    if (result.isConfirmed) {
      updateJurisdiction(newJurisdiction.id);
    } 
  });
}

/**
 * Função para atualizar a jurisdição no backend.
 */
function updateJurisdiction(jurisdictionId) {
  isUpdatingJurisdiction.value = true;

  updateProcessJurisdiction(processId, jurisdictionId)
    .then(response => {
      console.log(response);
      // process.value = response.process;
      selectedJurisdiction.value = { id: response.process.orgao_julgador.id, name: response.process.orgao_julgador.name };
      // Adiciona a nova jurisdição às opções se ainda não estiver presente
      if (!jurisdictions.value.find(j => j.id === response.process.orgao_julgador.id)) {
        jurisdictions.value.push({ id: response.process.orgao_julgador.id, name: response.process.orgao_julgador.name });
      }
      Swal.fire(
        'Atualizado!',
        'A jurisdição foi atualizada com sucesso.',
        'success'
      );
    })
    .catch(error => {
      console.error('Erro ao atualizar jurisdição:', error);
      Swal.fire(
        'Erro!',
        'Ocorreu um erro ao atualizar a jurisdição.',
        'error'
      );
      // Reverte a seleção para a jurisdição anterior em caso de erro
      selectedJurisdiction.value = process.value.orgao_julgador ? { id: process.value.orgao_julgador.id, name: process.value.orgao_julgador.name } : null;
    })
    .finally(() => {
      isUpdatingJurisdiction.value = false;
    });
}

/**
 * Função para confirmar a desassociação de uma parte.
 * @param {Object} parte - A parte a ser desassociada.
 */
function confirmDetach(parte) {
  Swal.fire({
    title: 'Tem certeza?',
    text: `Você deseja desassociar ${parte.name} deste processo?`,
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#d33',
    cancelButtonColor: '#3085d6',
    confirmButtonText: 'Sim, desassociar',
    cancelButtonText: 'Cancelar'
  }).then((result) => {
    if (result.isConfirmed) {
      detachPerson(parte);
    }
  });
}

/**
 * Função para desassociar uma parte do processo.
 * @param {Object} parte - A parte a ser desassociada.
 */
function detachPerson(parte) {
  // Mostra um indicador de carregamento
  Swal.fire({
    title: 'Desassociando...',
    allowOutsideClick: false,
    didOpen: () => {
      Swal.showLoading();
    }
  });

  detachPersonFromProcess(processId, parte.id)
    .then(response => {
      // Atualiza a lista de partes removendo a parte desassociada
      process.value.peoples = process.value.peoples.filter(p => p.id !== parte.id);

      // Mostra uma mensagem de sucesso
      Swal.fire(
        'Desassociado!',
        'A parte foi desassociada do processo com sucesso.',
        'success'
      );
    })
    .catch(error => {
      console.error('Erro ao desassociar a parte:', error);
      // Mostra uma mensagem de erro
      Swal.fire(
        'Erro!',
        'Ocorreu um erro ao desassociar a parte do processo.',
        'error'
      );
    });
}

/**
 * Função para confirmar a associação de uma pessoa.
 * @param {Object} person - A pessoa a ser associada.
 */
function confirmAttach(person) {
  if (!person) return; // Evita chamar o SweetAlert se person for null

  Swal.fire({
    title: 'Tem certeza?',
    text: `Você deseja associar ${person.name} a este processo?`,
    icon: 'question',
    showCancelButton: true,
    confirmButtonColor: '#3085d6',
    cancelButtonColor: '#d33',
    confirmButtonText: 'Sim, associar',
    cancelButtonText: 'Cancelar'
  }).then((result) => {
    if (result.isConfirmed) {
      attachPerson(person);
    }
  });
}

/**
 * Função para associar uma pessoa ao processo.
 * @param {Object} person - A pessoa a ser associada.
 */
function attachPerson(person) {
  // Mostra um indicador de carregamento
  Swal.fire({
    title: 'Associando...',
    allowOutsideClick: false,
    didOpen: () => {
      Swal.showLoading();
    }
  });

  attachPersonToProcess(processId, person.id, 'Ativo') // 'polo' pode ser ajustado conforme necessidade
    .then(response => {
      // Atualiza a lista de partes adicionando a nova pessoa
      process.value.peoples.push({
        id: person.id,
        name: person.name,
        cpf: person.cpf,
        pivot: {
          polo: 'Ativo' // ou 'Passivo' conforme necessário
        }
      });

      // Limpa a seleção no VueSelect
      selectedPerson.value = null;

      // Mostra uma mensagem de sucesso
      Swal.fire(
        'Associado!',
        'A pessoa foi associada ao processo com sucesso.',
        'success'
      );
    })
    .catch(error => {
      console.error('Erro ao associar a pessoa:', error);
      // Mostra uma mensagem de erro
      Swal.fire(
        'Erro!',
        'Ocorreu um erro ao associar a pessoa ao processo.',
        'error'
      );
    });
}

/**
 * Função para buscar pessoas disponíveis para associar.
 * @param {string} searchTerm - Termo de busca inserido pelo usuário.
 */
function searchAvailablePeople(searchTerm) {
  if (!searchTerm) {
    availablePeople.value = [];
    return;
  }

  isSearching.value = true;

  searchProcesses(searchTerm)
    .then(data => {
      // Filtrar pessoas que ainda não estão associadas ao processo
      const currentPeopleIds = process.value.peoples.map(p => p.id);
      // Supondo que cada 'processItem' tenha um array de 'peoples'
      const people = data.flatMap(processItem => processItem.peoples)
                         .filter(person => !currentPeopleIds.includes(person.id));
      
      // Remover duplicatas (se houver)
      const uniquePeopleMap = new Map();
      people.forEach(person => {
        if (!uniquePeopleMap.has(person.id)) {
          uniquePeopleMap.set(person.id, person);
        }
      });
      const uniquePeople = Array.from(uniquePeopleMap.values());

      availablePeople.value = uniquePeople.map(person => ({
        id: person.id,
        name: person.name,
        cpf: person.cpf,
        label: `${person.name} - CPF: ${person.cpf}`,
        polo: 'Ativo' // Ajuste conforme sua lógica ou deixe o usuário escolher
      }));
    })
    .catch(error => {
      console.error('Erro ao buscar as pessoas:', error);
    })
    .finally(() => {
      isSearching.value = false;
    });
}

// Função debounce para otimizar as buscas de pessoas
const debouncedSearch = debounce((searchTerm) => {
  searchAvailablePeople(searchTerm);
}, 500); // 500ms de debounce

/**
 * Função para lidar com a atualização dos campos.
 */
function handleUpdateFields() {
  const { sentenca, liminar, resultado } = updatedFields.value;

  // Cria um objeto contendo apenas os campos que foram alterados
  const fieldsToUpdate = {};
  if (sentenca !== process.value.sentenca) fieldsToUpdate.sentenca = sentenca;
  if (liminar !== process.value.liminar) fieldsToUpdate.liminar = liminar;
  if (resultado !== process.value.resultado) fieldsToUpdate.resultado = resultado;

  // Validação: pelo menos um campo deve ser alterado
  if (Object.keys(fieldsToUpdate).length === 0) {
    Swal.fire(
      'Nenhuma alteração',
      'Por favor, selecione pelo menos um campo para atualizar.',
      'info'
    );
    return;
  }

  // Confirmação via SweetAlert2
  Swal.fire({
    title: 'Tem certeza?',
    text: 'Você deseja atualizar os campos selecionados?',
    icon: 'question',
    showCancelButton: true,
    confirmButtonColor: '#3085d6',
    cancelButtonColor: '#d33',
    confirmButtonText: 'Sim, atualizar',
    cancelButtonText: 'Cancelar'
  }).then((result) => {
    if (result.isConfirmed) {
      updateFields(fieldsToUpdate);
    }
  });
}

/**
 * Função para atualizar os campos no backend.
 * @param {Object} fieldsToUpdate - Objeto contendo os campos a serem atualizados.
 */
function updateFields(fieldsToUpdate) {
  isUpdating.value = true;

  const promises = [];

  // Cria uma promessa para cada campo a ser atualizado
  Object.keys(fieldsToUpdate).forEach(field => {
    promises.push(updateProcessField(processId, field, fieldsToUpdate[field]));
  });

  // Executa todas as promessas em paralelo
  Promise.all(promises)
    .then(responses => {
      // Atualiza os dados locais do processo com os novos valores
      responses.forEach((response, index) => {
        const field = Object.keys(fieldsToUpdate)[index];
        process.value[field] = response.process[field];
      });

      // Reseta os campos atualizados com os novos valores do processo
      updatedFields.value = {
        sentenca: process.value.sentenca || '',
        liminar: process.value.liminar || '',
        resultado: process.value.resultado || '',
      };

      // Mostra uma mensagem de sucesso
      Swal.fire(
        'Atualizado!',
        'Os campos foram atualizados com sucesso.',
        'success'
      );
    })
    .catch(error => {
      console.error('Erro ao atualizar os campos:', error);
      // Mostra uma mensagem de erro
      Swal.fire(
        'Erro!',
        'Ocorreu um erro ao atualizar os campos.',
        'error'
      );
    })
    .finally(() => {
      isUpdating.value = false;
    });
}

/**
 * Função para marcar todas as movimentações como lidas.
 */
function runMarkAllMovementsAsRead() {
  Swal.fire({
    title: 'Tem certeza?',
    text: 'Você deseja marcar todas as movimentações como lidas?',
    icon: 'question',
    showCancelButton: true,
    confirmButtonColor: '#3085d6',
    cancelButtonColor: '#d33',
    confirmButtonText: 'Sim, marcar',
    cancelButtonText: 'Cancelar'
  }).then((result) => {
    if (result.isConfirmed) {
      performMarkAllMovementsAsRead();
    }
  });
}

/**
 * Função para realizar a marcação de todas as movimentações como lidas no backend.
 */
function performMarkAllMovementsAsRead() {
  Swal.fire({
    title: 'Marcando...',
    allowOutsideClick: false,
    didOpen: () => {
      Swal.showLoading();
    }
  });

  markAllMovementsAsRead(processId)
    .then(response => {
      // Atualiza todas as movimentações como lidas
      process.value.movements = process.value.movements.map(movement => ({
        ...movement,
        read: 1
      }));

      Swal.fire(
        'Atualizado!',
        'Todas as movimentações foram marcadas como lidas.',
        'success'
      );
    })
    .catch(error => {
      console.error('Erro ao marcar movimentações como lidas:', error);
      Swal.fire(
        'Erro!',
        'Ocorreu um erro ao marcar as movimentações como lidas.',
        'error'
      );
    });
}

/**
 * Computed property para verificar se todas as movimentações já estão lidas.
 */
const areAllMovementsRead = computed(() => {
  return process.value.movements.every(movement => movement.read);
});

// Watcher para sincronizar referências quando tribunais são carregados
watch(courts, (newCourts) => {
  // Se há um tempSelectedCourt mas ele não tem courtSystems,
  // tenta encontrar na nova lista e atualizar a referência
  if (tempSelectedCourt.value && (!tempSelectedCourt.value.courtSystems || tempSelectedCourt.value.courtSystems.length === 0)) {
    const foundCourt = newCourts.find(c => c.id === tempSelectedCourt.value.id);
    if (foundCourt && foundCourt.courtSystems && foundCourt.courtSystems.length > 0) {
      tempSelectedCourt.value = foundCourt;
      selectedCourt.value = foundCourt;
    }
  }
}, { deep: true });

onMounted(async () => {
  // Carrega tribunais primeiro para garantir que os dados estejam disponíveis
  // quando o processo for inicializado
  await fetchCourts();
  await fetchProcess();
});
</script>

<style scoped>
/* Aproxima o conteúdo das abas do menu (remove o vão duplicado) */
.tab-content {
  margin-top: 0;
}

.form-label {
  flex: 0 0 120px;
  font-weight: 600;
  margin: 0px 0px;
  color: var(--ad-text, #3f4757);
}

/* Selects de status: mantêm a cor semântica via :style inline (getBorderColor),
   só refinamos a moldura para combinar com o design system. */
.form-select {
  box-sizing: border-box;
  border: 1px solid var(--ad-line, #e6e8ee);
  border-radius: 10px;
  padding: 8px 10px;
  flex: 1;
}

/* Notas/avisos no padrão do design system (substitui os .alert do Bootstrap) */
.proc-note {
  padding: 10px 12px;
  border-radius: 10px;
  font-size: 13px;
  border: 1px solid var(--ad-line, #e6e8ee);
  background: #f7f8fa;
  color: var(--ad-text, #3f4757);
}
.proc-note--warn {
  background: #fbf1dc;
  border-color: #f0e2bf;
  color: #8a6400;
}
.proc-note--info {
  background: #eef2f8;
  border-color: #d8e2f0;
  color: #26517f;
}
.proc-note--success {
  background: #e7f4ee;
  border-color: #cbe7d8;
  color: #15935a;
}

/* Listas de partes/movimentações: bordas no token da marca */
:deep(.list-group-item) {
  border-color: var(--ad-line, #e6e8ee);
}
</style>
