<template>
  <Layout>
    <template #header>
      <DefaultHeader 
        :title="task ? task.title : 'Carregando...'"
        :showBackButton="true"
      />
    </template>
    
    <!-- Top Actions Bar -->
    <div class="d-flex justify-content-between align-items-center px-3 py-2 bg-light border-bottom">
      <button 
        type="button" 
        class="btn btn-outline-secondary btn-sm d-flex align-items-center"
        @click="router.push('/tasks')"
      >
        <i class="bi bi-arrow-left"></i>
      </button>
      
      <div class="text-center">
        <span class="small text-muted fw-medium">Editando tarefa</span>
      </div>
      
      <button 
        type="submit" 
        class="btn btn-primary btn-sm d-flex align-items-center"
        @click="handleUpdateTask"
        :disabled="updating"
      >
        <div v-if="updating" class="spinner-border spinner-xs me-2"></div>
        <i v-else class="bi bi-check-circle me-2"></i>
        {{ updating ? 'Salvando...' : 'Salvar' }}
      </button>
    </div>
    
    <div class="p-4">
      <!-- Loading State -->
      <div v-if="loading" class="text-center py-5">
        <div class="spinner-border text-primary" role="status">
          <span class="visually-hidden">Carregando...</span>
        </div>
        <p class="mt-2 text-muted">Carregando detalhes da tarefa...</p>
      </div>

      <!-- Error State -->
      <div v-else-if="error" class="alert alert-danger" role="alert">
        <h4 class="alert-heading">Erro ao carregar tarefa</h4>
        <p>{{ error }}</p>
        <hr>
        <button class="btn btn-outline-danger" @click="fetchTaskDetails">
          <i class="bi bi-arrow-clockwise me-2"></i>
          Tentar novamente
        </button>
      </div>

      <!-- Edit Form -->
      <div v-else-if="task" class="task-edit-form">
   

        <form @submit.prevent="handleUpdateTask">
          <!-- Top Row: Title and State -->
          <div class="row mb-3">
            <div class="col-md-8">
              <label for="taskTitle" class="form-label">Título da Tarefa</label>
              <input 
                type="text" 
                class="form-control" 
                id="taskTitle" 
                v-model="editForm.title" 
                required
                :disabled="updating"
              >
            </div>
            <div class="col-md-4">
              <label for="taskState" class="form-label">Estágio</label>
              <select 
                class="form-select" 
                id="taskState" 
                v-model="editForm.task_state_id" 
                required
                :disabled="updating"
              >
                <option disabled value="">Selecione um estágio</option>
                <option v-for="state in taskStates" :key="state.id" :value="state.id">
                  {{ state.title }}
                </option>
              </select>
            </div>
            <div class="col-md-4">
              <label for="taskDeadline" class="form-label">Prazo</label>
              
              <VueDatePicker
                id="taskDeadline"
                v-model="editForm.deadline"
                :enable-time-picker="true"
                format="dd/MM/yyyy HH:mm"
                locale="pt-BR"
                :clearable="true"
                auto-apply
                :disabled="updating"
                :min-date="new Date()"
                :time-picker-inline="true"
                :minutes-increment="15"
              />
              
              <div class="form-text">
                <small>Para compromissos com horário específico</small>
              </div>
            </div>
          </div>

          <!-- Description Field -->
          <div class="mb-3">
            <label class="form-label">Descrição</label>
            <QuillEditor
              v-model:content="editForm.description"
              contentType="html"
              :options="quillOptions"
              :disabled="updating"
              style="min-height: 120px;"
            />
          </div>

          <!-- Two Column Layout for Processes and Collaborators -->
          <div class="row mb-3">
            <!-- Processes Column -->
            <div class="col-md-6">
              <Card title="Processos Associados" icon="bi bi-file-text">
                <template #body>
                  <div class="position-relative mb-3">
                    <input
                      type="text"
                      class="form-control form-control-sm"
                      id="processSearch"
                      v-model="processSearchQuery"
                      @input="handleProcessSearch"
                      @focus="showProcessResults = true"
                      @blur="hideProcessResults"
                      placeholder="Digite o número do processo ou nome da parte"
                      :disabled="updating"
                    >
                    
                    <!-- Process Search Results -->
                    <div v-if="showProcessResults && (processes.length > 0 || isSearchingProcesses)" class="position-absolute w-100 bg-white border border-top-0 rounded-bottom shadow-sm" style="z-index: 1000; max-height: 200px; overflow-y: auto;">
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
                          <div class="fw-semibold small">{{ process.process_num }}</div>
                          <div class="text-muted" style="font-size: 11px;">{{ process.peoples?.map(p => p.name).join(', ') || 'Sem partes cadastradas' }}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <!-- Selected Processes -->
                  <div class="selected-items-container">
                    <div v-if="editForm.processes.length === 0" class="text-muted small text-center py-3">
                      <i class="bi bi-file-plus display-6 d-block mb-2 opacity-50"></i>
                      Nenhum processo selecionado
                    </div>
                    <div v-else class="d-flex flex-column gap-2">
                      <div
                        v-for="process in editForm.processes"
                        :key="process.id"
                        class="selected-item d-flex align-items-center justify-content-between p-2 bg-light rounded"
                      >
                        <div class="flex-grow-1">
                          <div class="fw-semibold small">{{ process.process_num }}</div>
                          <div class="text-muted" style="font-size: 11px;">{{ formatProcessBadge(process) }}</div>
                        </div>
                        <button
                          type="button"
                          class="btn btn-sm btn-outline-danger btn-remove"
                          @click="removeProcess(process.id)"
                          :disabled="updating"
                        >
                          <i class="bi bi-x"></i>
                        </button>
                      </div>
                    </div>
                  </div>
                </template>
              </Card>
            </div>

            <!-- Collaborators Column -->
            <div class="col-md-6">
              <Card title="Colaboradores" icon="bi bi-people">
                <template #body>
                  <div class="collaborator-selection mb-3" style="max-height: 120px; overflow-y: auto;">
                    <div v-if="teamUsers.length === 0" class="text-muted small text-center py-3">
                      <i class="bi bi-person-plus display-6 d-block mb-2 opacity-50"></i>
                      Nenhum colaborador disponível!
                    </div>
                    <div v-else class="d-flex flex-column gap-1">
                      <div
                        v-for="user in teamUsers"
                        :key="user.id"
                        class="form-check form-check-sm"
                      >
                        <input
                          class="form-check-input"
                          type="checkbox"
                          :id="`user-${user.id}`"
                          :checked="editForm.collaborators.some(c => c.id === user.id)"
                          @change="toggleCollaborator(user)"
                          :disabled="updating"
                        >
                        <label class="form-check-label small" :for="`user-${user.id}`">
                          {{ getFirstAndLastName(user.name) }}
                        </label>
                      </div>
                    </div>
                  </div>
                  
                  <!-- Selected Collaborators -->
                  <div class="selected-items-container">
                    <div v-if="editForm.collaborators.length === 0" class="text-muted small text-center">
                      <i class="bi bi-person-check opacity-50"></i>
                      Nenhum colaborador selecionado
                    </div>
                    <div v-else class="d-flex flex-wrap gap-1">
                      <span
                        v-for="collaborator in editForm.collaborators"
                        :key="collaborator.id"
                        class="badge bg-success d-flex align-items-center gap-1"
                        style="font-size: 11px;"
                      >
                        <i class="bi bi-person-fill"></i>
                        {{ getFirstAndLastName(collaborator.name) }}
                      </span>
                    </div>
                  </div>
                </template>
              </Card>
            </div>
          </div>

        </form>
      </div>
    </div>
  </Layout>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import Layout from '@/components/Layout.vue'
import DefaultHeader from '@/components/DefaultHeader.vue'
import Card from '@/components/Card.vue'
import { getTaskDetails, updateTask } from '@/api/tasks.js'
import { searchProcesses } from '@/api/process.js'
import debounce from 'lodash.debounce'
import Swal from 'sweetalert2'
import { QuillEditor } from '@vueup/vue-quill'
import '@vueup/vue-quill/dist/vue-quill.snow.css'
import VueDatePicker from '@vuepic/vue-datepicker'
import '@vuepic/vue-datepicker/dist/main.css'

const route = useRoute()
const router = useRouter()
const taskId = computed(() => route.params.id)

// State
const loading = ref(true)
const updating = ref(false)
const error = ref(null)
const task = ref(null)
const taskStates = ref([])
const teamUsers = ref([])
const processes = ref([])
const processSearchQuery = ref('')
const showProcessResults = ref(false)
const isSearchingProcesses = ref(false)

// Edit form
const editForm = ref({
  title: '',
  description: '',
  task_state_id: '',
  deadline: null,
  collaborators: [],
  processes: []
})

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
}

// Fetch task details
const fetchTaskDetails = async () => {
  try {
    loading.value = true
    error.value = null
    
    const response = await getTaskDetails(taskId.value)
    
    task.value = response.task
    taskStates.value = response.taskStates
    teamUsers.value = response.teamUsers
    
    // Populate edit form
    editForm.value = {
      title: response.task.title,
      description: response.task.description || '',
      task_state_id: response.task.task_state_id,
      deadline: response.task.deadline ? new Date(response.task.deadline) : null,
      collaborators: [...(response.task.collaborators || [])],
      processes: [...(response.task.processes || [])]
    }
    
    // Deadline já será carregado com horário completo pelo datepicker
    
  } catch (err) {
    console.error('Erro ao carregar detalhes da tarefa:', err)
    error.value = 'Não foi possível carregar os detalhes da tarefa. Tente novamente.'
  } finally {
    loading.value = false
  }
}

// Process search with debounce
const debouncedSearchProcesses = debounce(async (searchTerm) => {
  if (!searchTerm || searchTerm.length < 3) {
    processes.value = []
    showProcessResults.value = false
    return
  }

  isSearchingProcesses.value = true
  showProcessResults.value = true

  try {
    processes.value = await searchProcesses(searchTerm)
  } catch (error) {
    console.error('Erro ao buscar processos:', error)
  } finally {
    isSearchingProcesses.value = false
  }
}, 500)

const handleProcessSearch = (event) => {
  const value = event.target.value
  processSearchQuery.value = value
  debouncedSearchProcesses(value)
}

const selectProcess = (process) => {
  if (!editForm.value.processes.find(p => p.id === process.id)) {
    editForm.value.processes.push(process)
  }
  processSearchQuery.value = ''
  showProcessResults.value = false
}

const removeProcess = (processId) => {
  editForm.value.processes = editForm.value.processes.filter(p => p.id !== processId)
}

const toggleCollaborator = (user) => {
  const index = editForm.value.collaborators.findIndex(c => c.id === user.id)
  if (index > -1) {
    editForm.value.collaborators.splice(index, 1)
  } else {
    editForm.value.collaborators.push(user)
  }
}

const hideProcessResults = () => {
  setTimeout(() => {
    showProcessResults.value = false
  }, 200)
}

const formatDateTimeForBackend = (date) => {
  if (!date) return null
  
  // Manter horário local sem conversão para UTC
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  const seconds = String(date.getSeconds()).padStart(2, '0')
  
  // Formato MySQL: YYYY-MM-DD HH:MM:SS (horário local)
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`
}

// Format functions (same as Tasks.vue)
const getFirstAndLastName = (fullName) => {
  if (!fullName) return ''
  const names = fullName.trim().split(' ').filter(name => name.length > 0)
  if (names.length <= 2) return fullName
  return `${names[0]} ${names[names.length - 1]}`
}

const formatProcessBadge = (process) => {
  if (!process.peoples || process.peoples.length === 0) {
    return 'Sem partes cadastradas'
  }
  const firstPerson = process.peoples[0]
  const shortName = getFirstAndLastName(firstPerson.name)
  return shortName
}

// Update task
const handleUpdateTask = async () => {
  if (!editForm.value.title || !editForm.value.task_state_id) {
    return
  }
  
  try {
    updating.value = true
    
    const taskData = {
      title: editForm.value.title,
      description: editForm.value.description,
      task_state_id: editForm.value.task_state_id,
      deadline: formatDateTimeForBackend(editForm.value.deadline),
      collaborators: editForm.value.collaborators.map(c => c.id),
      processes: editForm.value.processes.map(p => p.id)
    }
    
    await updateTask(taskId.value, taskData)
    
    await Swal.fire({
      toast: true,
      position: 'bottom',
      icon: 'success',
      title: 'Tarefa atualizada com sucesso!',
      showConfirmButton: false,
      timer: 3000,
      timerProgressBar: true
    })
    
    router.push('/tasks')
  } catch (error) {
    console.error('Erro ao atualizar tarefa:', error)
    await Swal.fire({
      toast: true,
      position: 'bottom',
      icon: 'error',
      title: 'Erro ao atualizar tarefa',
      showConfirmButton: false,
      timer: 3000,
      timerProgressBar: true
    })
  } finally {
    updating.value = false
  }
}

onMounted(() => {
  fetchTaskDetails()
})
</script>

<style scoped>
.task-edit-form {
  max-width: 100%;
}

.hover-bg-light:hover {
  background-color: #f8f9fa;
}

.cursor-pointer {
  cursor: pointer;
}

.btn.disabled {
  pointer-events: none;
}

.spinner-border-sm {
  width: 1rem;
  height: 1rem;
}

.spinner-xs {
  width: 0.7rem !important;
  height: 0.7rem !important;
  border-width: 1px !important;
}

/* Loading states */
.spinner-border {
  width: 3rem;
  height: 3rem;
}

/* Process search results */
.position-relative {
  position: relative;
}

.position-absolute {
  position: absolute;
  z-index: 1000;
}

/* Form styling */
.form-control:disabled,
.form-select:disabled {
  background-color: #e9ecef;
  opacity: 1;
}


/* Selected items container */
.selected-items-container {
  min-height: 60px;
  max-height: 150px;
  overflow-y: auto;
}

.selected-item {
  background-color: #f8f9fc;
  border: 1px solid #e3e6f0;
  transition: all 0.2s ease;
}

.selected-item:hover {
  background-color: #eef2f9;
  border-color: #d1d9e6;
}

.btn-remove {
  width: 28px;
  height: 28px;
  min-width: 28px;
  min-height: 28px;
  padding: 0;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  line-height: 1;
  flex-shrink: 0;
  border: 1px solid #dc3545;
}

.btn-remove:hover {
  background-color: #dc3545;
  border-color: #dc3545;
  color: white;
}

/* Collaborator selection */
.collaborator-selection {
  border: 1px solid #e3e6f0;
  border-radius: 6px;
  padding: 10px;
  background-color: #f8f9fc;
}

.form-check-sm {
  padding-left: 1.2em;
}

.form-check-sm .form-check-input {
  width: 0.9em;
  height: 0.9em;
  margin-top: 0.15em;
}

.form-check-sm .form-check-label {
  font-size: 13px;
}

/* Badge styling */
.badge {
  font-size: 11px;
  padding: 4px 8px;
  border-radius: 6px;
}

.badge.bg-success {
  background-color: #28a745 !important;
}

/* Empty state styling */
.display-6 {
  font-size: 2.5rem;
}

.opacity-50 {
  opacity: 0.5;
}

/* Quill editor customization */
:deep(.ql-editor) {
  min-height: 80px;
  font-size: 14px;
  line-height: 1.5;
}

:deep(.ql-toolbar) {
  border-top: 1px solid #ccc;
  border-left: 1px solid #ccc;
  border-right: 1px solid #ccc;
  border-radius: 6px 6px 0 0;
}

:deep(.ql-container) {
  border-bottom: 1px solid #ccc;
  border-left: 1px solid #ccc;
  border-right: 1px solid #ccc;
  border-radius: 0 0 6px 6px;
}

</style>