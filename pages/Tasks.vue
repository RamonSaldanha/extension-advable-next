<template>
  <Layout>
    <template #header>
      <DefaultHeader />
    </template>

    <!-- Stats Bar + Action -->
    <div class="stats-bar">
      <div class="stats-row">
        <div class="stat-chip">
          <span class="stat-number">{{ pendingTasks.length }}</span>
          <span class="stat-label">pendentes</span>
        </div>
        <div class="stat-chip stat-chip--success" v-if="completedTasks.length > 0">
          <span class="stat-number">{{ completedTasks.length }}</span>
          <span class="stat-label">concluídas</span>
        </div>
        <div class="stat-chip stat-chip--danger" v-if="urgentTasksCount > 0">
          <span class="stat-number">{{ urgentTasksCount }}</span>
          <span class="stat-label">urgentes</span>
        </div>
        <router-link to="/tasks/add" class="add-task-btn">
          <i class="bi bi-plus"></i>
          Nova tarefa
        </router-link>
      </div>
    </div>

    <div class="tasks-page">
      <!-- Filters -->
      <div class="filters-section">
        <button
          class="filter-toggle"
          type="button"
          @click="toggleFilters"
          :aria-expanded="filtersExpanded"
        >
          <div class="filter-toggle-left">
            <i class="bi bi-sliders2"></i>
            <span>Filtros</span>
            <span v-if="activeFiltersCount > 0" class="filter-count">{{ activeFiltersCount }}</span>
          </div>
          <i class="bi filter-chevron" :class="filtersExpanded ? 'bi-chevron-up' : 'bi-chevron-down'"></i>
        </button>

        <div class="filters-body" :class="{ 'filters-body--open': filtersExpanded }">
          <div class="filters-inner">
            <div class="filter-field">
              <div class="filter-input-wrap">
                <i class="bi bi-search filter-input-icon"></i>
                <input
                  type="text"
                  class="filter-input"
                  v-model="filters.searchTerm"
                  placeholder="Buscar tarefa, processo ou colaborador..."
                >
              </div>
            </div>
            <div class="filter-row">
              <div class="filter-field filter-field--half">
                <select class="filter-select" v-model="filters.collaboratorId">
                  <option value="">Todos colaboradores</option>
                  <option v-for="user in teamUsers" :key="user.id" :value="user.id">{{ user.name }}</option>
                </select>
              </div>
              <div class="filter-field filter-field--half">
                <select class="filter-select" v-model="filters.taskStateId">
                  <option value="">Todos estágios</option>
                  <option v-for="state in taskStates" :key="state.id" :value="state.id">{{ state.title }}</option>
                </select>
              </div>
            </div>
            <button
              v-if="activeFiltersCount > 0"
              type="button"
              class="clear-filters-btn"
              @click="clearFilters"
            >
              <i class="bi bi-x"></i>
              Limpar filtros
            </button>
          </div>
        </div>
      </div>

      <!-- Loading State -->
      <div v-if="loading" class="state-empty">
        <div class="loading-ring"></div>
        <p class="state-text">Carregando tarefas...</p>
      </div>

      <!-- Empty State -->
      <div v-else-if="filteredTasks.length === 0" class="state-empty">
        <div class="empty-icon-wrap">
          <i class="bi bi-clipboard2-check"></i>
        </div>
        <h5 class="state-title">
          {{ filters.searchTerm || filters.collaboratorId || filters.taskStateId ? 'Nenhuma tarefa encontrada' : 'Nenhuma tarefa ainda' }}
        </h5>
        <p class="state-text">
          {{ filters.searchTerm || filters.collaboratorId || filters.taskStateId ? 'Tente ajustar os filtros.' : 'Crie sua primeira tarefa para começar.' }}
        </p>
        <router-link
          v-if="!filters.searchTerm && !filters.collaboratorId && !filters.taskStateId"
          to="/tasks/add"
          class="empty-cta"
        >
          <i class="bi bi-plus me-1"></i>
          Criar tarefa
        </router-link>
      </div>

      <!-- Task Sections -->
      <div v-else class="task-sections">
        <!-- Pending Tasks -->
        <div v-if="pendingTasks.length > 0" class="task-group">
          <div class="group-header">
            <div class="group-header-left">
              <div class="group-dot group-dot--pending"></div>
              <span class="group-title">Pendentes</span>
            </div>
            <span class="group-count">{{ pendingTasks.length }}</span>
          </div>

          <div class="task-list">
            <div
              v-for="task in pendingTasks"
              :key="task.id"
              class="task-card"
              :class="{ 'task-card--urgent': isUrgentTask(task) }"
            >
              <div class="task-card-inner">
                <div class="task-check">
                  <label class="check-wrapper">
                    <input
                      type="checkbox"
                      :checked="task.completed"
                      @change="toggleCompleted(task)"
                    />
                    <span class="check-custom"></span>
                  </label>
                </div>

                <div class="task-body" @click="navigateToTask(task.id)">
                  <div class="task-top-row">
                    <h6 class="task-name">
                      <i v-if="isUrgentTask(task)" class="bi bi-exclamation-circle-fill urgent-dot"></i>
                      {{ task.title }}
                    </h6>
                  </div>

                  <div class="task-meta-row">
                    <!-- Collaborators -->
                    <span v-if="task.collaborators && task.collaborators.length > 0" class="meta-chip meta-chip--person">
                      <i class="bi bi-person-fill"></i>
                      {{ task.collaborators.slice(0, 2).map(c => getFirstAndLastName(c.name)).join(', ') }}
                      <span v-if="task.collaborators.length > 2" class="meta-extra">+{{ task.collaborators.length - 2 }}</span>
                    </span>

                    <!-- State -->
                    <span v-if="task.task_state" class="meta-chip meta-chip--state" :style="{ '--state-color': task.task_state.color }">
                      {{ task.task_state.title }}
                    </span>

                    <!-- Deadline -->
                    <span v-if="task.deadline" class="meta-chip" :class="isUrgentTask(task) ? 'meta-chip--urgent' : 'meta-chip--date'">
                      <i class="bi bi-calendar3"></i>
                      {{ formatDeadline(task.deadline) }}
                    </span>
                  </div>

                  <!-- Processes -->
                  <div v-if="task.processes && task.processes.length > 0" class="task-processes">
                    <span
                      v-for="process in task.processes"
                      :key="process.id"
                      class="process-chip"
                      :title="process.peoples?.map(p => p.name).join(', ') || 'Sem partes cadastradas'"
                    >
                      <i class="bi bi-folder2-open"></i>
                      {{ formatProcessBadge(process) }}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Completed Tasks -->
        <div v-if="completedTasks.length > 0" class="task-group">
          <div class="group-header">
            <div class="group-header-left">
              <div class="group-dot group-dot--done"></div>
              <span class="group-title">Concluídas</span>
            </div>
            <span class="group-count group-count--done">{{ completedTasks.length }}</span>
          </div>

          <div class="task-list">
            <div v-for="task in completedTasks" :key="task.id" class="task-card task-card--done">
              <div class="task-card-inner">
                <div class="task-check">
                  <label class="check-wrapper">
                    <input
                      type="checkbox"
                      :checked="task.completed"
                      @change="toggleCompleted(task)"
                    />
                    <span class="check-custom check-custom--done"></span>
                  </label>
                </div>

                <div class="task-body" @click="navigateToTask(task.id)">
                  <h6 class="task-name task-name--done">{{ task.title }}</h6>

                  <div class="task-meta-row" v-if="(task.collaborators && task.collaborators.length > 0) || (task.processes && task.processes.length > 0)">
                    <span v-if="task.collaborators && task.collaborators.length > 0" class="meta-chip meta-chip--muted">
                      <i class="bi bi-person-fill"></i>
                      {{ task.collaborators.map(c => getFirstAndLastName(c.name)).join(', ') }}
                    </span>
                    <span
                      v-for="process in task.processes"
                      :key="process.id"
                      class="meta-chip meta-chip--muted"
                      :title="process.peoples?.map(p => p.name).join(', ') || 'Sem partes cadastradas'"
                    >
                      {{ formatProcessBadge(process) }}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </Layout>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import Layout from '@/components/Layout.vue';
import DefaultHeader from '@/components/DefaultHeader.vue';
import { getTasks, toggleTaskCompleted, getTaskStates, getTeamUsers } from '@/api/tasks.js';
import Swal from 'sweetalert2';

const router = useRouter();

const tasks = ref([]);
const loading = ref(true);
const taskStates = ref([]);
const teamUsers = ref([]);
const filtersExpanded = ref(false);
const filters = ref({
  collaboratorId: '',
  taskStateId: '',
  searchTerm: ''
});

const activeFiltersCount = computed(() => {
  let count = 0;
  if (filters.value.searchTerm) count++;
  if (filters.value.collaboratorId) count++;
  if (filters.value.taskStateId) count++;
  return count;
});

const filteredTasks = computed(() => {
  let filtered = [...tasks.value];

  // Filter by search term
  if (filters.value.searchTerm) {
    const searchLower = filters.value.searchTerm.toLowerCase();
    filtered = filtered.filter(task =>
      task.title.toLowerCase().includes(searchLower) ||
      task.processes?.some(process =>
        process.process_num?.toLowerCase().includes(searchLower) ||
        process.peoples?.some(person => person.name?.toLowerCase().includes(searchLower))
      ) ||
      task.collaborators?.some(collaborator =>
        collaborator.name?.toLowerCase().includes(searchLower)
      )
    );
  }

  // Filter by collaborator
  if (filters.value.collaboratorId) {
    filtered = filtered.filter(task =>
      task.collaborators?.some(collaborator => collaborator.id == filters.value.collaboratorId)
    );
  }

  // Filter by task state
  if (filters.value.taskStateId) {
    filtered = filtered.filter(task => task.task_state_id == filters.value.taskStateId);
  }

  // Sort by completed status and creation date
  return filtered.sort((a, b) => {
    if (a.completed !== b.completed) {
      return a.completed - b.completed;
    }
    return new Date(b.created_at) - new Date(a.created_at);
  });
});

const fetchTasks = async () => {
  try {
    loading.value = true;
    tasks.value = await getTasks();
  } catch (error) {
    console.error('Erro ao buscar tarefas:', error);
  } finally {
    loading.value = false;
  }
};

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

const toggleFilters = () => {
  filtersExpanded.value = !filtersExpanded.value;
};

const clearFilters = () => {
  filters.value = {
    collaboratorId: '',
    taskStateId: '',
    searchTerm: ''
  };
};

const getFirstAndLastName = (fullName) => {
  if (!fullName) return '';
  const names = fullName.trim().split(' ').filter(name => name.length > 0);
  if (names.length <= 2) return fullName;
  return `${names[0]} ${names[names.length - 1]}`;
};

const formatProcessBadge = (process) => {
  if (!process.peoples || process.peoples.length === 0) {
    return process.process_num;
  }
  const firstPerson = process.peoples[0];
  const shortName = getFirstAndLastName(firstPerson.name);
  return `${process.process_num} - ${shortName}`;
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
  return filteredTasks.value.filter(task => !task.completed).sort((a, b) => {
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
  return filteredTasks.value.filter(task => task.completed);
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
  }
};

const navigateToTask = (taskId) => {
  router.push({ name: 'TaskDetail', params: { id: taskId } });
};

onMounted(() => {
  fetchTasks();
  fetchTaskStates();
  fetchTeamUsers();
});
</script>

<style scoped>
/* ── Design tokens ── */
.tasks-page {
  --tk-bg: #f5f6f8;
  --tk-surface: #ffffff;
  --tk-border: #e8eaed;
  --tk-border-light: #f1f3f5;
  --tk-text: #1a1d23;
  --tk-text-secondary: #5f6878;
  --tk-text-muted: #8b95a5;
  --tk-primary: #3b6fea;
  --tk-primary-soft: #eef3ff;
  --tk-success: #16a34a;
  --tk-success-soft: #ecfdf3;
  --tk-danger: #dc2626;
  --tk-danger-soft: #fef2f2;
  --tk-radius: 10px;
  --tk-radius-sm: 6px;
  --tk-shadow-sm: 0 1px 2px rgba(0,0,0,0.04);
  --tk-shadow: 0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04);
}

/* ── Stats Bar ── */
.stats-bar {
  background: #ffffff;
  border-bottom: 1px solid #e8eaed;
  padding: 10px 16px;
}

.stats-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.stat-chip {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  background: #eef3ff;
  border-radius: 20px;
  font-size: 12px;
  line-height: 1;
}

.stat-chip--success {
  background: #ecfdf3;
}

.stat-chip--success .stat-number {
  color: #16a34a;
}

.stat-chip--danger {
  background: #fef2f2;
}

.stat-chip--danger .stat-number {
  color: #dc2626;
}

.stat-number {
  font-weight: 700;
  color: #3b6fea;
  font-size: 13px;
}

.stat-label {
  color: #5f6878;
  font-weight: 500;
}

.add-task-btn {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 14px;
  background: #3b6fea;
  color: #fff;
  border: none;
  border-radius: 20px;
  font-size: 13px;
  font-weight: 600;
  text-decoration: none;
  transition: all 0.2s ease;
  white-space: nowrap;
}

.add-task-btn:hover {
  background: #2d5bd0;
  color: #fff;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(59, 111, 234, 0.3);
}

.add-task-btn i {
  font-size: 16px;
  font-weight: 700;
}

/* ── Page Container ── */
.tasks-page {
  padding: 12px 16px 20px;
  background: #ffffff;
  min-height: 100%;
}

/* ── Filters ── */
.filters-section {
  margin-bottom: 16px;
}

.filter-toggle {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  background: #ffffff;
  border: 1px solid #e8eaed;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 13px;
  color: #5f6878;
}

.filter-toggle:hover {
  border-color: #3b6fea;
  color: #3b6fea;
}

.filter-toggle-left {
  display: flex;
  align-items: center;
  gap: 6px;
}

.filter-toggle-left i {
  font-size: 14px;
}

.filter-count {
  background: #3b6fea;
  color: #fff;
  font-size: 10px;
  font-weight: 700;
  min-width: 18px;
  height: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 9px;
  padding: 0 5px;
}

.filter-chevron {
  font-size: 12px;
  transition: transform 0.25s ease;
}

.filters-body {
  max-height: 0;
  overflow: hidden;
  transition: max-height 0.3s ease, opacity 0.25s ease;
  opacity: 0;
}

.filters-body--open {
  max-height: 200px;
  opacity: 1;
}

.filters-inner {
  padding-top: 10px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.filter-field {
  width: 100%;
}

.filter-field--half {
  flex: 1;
  min-width: 0;
}

.filter-row {
  display: flex;
  gap: 8px;
}

.filter-input-wrap {
  position: relative;
}

.filter-input-icon {
  position: absolute;
  left: 10px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 13px;
  color: #8b95a5;
  pointer-events: none;
}

.filter-input {
  width: 100%;
  padding: 7px 10px 7px 32px;
  border: 1px solid #e8eaed;
  border-radius: 6px;
  font-size: 13px;
  color: #1a1d23;
  background: #ffffff;
  outline: none;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.filter-input:focus {
  border-color: #3b6fea;
  box-shadow: 0 0 0 3px rgba(59, 111, 234, 0.1);
}

.filter-input::placeholder {
  color: #8b95a5;
}

.filter-select {
  width: 100%;
  padding: 7px 10px;
  border: 1px solid #e8eaed;
  border-radius: 6px;
  font-size: 13px;
  color: #1a1d23;
  background: #ffffff;
  outline: none;
  cursor: pointer;
  transition: border-color 0.2s ease;
  appearance: auto;
}

.filter-select:focus {
  border-color: #3b6fea;
  box-shadow: 0 0 0 3px rgba(59, 111, 234, 0.1);
}

.clear-filters-btn {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  align-self: flex-start;
  padding: 4px 10px;
  background: none;
  border: none;
  color: #8b95a5;
  font-size: 12px;
  cursor: pointer;
  border-radius: 4px;
  transition: all 0.15s ease;
}

.clear-filters-btn:hover {
  color: #dc2626;
  background: #fef2f2;
}

.clear-filters-btn i {
  font-size: 14px;
}

/* ── States (Loading / Empty) ── */
.state-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px 24px;
  text-align: center;
}

.loading-ring {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border: 3px solid #e8eaed;
  border-top-color: #3b6fea;
  animation: spin 0.8s linear infinite;
  margin-bottom: 16px;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.empty-icon-wrap {
  width: 56px;
  height: 56px;
  border-radius: 16px;
  background: #eef3ff;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 16px;
}

.empty-icon-wrap i {
  font-size: 24px;
  color: #3b6fea;
}

.state-title {
  font-size: 15px;
  font-weight: 600;
  color: #1a1d23;
  margin: 0 0 6px;
}

.state-text {
  font-size: 13px;
  color: #8b95a5;
  margin: 0;
}

.empty-cta {
  margin-top: 16px;
  display: inline-flex;
  align-items: center;
  padding: 8px 18px;
  background: #3b6fea;
  color: #fff;
  border-radius: 20px;
  font-size: 13px;
  font-weight: 600;
  text-decoration: none;
  transition: all 0.2s ease;
}

.empty-cta:hover {
  background: #2d5bd0;
  color: #fff;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(59, 111, 234, 0.3);
}

/* ── Task Groups ── */
.task-sections {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.task-group {
  display: flex;
  flex-direction: column;
}

.group-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
  padding: 0 2px;
}

.group-header-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.group-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.group-dot--pending {
  background: #3b6fea;
  box-shadow: 0 0 0 3px rgba(59, 111, 234, 0.15);
}

.group-dot--done {
  background: #16a34a;
  box-shadow: 0 0 0 3px rgba(22, 163, 74, 0.15);
}

.group-title {
  font-size: 13px;
  font-weight: 700;
  color: #1a1d23;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.group-count {
  font-size: 12px;
  font-weight: 700;
  color: #3b6fea;
  background: #eef3ff;
  padding: 2px 8px;
  border-radius: 10px;
}

.group-count--done {
  color: #16a34a;
  background: #ecfdf3;
}

/* ── Task List ── */
.task-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

/* ── Task Card ── */
.task-card {
  background: #ffffff;
  border: 1px solid #e8eaed;
  border-radius: 10px;
  transition: all 0.2s ease;
  overflow: hidden;
  box-shadow: 0 1px 2px rgba(0,0,0,0.04);
}

.task-card:hover {
  border-color: #d0d5dd;
  box-shadow: 0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04);
}

.task-card--urgent {
  background: #ffffff;
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
  padding: 10px 12px;
  gap: 10px;
}

/* ── Checkbox ── */
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
  border-color: #3b6fea;
  background: #eef3ff;
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

/* ── Task Body ── */
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
  align-items: flex-start;
  justify-content: space-between;
  gap: 8px;
}

.task-name {
  font-size: 13.5px;
  font-weight: 600;
  color: #1a1d23;
  margin: 0;
  line-height: 1.35;
  word-break: break-word;
}

.task-name--done {
  text-decoration: line-through;
  color: #8b95a5;
  font-weight: 500;
}

.urgent-dot {
  color: #dc2626;
  font-size: 12px;
  margin-right: 3px;
}

/* ── Meta Chips ── */
.task-meta-row {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
  align-items: center;
}

.meta-chip {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  font-size: 11px;
  font-weight: 500;
  padding: 2px 7px;
  border-radius: 4px;
  white-space: nowrap;
  line-height: 1.4;
}

.meta-chip i {
  font-size: 10px;
}

.meta-chip--person {
  color: #6d28d9;
  background: #f5f3ff;
}

.meta-chip--state {
  color: #fff;
  background: var(--state-color, #6b7280);
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.3px;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 4px;
}

.meta-chip--date {
  color: #5f6878;
  background: #f1f3f5;
}

.meta-chip--urgent {
  color: #dc2626;
  background: #fef2f2;
  font-weight: 600;
}

.meta-chip--muted {
  color: #8b95a5;
  background: transparent;
  padding: 0;
}

.meta-extra {
  font-size: 10px;
  opacity: 0.7;
}

/* ── Process Chips ── */
.task-processes {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-top: 2px;
}

.process-chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  font-weight: 500;
  color: #1d6fb5;
  background: #e9f3fd;
  padding: 3px 8px;
  border-radius: 4px;
  white-space: nowrap;
}

.process-chip i {
  font-size: 10px;
  opacity: 0.7;
}

/* ── Animations ── */
@keyframes taskEnter {
  from {
    opacity: 0;
    transform: translateY(6px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.task-card {
  animation: taskEnter 0.25s ease both;
}

.task-card:nth-child(1) { animation-delay: 0.02s; }
.task-card:nth-child(2) { animation-delay: 0.04s; }
.task-card:nth-child(3) { animation-delay: 0.06s; }
.task-card:nth-child(4) { animation-delay: 0.08s; }
.task-card:nth-child(5) { animation-delay: 0.10s; }
.task-card:nth-child(n+6) { animation-delay: 0.12s; }

/* ── Responsive ── */
@media (max-width: 400px) {
  .stats-bar {
    padding: 8px 12px;
  }

  .stat-chip {
    padding: 3px 8px;
    font-size: 11px;
  }

  .tasks-page {
    padding: 10px 12px 16px;
  }

  .task-card-inner {
    padding: 8px 10px;
  }

  .task-name {
    font-size: 13px;
  }

  .filter-row {
    flex-direction: column;
  }
}
</style>
