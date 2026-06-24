<template>
  <div class="process-tasks-container">
    <!-- Loading -->
    <div v-if="loading" class="text-center py-4">
      <div class="spinner-border text-primary" role="status">
        <span class="visually-hidden">Carregando...</span>
      </div>
      <p class="mt-2 text-muted">Carregando tarefas...</p>
    </div>

    <!-- Sem nenhuma tarefa -->
    <div v-else-if="tasks.length === 0" class="adbl-empty">
      <i class="bi bi-clipboard-x"></i>
      <p>Este processo ainda não possui tarefas.</p>
      <router-link :to="`/tasks/add?processId=${processId}`" class="add-task-btn">
        <i class="bi bi-plus"></i>
        Adicionar tarefa
      </router-link>
    </div>

    <!-- Lista com filtros -->
    <div v-else class="pt-body">
      <!-- Barra: filtros rápidos + botão -->
      <div class="pt-toolbar">
        <div class="task-tabs">
          <button class="task-tab" :class="{ active: view === 'pending' }" @click="view = 'pending'">
            Pendentes <span class="task-tab__count">{{ pendingTasks.length }}</span>
          </button>
          <button class="task-tab" :class="{ active: view === 'urgent' }" @click="view = 'urgent'">
            Urgentes <span class="task-tab__count task-tab__count--danger">{{ urgentTasksCount }}</span>
          </button>
          <button class="task-tab" :class="{ active: view === 'completed' }" @click="view = 'completed'">
            Concluídas <span class="task-tab__count task-tab__count--done">{{ completedTasks.length }}</span>
          </button>
        </div>
        <router-link :to="`/tasks/add?processId=${processId}`" class="add-task-btn">
          <i class="bi bi-plus"></i>
          Nova tarefa
        </router-link>
      </div>

      <!-- Lista da aba ativa -->
      <div v-if="visibleTasks.length > 0" class="task-list">
        <div
          v-for="task in visibleTasks"
          :key="task.id"
          class="task-card"
          :class="{ 'task-card--done': task.completed, 'task-card--urgent': !task.completed && isOverdueTask(task) }"
        >
          <div class="task-card-inner">
            <div class="task-body" @click="navigateToTask(task.id)">
              <div class="task-top-row">
                <h6 class="task-name" :class="{ 'task-name--done': task.completed }">{{ task.title }}</h6>
                <span v-if="task.task_state" class="ad-pill ad-pill--cat">{{ task.task_state.title }}</span>
                <span
                  v-if="!task.completed && deadlineLabel(task)"
                  class="ad-pill"
                  :class="isOverdueTask(task) ? 'ad-pill--late' : 'ad-pill--time'"
                >{{ deadlineLabel(task) }}</span>
              </div>

              <div v-if="task.collaborators && task.collaborators.length" class="task-assignees">
                <span v-for="c in task.collaborators.slice(0, 3)" :key="c.id" class="task-assignee">
                  <i class="bi bi-person-fill"></i>{{ getFirstAndLastName(c.name) }}
                </span>
                <span v-if="task.collaborators.length > 3" class="task-assignee task-assignee--more">
                  +{{ task.collaborators.length - 3 }}
                </span>
              </div>

              <div v-if="task.created_at" class="task-bottom-row">
                <span class="task-age">{{ formatAge(task.created_at) }}</span>
              </div>
            </div>

            <div class="task-check">
              <label class="check-wrapper">
                <input
                  type="checkbox"
                  :checked="task.completed"
                  @change="toggleCompleted(task)"
                />
                <span class="check-custom" :class="{ 'check-custom--done': task.completed }"></span>
              </label>
            </div>
          </div>
        </div>
      </div>

      <!-- Aba sem itens -->
      <div v-else class="tab-empty">
        <i class="bi bi-clipboard-check"></i>
        <p>{{ emptyMessage }}</p>
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

// Filtro rápido ativo: pending | urgent | completed
const view = ref('pending');

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

// Prazo já vencido?
const isOverdueTask = (task) => {
  if (!task.deadline) return false;
  return new Date(task.deadline) < new Date();
};

// Rótulo curto do prazo (pílula): Atrasado / Hoje / Amanhã / Em N dias / dd/mm
const deadlineLabel = (task) => {
  if (!task.deadline) return '';
  const date = new Date(task.deadline);
  const now = new Date();
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diffDays = Math.round((startDate - startToday) / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return 'Atrasado';
  if (diffDays === 0) return 'Hoje';
  if (diffDays === 1) return 'Amanhã';
  if (diffDays <= 7) return `Em ${diffDays} dias`;
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
};

// Idade da tarefa a partir da criação: Hoje / Ontem / N dias atrás
const formatAge = (createdAt) => {
  if (!createdAt) return '';
  const date = new Date(createdAt);
  const now = new Date();
  const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));
  if (diffDays <= 0) return 'Hoje';
  if (diffDays === 1) return 'Ontem';
  return `${diffDays} dias atrás`;
};

// Tarefa urgente: próximas 48h (inclui vencidas) — usado para ordenar/contar/filtrar
const isUrgentTask = (task) => {
  if (!task.deadline) return false;
  return new Date(task.deadline) <= new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);
};

const pendingTasks = computed(() => {
  return tasks.value.filter(task => !task.completed).sort((a, b) => {
    const aUrgent = isUrgentTask(a);
    const bUrgent = isUrgentTask(b);
    if (aUrgent && !bUrgent) return -1;
    if (!aUrgent && bUrgent) return 1;
    if (a.deadline && b.deadline) {
      return new Date(a.deadline) - new Date(b.deadline);
    }
    if (a.deadline && !b.deadline) return -1;
    if (!a.deadline && b.deadline) return 1;
    return new Date(b.created_at) - new Date(a.created_at);
  });
});

const urgentTasksCount = computed(() => {
  return pendingTasks.value.filter(task => isUrgentTask(task)).length;
});

const completedTasks = computed(() => {
  return tasks.value.filter(task => task.completed);
});

const visibleTasks = computed(() => {
  if (view.value === 'completed') return completedTasks.value;
  if (view.value === 'urgent') return pendingTasks.value.filter(task => isUrgentTask(task));
  return pendingTasks.value;
});

const emptyMessage = computed(() => {
  if (view.value === 'completed') return 'Nenhuma tarefa concluída.';
  if (view.value === 'urgent') return 'Nenhuma tarefa urgente.';
  return 'Nenhuma tarefa pendente.';
});

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
.process-tasks-container {
  max-width: 100%;
}

.pt-body {
  padding: 8px 16px 16px;
}

/* Barra: filtros + botão (ocupa a largura, sem banda vazia) */
.pt-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  flex-wrap: wrap;
  margin-bottom: 16px;
}

.add-task-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 6px 14px;
  background: #16223f;
  color: #fff;
  border: none;
  border-radius: 20px;
  font-size: 13px;
  font-weight: 600;
  text-decoration: none;
  white-space: nowrap;
  transition: background 0.2s ease;
}
.add-task-btn:hover {
  background: #0f1a32;
  color: #fff;
}
.add-task-btn:active {
  transform: translateY(1px);
}
.add-task-btn i {
  font-size: 16px;
  font-weight: 700;
}

/* Filtros rápidos (idênticos à página de Tarefas) */
.task-tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin: 0;
}
.task-tab {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 7px 13px;
  border: 1px solid var(--ad-line, #e6e8ee);
  border-radius: 999px;
  background: #fff;
  color: var(--ad-text, #3f4757);
  font-size: 12.5px;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.15s, border-color 0.15s, color 0.15s;
}
.task-tab:hover {
  border-color: #cfd5e0;
}
.task-tab.active {
  background: var(--ad-navy, #16223f);
  border-color: var(--ad-navy, #16223f);
  color: #fff;
}
.task-tab__count {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 18px;
  height: 18px;
  padding: 0 5px;
  border-radius: 999px;
  background: #eef1f7;
  color: var(--ad-navy, #16223f);
  font-size: 11px;
  font-weight: 700;
}
.task-tab__count--danger {
  background: #f6dadb;
  color: #a23a44;
}
.task-tab__count--done {
  background: #e7f4ee;
  color: #15935a;
}
.task-tab.active .task-tab__count {
  background: rgba(255, 255, 255, 0.22);
  color: #fff;
}

/* Lista */
.task-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

/* Card (idêntico à página de Tarefas) */
.task-card {
  background: #ffffff;
  border: 1px solid var(--ad-line, #e6e8ee);
  border-radius: 12px;
  transition: all 0.2s ease;
  overflow: hidden;
}
.task-card:hover {
  border-color: #cfd5e0;
}
.task-card--done {
  opacity: 0.65;
  background: #fafafa;
}
.task-card--done:hover {
  opacity: 0.85;
}
.task-card-inner {
  display: flex;
  align-items: flex-start;
  padding: 14px 16px;
  gap: 12px;
}

/* Corpo */
.task-body {
  flex: 1;
  min-width: 0;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.task-top-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}
.task-name {
  font-size: 14px;
  font-weight: 600;
  color: var(--ad-ink, #1a2233);
  margin: 0;
  line-height: 1.3;
  word-break: break-word;
}
.task-name--done {
  text-decoration: line-through;
  color: #8b95a5;
  font-weight: 500;
}

/* Responsáveis */
.task-assignees {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 8px;
}
.task-assignee {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 11.5px;
  font-weight: 500;
  color: var(--ad-text, #3f4757);
  background: #eef0f4;
  border-radius: 999px;
  padding: 3px 10px;
}
.task-assignee i {
  font-size: 11px;
  color: var(--ad-muted, #8b93a3);
}
.task-assignee--more {
  color: var(--ad-muted, #8b93a3);
}

/* Linha inferior: idade */
.task-bottom-row {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  margin-top: 8px;
}
.task-age {
  margin-left: auto;
  flex-shrink: 0;
  font-size: 12px;
  color: var(--ad-muted, #8b93a3);
  white-space: nowrap;
  padding-top: 1px;
}

/* Checkbox personalizado (à direita) */
.task-check {
  flex-shrink: 0;
  padding-top: 1px;
}
.check-wrapper {
  display: flex;
  cursor: pointer;
  position: relative;
}
.check-wrapper input {
  position: absolute;
  opacity: 0;
  width: 0;
  height: 0;
}
.check-custom {
  width: 18px;
  height: 18px;
  border: 2px solid #c5cbd3;
  border-radius: 5px;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}
.check-custom::after {
  content: '';
  width: 5px;
  height: 9px;
  border: solid #fff;
  border-width: 0 2px 2px 0;
  transform: rotate(45deg) scale(0);
  transition: transform 0.15s ease;
  margin-top: -1px;
}
.check-wrapper:hover .check-custom {
  border-color: #16223f;
  background: #eef1f7;
}
.check-wrapper input:checked + .check-custom {
  background: #16a34a;
  border-color: #16a34a;
}
.check-wrapper input:checked + .check-custom::after {
  transform: rotate(45deg) scale(1);
}
.check-custom--done {
  background: #16a34a !important;
  border-color: #16a34a !important;
}
.check-custom--done::after {
  transform: rotate(45deg) scale(1) !important;
}

/* Aba sem itens */
.tab-empty {
  text-align: center;
  color: var(--ad-muted, #8b93a3);
  padding: 32px 16px;
}
.tab-empty i {
  font-size: 30px;
  color: #cfd3dc;
  display: block;
  margin-bottom: 8px;
}
.tab-empty p {
  margin: 0;
  font-size: 13.5px;
}

/* Loading */
.spinner-border {
  width: 2rem;
  height: 2rem;
}
</style>
