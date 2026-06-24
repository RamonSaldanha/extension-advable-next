<template>
  <Layout>
    <template #header>
      <DefaultHeader />
    </template>
    
    <!-- Barra de ações -->
    <div class="adbl-subhead task-actionbar">
      <button
        type="button"
        class="adbl-back"
        @click="router.push('/tasks')"
      >
        <i class="bi bi-arrow-left"></i> Voltar
      </button>

      <span class="adbl-subhead__ctx">Criando tarefa</span>

      <button
        type="submit"
        class="adbl-btn adbl-btn--primary adbl-btn--sm"
        @click="handleAddTask"
        :disabled="adding"
      >
        <span v-if="adding" class="spinner-border spinner-xs"></span>
        <i v-else class="bi bi-plus-circle"></i>
        {{ adding ? 'Adicionando...' : 'Adicionar' }}
      </button>
    </div>
    
    <div class="p-4">
      <h1 class="ad-page-title mb-4">Nova tarefa</h1>
      <form @submit.prevent="handleAddTask">
        <div class="adbl-field">
          <label for="taskTitle" class="adbl-label">Título</label>
          <input type="text" class="adbl-input" id="taskTitle" v-model="newTask.title" required>
        </div>
        <div class="adbl-field">
          <label for="taskState" class="adbl-label">Estágio</label>
          <select class="adbl-select" id="taskState" v-model="newTask.task_state_id" required>
            <option disabled value="">Selecione um estágio</option>
            <option v-for="state in taskStates" :key="state.id" :value="state.id">{{ state.title }}</option>
          </select>
        </div>

        <div class="adbl-field">
          <label class="adbl-label">Descrição (opcional)</label>
          <QuillEditor
            v-model:content="newTask.description"
            contentType="html"
            :options="quillOptions"
            :disabled="adding"
            style="min-height: 120px;"
          />
        </div>

        <!-- Deadline Field -->
        <div class="adbl-field">
          <label for="taskDeadline" class="adbl-label">Prazo (opcional)</label>
          <div v-if="route.query.date" class="mb-2">
            <small class="text-success">
              <i class="bi bi-calendar-check"></i> Data pré-selecionada do calendário
            </small>
          </div>

          <VueDatePicker
            id="taskDeadline"
            v-model="newTask.deadline"
            :enable-time-picker="true"
            format="dd/MM/yyyy HH:mm"
            locale="pt-BR"
            placeholder="Selecione data e horário"
            :clearable="true"
            auto-apply
            :disabled="adding"
            :min-date="new Date()"
            class="dp-custom"
            :time-picker-inline="true"
            :minutes-increment="15"
          />
          
          <div class="adbl-muted-note">
            <i class="bi bi-info-circle"></i>
            Ideal para compromissos como audiências e reuniões
          </div>
        </div>

        <!-- Process Search -->
        <div class="adbl-field">
          <label for="processSearch" class="adbl-label">Associar Processos (opcional)</label>
          <div class="position-relative">
            <input
              type="text"
              class="adbl-input"
              id="processSearch"
              v-model="processSearchQuery"
              @input="handleProcessSearch"
              @focus="showProcessResults = true"
              @blur="hideProcessResults"
              placeholder="Digite o número do processo ou nome da parte"
            >
            
            <!-- Process Search Results -->
            <div v-if="showProcessResults && (processes.length > 0 || isSearchingProcesses)" class="position-absolute w-100 search-dropdown" style="z-index: 1000; max-height: 200px; overflow-y: auto;">
              <div v-if="isSearchingProcesses" class="p-3 text-center text-muted">
                <div class="spinner-border spinner-border-sm me-2"></div>
                Buscando...
              </div>
              <div v-else>
                <div
                  v-for="process in processes"
                  :key="process.id"
                  class="p-2 border-bottom cursor-pointer hover-bg-light"
                  @mousedown="selectProcess(process)"
                  style="cursor: pointer;"
                >
                  <div class="fw-semibold">{{ process.process_num }}</div>
                  <div class="text-muted small">{{ process.peoples?.map(p => p.name).join(', ') || 'Sem partes cadastradas' }}</div>
                </div>
              </div>
            </div>
          </div>
          
          <!-- Selected Processes -->
          <div v-if="newTask.processes.length > 0" class="mt-2">
            <div class="small text-muted mb-1">Processos selecionados:</div>
            <div class="d-flex flex-wrap gap-2">
              <span
                v-for="process in newTask.processes"
                :key="process.id"
                class="ad-pill ad-pill--cat"
              >
                {{ process.process_num }}
                <button
                  type="button"
                  class="btn-close btn-close-white"
                  style="font-size: 0.6em;"
                  @click="removeProcess(process.id)"
                ></button>
              </span>
            </div>
          </div>
        </div>

        <!-- Collaborators -->
        <div class="adbl-field">
          <label class="adbl-label">Colaboradores (opcional)</label>
          <div class="collab-box" style="max-height: 150px; overflow-y: auto;">
            <div v-if="teamUsers.length === 0" class="text-muted small">
              Nenhum colaborador disponível
            </div>
            <div v-else class="d-flex flex-column gap-2">
              <div
                v-for="user in teamUsers"
                :key="user.id"
                class="form-check"
              >
                <input
                  class="form-check-input"
                  type="checkbox"
                  :id="`user-${user.id}`"
                  :checked="newTask.collaborators.some(c => c.id === user.id)"
                  @change="toggleCollaborator(user)"
                >
                <label class="form-check-label" :for="`user-${user.id}`">
                  {{ user.name }}
                </label>
              </div>
            </div>
          </div>
          
          <!-- Selected Collaborators -->
          <div v-if="newTask.collaborators.length > 0" class="mt-2">
            <div class="small text-muted mb-1">Colaboradores selecionados:</div>
            <div class="d-flex flex-wrap gap-2">
              <span
                v-for="collaborator in newTask.collaborators"
                :key="collaborator.id"
                class="ad-pill ad-pill--cat"
              >
                {{ collaborator.name }}
              </span>
            </div>
          </div>
        </div>
      </form>
    </div>
  </Layout>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import Layout from '@/components/Layout.vue';
import DefaultHeader from '@/components/DefaultHeader.vue';
import { getTaskStates, addTask, getTeamUsers } from '@/api/tasks.js';
import { searchProcesses, getProcessById } from '@/api/process.js';
import debounce from 'lodash.debounce';
import VueDatePicker from '@vuepic/vue-datepicker';
import '@vuepic/vue-datepicker/dist/main.css';
import { QuillEditor } from '@vueup/vue-quill';
import '@vueup/vue-quill/dist/vue-quill.snow.css';

const router = useRouter();
const route = useRoute();
const taskStates = ref([]);
const teamUsers = ref([]);
const processes = ref([]);
const processSearchQuery = ref('');
const showProcessResults = ref(false);
const isSearchingProcesses = ref(false);
const adding = ref(false);

// Quill editor options
const quillOptions = {
  theme: 'snow',
  modules: {
    toolbar: [
      [{ header: [1, 2, 3, false] }],
      ['bold', 'italic', 'underline'],
      [{ list: 'ordered' }, { list: 'bullet' }],
      ['clean']
    ]
  },
  placeholder: 'Digite a descrição da tarefa...'
};

const newTask = ref({
  title: '',
  description: '',
  task_state_id: '',
  deadline: null,
  collaborators: [],
  processes: []
});

const fetchTaskStates = async () => {
  try {
    taskStates.value = await getTaskStates();
  } catch (error) {
    console.error('Erro ao buscar estágios de tarefas:', error);
  }
};

const fetchTeamUsers = async () => {
  try {
    teamUsers.value = await getTeamUsers();
  } catch (error) {
    console.error('Erro ao buscar usuários da equipe:', error);
  }
};

const debouncedSearchProcesses = debounce(async (searchTerm) => {
  if (!searchTerm || searchTerm.length < 3) {
    processes.value = [];
    showProcessResults.value = false;
    return;
  }

  isSearchingProcesses.value = true;
  showProcessResults.value = true;

  try {
    processes.value = await searchProcesses(searchTerm);
  } catch (error) {
    console.error('Erro ao buscar processos:', error);
  } finally {
    isSearchingProcesses.value = false;
  }
}, 500);

const handleProcessSearch = (event) => {
  const value = event.target.value;
  processSearchQuery.value = value;
  debouncedSearchProcesses(value);
};

const selectProcess = (process) => {
  if (!newTask.value.processes.find(p => p.id === process.id)) {
    newTask.value.processes.push(process);
  }
  processSearchQuery.value = '';
  showProcessResults.value = false;
};

const removeProcess = (processId) => {
  newTask.value.processes = newTask.value.processes.filter(p => p.id !== processId);
};

const toggleCollaborator = (user) => {
  const index = newTask.value.collaborators.findIndex(c => c.id === user.id);
  if (index > -1) {
    newTask.value.collaborators.splice(index, 1);
  } else {
    newTask.value.collaborators.push(user);
  }
};

const hideProcessResults = () => {
  setTimeout(() => {
    showProcessResults.value = false;
  }, 200);
};

const formatDateTimeForBackend = (date) => {
  if (!date) return null;
  
  // Manter horário local sem conversão para UTC
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  
  // Formato MySQL: YYYY-MM-DD HH:MM:SS (horário local)
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
};

const handleAddTask = async () => {
  if (!newTask.value.title || !newTask.value.task_state_id) {
    return;
  }
  
  try {
    adding.value = true;
    
    const taskData = {
      title: newTask.value.title,
      description: newTask.value.description,
      task_state_id: newTask.value.task_state_id,
      deadline: formatDateTimeForBackend(newTask.value.deadline),
      collaborators: newTask.value.collaborators.map(c => c.id),
      processes: newTask.value.processes.map(p => p.id)
    };
    
    await addTask(taskData);
    router.push('/tasks');
  } catch (error) {
    console.error('Erro ao adicionar tarefa:', error);
  } finally {
    adding.value = false;
  }
};

// Função para processar data pré-selecionada do calendário
const processPreselectedDate = () => {
  const dateParam = route.query.date;
  console.log('Processando data pré-selecionada:', dateParam);
  
  if (dateParam) {
    try {
      // Validar formato da data (YYYY-MM-DD)
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(dateParam)) {
        console.warn('Formato de data inválido:', dateParam);
        return;
      }
      
      // Converter string YYYY-MM-DD para objeto Date
      const preselectedDate = new Date(dateParam + 'T21:00:00'); // Usar 21h como horário padrão para compromissos
      
      // Verificar se a data é válida
      if (isNaN(preselectedDate.getTime())) {
        console.warn('Data inválida:', dateParam);
        return;
      }
      
      // Verificar se não é no passado (permitir hoje)
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      if (preselectedDate >= today) {
        newTask.value.deadline = preselectedDate;
        console.log('Data pré-selecionada aplicada:', preselectedDate);
      } else {
        console.warn('Data no passado ignorada:', dateParam);
      }
    } catch (error) {
      console.error('Erro ao processar data pré-selecionada:', error, dateParam);
    }
  }
};

// Função para processar processo pré-selecionado
const processPreselectedProcess = async () => {
  const processIdParam = route.query.processId;
  console.log('Processando processo pré-selecionado:', processIdParam);
  
  if (processIdParam) {
    try {
      // Buscar os detalhes do processo pelo ID
      const foundProcess = await getProcessById(processIdParam);
      
      if (foundProcess) {
        newTask.value.processes.push(foundProcess);
        console.log('Processo pré-selecionado aplicado:', foundProcess);
      } else {
        console.warn('Processo não encontrado:', processIdParam);
      }
    } catch (error) {
      console.error('Erro ao processar processo pré-selecionado:', error, processIdParam);
    }
  }
};

onMounted(async () => {
  fetchTaskStates();
  fetchTeamUsers();
  processPreselectedDate();
  await processPreselectedProcess();
});
</script>

<style scoped>
.spinner-xs {
  width: 0.7rem !important;
  height: 0.7rem !important;
  border-width: 1px !important;
}

.hover-bg-light:hover {
  background-color: #f8f9fa;
}

.cursor-pointer {
  cursor: pointer;
}

/* Barra de ações (Voltar + contexto + Adicionar) */
.task-actionbar {
  align-items: center;
  gap: 10px;
  margin-bottom: 0;
  padding: 10px 16px;
  border-bottom: 1px solid var(--ad-line, #e6e8ee);
}

/* Dropdown de resultados de busca de processo */
.search-dropdown {
  background: #fff;
  border: 1px solid var(--ad-line, #e6e8ee);
  border-radius: 0 0 10px 10px;
  box-shadow: 0 8px 24px rgba(20, 28, 50, 0.10);
}

/* Caixa de colaboradores */
.collab-box {
  border: 1px solid var(--ad-line, #e6e8ee);
  border-radius: 10px;
  padding: 12px;
}
</style>
