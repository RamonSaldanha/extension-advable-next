<template>
  <div class="process-tasks-container">
    <!-- Top Actions Bar -->
    <div class="d-flex justify-content-end align-items-center px-3 py-2 bg-light border-bottom">
      <router-link 
        :to="`/tasks/add?processId=${processId}`"
        class="btn btn-primary btn-sm d-flex align-items-center"
      >
        <i class="bi bi-plus-circle me-2"></i>
        Adicionar tarefas
      </router-link>
    </div>
    
    <div class="p-4">

    <!-- Loading State -->
    <div v-if="loading" class="text-center py-4">
      <div class="spinner-border text-primary" role="status">
        <span class="visually-hidden">Carregando...</span>
      </div>
      <p class="mt-2 text-muted">Carregando tarefas...</p>
    </div>
    
    <!-- Empty State -->
    <div v-else-if="tasks.length === 0" class="empty-state text-center py-4">
      <i class="bi bi-clipboard-x display-4 text-muted mb-3"></i>
      <h6 class="text-muted">Nenhuma tarefa associada</h6>
      <p class="text-muted">Este processo ainda não possui tarefas criadas.</p>
      
    </div>
    
    <!-- Task Sections -->
    <div v-else class="task-sections">
      <!-- Pending Tasks -->
      <div v-if="pendingTasks.length > 0" class="task-section mb-4">
        <div class="section-header">
          <div class="d-flex align-items-center px-3">
            <i class="bi bi-list-task text-primary me-2"></i>
            <h6 class="mb-0 fw-bold text-dark">Pendentes</h6>
            <span class="badge bg-primary rounded-pill ms-auto">{{ pendingTasks.length }}</span>
            <small v-if="urgentTasksCount > 0" class="text-danger ms-2">
              <i class="bi bi-exclamation-triangle-fill me-1"></i>{{ urgentTasksCount }} urgente(s)
            </small>
          </div>
        </div>
        <div class="task-list">
          <div 
            v-for="task in pendingTasks" 
            :key="task.id" 
            class="task-item" 
            :class="{ 'urgent-task': isUrgentTask(task) }"
          >
            <div class="d-flex align-items-start p-2">
              <div class="task-checkbox me-3">
                <input
                  class="form-check-input"
                  type="checkbox"
                  :checked="task.completed"
                  @change="toggleCompleted(task)"
                />
              </div>
              <div class="task-content flex-grow-1" @click="navigateToTask(task.id)" style="cursor: pointer;">
                <!-- Task Title -->
                <div class="d-flex align-items-start mb-1">
                  <div class="flex-grow-1">
                    <h6 class="task-title mb-0" :class="{ 'completed': task.completed }">
                      <i v-if="isUrgentTask(task)" class="bi bi-exclamation-circle text-danger me-1 urgent-icon"></i>
                      {{ task.title }}
                    </h6>
                    <!-- Collaborators -->
                    <div v-if="task.collaborators && task.collaborators.length > 0" class="collaborators-info mb-1">
                      <small class="text-muted d-flex align-items-center">
                        <i class="bi bi-person me-1"></i>
                        {{ task.collaborators.slice(0, 2).map(c => getFirstAndLastName(c.name)).join(', ') }}
                        <span v-if="task.collaborators.length > 2"> +{{ task.collaborators.length - 2 }}</span>
                      </small>
                    </div>
                  </div>
                  
                  <div class="task-meta d-flex align-items-center ms-2">
                    <span v-if="task.task_state" class="status-badge me-2" :style="{ backgroundColor: task.task_state.color }">
                      {{ task.task_state.title }}
                    </span>
                    <span v-if="task.deadline" class="deadline-badge" :class="{ 'urgent-deadline': isUrgentTask(task) }">
                      <i class="bi bi-calendar3 me-1"></i>
                      {{ formatDeadline(task.deadline) }}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Completed Tasks -->
      <div v-if="completedTasks.length > 0" class="task-section">
        <div class="section-header">
          <div class="d-flex align-items-center px-3">
            <i class="bi bi-check-circle-fill text-success me-2"></i>
            <h6 class="mb-0 fw-bold text-dark">Concluídas</h6>
            <span class="badge bg-success rounded-pill ms-auto">{{ completedTasks.length }}</span>
          </div>
        </div>
        <div class="task-list completed-list">
          <div 
            v-for="task in completedTasks" 
            :key="task.id" 
            class="task-item completed"
          >
            <div class="d-flex align-items-start p-2">
              <div class="task-checkbox me-3">
                <input
                  class="form-check-input"
                  type="checkbox"
                  :checked="task.completed"
                  @change="toggleCompleted(task)"
                />
              </div>
              <div class="task-content flex-grow-1" @click="navigateToTask(task.id)" style="cursor: pointer;">
                <div class="d-flex align-items-center justify-content-between mb-1">
                  <h6 class="task-title mb-0 completed">
                    {{ task.title }}
                  </h6>
                  <small class="text-muted">
                    <i class="bi bi-check-circle me-1"></i>
                    Concluída
                  </small>
                </div>
                
                <div class="task-details d-flex align-items-center" v-if="task.collaborators && task.collaborators.length > 0">
                  <!-- Collaborators -->
                  <div class="collaborators">
                    <small class="text-muted">{{ task.collaborators.map(c => getFirstAndLastName(c.name)).join(', ') }}</small>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import { getTasksByProcess, toggleTaskCompleted } from '@/api/tasks.js';
import Swal from 'sweetalert2';

const router = useRouter();

const props = defineProps({
  processId: {
    type: [String, Number],
    required: true
  }
});

const tasks = ref([]);
const loading = ref(true);

const fetchTasks = async () => {
  try {
    loading.value = true;
    tasks.value = await getTasksByProcess(props.processId);
  } catch (error) {
    console.error('Erro ao buscar tarefas do processo:', error);
    Swal.fire({
      icon: 'error',
      title: 'Erro!',
      text: 'Não foi possível carregar as tarefas do processo.',
      toast: true,
      position: 'top-end',
      showConfirmButton: false,
      timer: 3000
    });
  } finally {
    loading.value = false;
  }
};

const getFirstAndLastName = (fullName) => {
  if (!fullName) return '';
  const names = fullName.trim().split(' ').filter(name => name.length > 0);
  if (names.length <= 2) return fullName;
  return `${names[0]} ${names[names.length - 1]}`;
};

const formatDeadline = (deadline) => {
  if (!deadline) return '';
  const date = new Date(deadline);
  const now = new Date();
  const diffTime = date.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) return 'Hoje';
  if (diffDays === 1) return 'Amanhã';
  if (diffDays === -1) return 'Ontem';
  if (diffDays < 0) return `${Math.abs(diffDays)} dias atrás`;
  if (diffDays <= 7) return `Em ${diffDays} dias`;
  
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
};

// Computed properties para agrupar tarefas
const pendingTasks = computed(() => {
  return tasks.value.filter(task => !task.completed).sort((a, b) => {
    const aUrgent = isUrgentTask(a);
    const bUrgent = isUrgentTask(b);
    
    // Tarefas urgentes primeiro
    if (aUrgent && !bUrgent) return -1;
    if (!aUrgent && bUrgent) return 1;
    
    // Depois por deadline
    if (a.deadline && b.deadline) {
      return new Date(a.deadline) - new Date(b.deadline);
    }
    if (a.deadline && !b.deadline) return -1;
    if (!a.deadline && b.deadline) return 1;
    
    // Por último por data de criação
    return new Date(b.created_at) - new Date(a.created_at);
  });
});

const urgentTasksCount = computed(() => {
  return pendingTasks.value.filter(task => isUrgentTask(task)).length;
});

const completedTasks = computed(() => {
  return tasks.value.filter(task => task.completed);
});

const isUrgentTask = (task) => {
  if (!task.deadline) return false;
  return new Date(task.deadline) <= new Date(Date.now() + 2 * 24 * 60 * 60 * 1000); // Próximas 48h
};

const toggleCompleted = async (task) => {
  try {
    const updatedTask = await toggleTaskCompleted(task.id, !task.completed);
    const index = tasks.value.findIndex(t => t.id === task.id);
    if (index !== -1) {
      tasks.value[index].completed = updatedTask.completed;
    }

    if (updatedTask.completed) {
      Swal.fire({
        toast: true,
        position: 'bottom',
        icon: 'success',
        title: 'Tarefa concluída!',
        showConfirmButton: false,
        timer: 3000,
        timerProgressBar: true
      });
    }
  } catch (error) {
    console.error('Erro ao atualizar tarefa:', error);
    Swal.fire({
      icon: 'error',
      title: 'Erro!',
      text: 'Não foi possível atualizar a tarefa.',
      toast: true,
      position: 'top-end',
      showConfirmButton: false,
      timer: 3000
    });
  }
};

const navigateToTask = (taskId) => {
  router.push({ name: 'TaskDetail', params: { id: taskId } });
};

onMounted(() => {
  fetchTasks();
});
</script>

<style scoped>
/* Task Sections Styles */
.process-tasks-container {
  max-width: 100%;
}

.task-section {
  background: #fff;
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid #e9ecef;
}

.section-header {
  background: #f8f9fa;
  border-bottom: 1px solid #e9ecef;
  padding: 12px 0;
  margin: 0 !important;
}

.section-header h6 {
  color: #2c3e50;
  font-weight: 600;
}

.section-header i {
  font-size: 18px;
}

/* Task List */
.task-list {
  background: #fff;
}

/* Task Checkbox */
.task-checkbox {
  margin-top: 2px;
}

.form-check-input {
  width: 18px;
  height: 18px;
  border: 2px solid #dee2e6;
  border-radius: 4px;
}

.form-check-input:checked {
  background-color: #28a745;
  border-color: #28a745;
}

/* Task Content */
.task-content {
  min-width: 0;
}

.task-title {
  color: #2c3e50;
  font-weight: 500;
  line-height: 1.4;
  font-size: 15px;
  text-align: left;
  margin-right: 8px;
}

.task-title.completed {
  text-decoration: line-through;
  color: #6c757d;
}

/* Task Meta Info */
.task-meta {
  flex-shrink: 0;
  align-items: flex-start;
}

.status-badge {
  font-size: 11px;
  padding: 4px 8px;
  border-radius: 6px;
  color: white;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.deadline-badge {
  font-size: 11px;
  color: #6c757d;
  display: flex;
  align-items: center;
  padding: 2px 6px;
  background-color: #f8f9fa;
  border-radius: 4px;
  white-space: nowrap;
  flex-shrink: 0;
}

.deadline-badge.urgent-deadline {
  background-color: #fff5f5;
  color: #dc3545;
  border: 1px solid #f8d7da;
}

.deadline-badge i {
  font-size: 10px;
}

/* Colaborators Icon */
.collaborators-info i {
  font-size: 13px;
  color: #6c757d;
}

.collaborators-info {
  margin-bottom: 6px;
}

.collaborators-info small {
  font-size: 11px;
  color: #6c757d;
}

/* Urgent Task Styles */
.urgent-task {
  border-left: 3px solid #dc3545;
  background-color: #fff9f9;
}

.urgent-icon {
  font-size: 12px;
}

.task-item {
  border-bottom: 1px solid #f1f3f4;
  transition: all 0.2s ease;
  cursor: pointer;
}

.task-item:last-child {
  border-bottom: none;
}

.task-item:hover {
  background-color: #f8f9fa;
}

.task-item.completed {
  opacity: 0.7;
  background-color: #f8f9fa;
}

/* Completed List Specific Styles */
.completed-list .task-item {
  background-color: #f8f9fa;
}

.completed-list .task-title {
  color: #6c757d;
  font-size: 14px;
}

/* Empty State */
.empty-state i {
  font-size: 3rem;
  opacity: 0.5;
}

/* Loading State */
.spinner-border {
  width: 2rem;
  height: 2rem;
}

/* Responsive Design */
@media (max-width: 576px) {
  .task-item > div {
    padding: 12px 16px !important;
  }
  
  .section-header {
    padding: 10px 0;
  }
  
  .task-title {
    font-size: 14px;
  }
  
  .task-meta {
    flex-direction: column;
    align-items: flex-end;
    gap: 3px;
  }
  
  .deadline-badge {
    font-size: 10px;
  }
}

/* Subtle animations */
@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.task-item {
  animation: slideIn 0.3s ease;
}

/* Focus states for accessibility */
.form-check-input:focus {
  border-color: #80bdff;
  box-shadow: 0 0 0 0.2rem rgba(0,123,255,0.25);
}

.task-item:focus-within {
  outline: 2px solid #007bff;
  outline-offset: -2px;
}
</style>