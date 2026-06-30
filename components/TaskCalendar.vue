<template>
  <div class="task-calendar">
    <div class="calendar-head">
      <button type="button" class="calendar-nav" aria-label="Mês anterior" @click="goToPreviousMonth">
        <i class="bi bi-chevron-left"></i>
      </button>
      <strong class="calendar-title">{{ monthTitle }}</strong>
      <button type="button" class="calendar-nav" aria-label="Próximo mês" @click="goToNextMonth">
        <i class="bi bi-chevron-right"></i>
      </button>
    </div>

    <p v-if="isLoading" class="calendar-loading">Carregando tarefas...</p>

    <template v-else>
      <div class="calendar-weekdays">
        <span v-for="weekday in weekdays" :key="weekday">{{ weekday }}</span>
      </div>

      <div class="calendar-grid">
        <button
          v-for="day in calendarDays"
          :key="day.key"
          type="button"
          class="calendar-day"
          :class="{
            'is-empty': !day.dateKey,
            'is-today': day.isToday,
            'is-selected': day.dateKey === selectedDateKey,
            'has-tasks': day.tasks.length > 0,
            'all-completed': day.tasks.length > 0 && day.allCompleted,
          }"
          :disabled="!day.dateKey"
          @click="selectDay(day)"
        >
          <span v-if="day.dateKey" class="calendar-day__label">{{ day.day }}</span>
          <span v-if="day.tasks.length" class="calendar-day__dot"></span>
        </button>
      </div>

      <div class="selected-tasks">
        <div class="selected-tasks__head">
          <strong>{{ selectedDateLabel }}</strong>
          <span>{{ selectedTasks.length ? 'Clique para abrir' : 'Sem tarefas' }}</span>
        </div>

        <div v-if="selectedTasks.length" class="task-day-list">
          <button
            v-for="task in selectedTasks"
            :key="task.id"
            type="button"
            class="task-row"
            :class="{ 'is-completed': isCompleted(task) }"
            @click="openTask(task)"
          >
            <span class="task-row__mark">
              <i :class="isCompleted(task) ? 'bi bi-check2' : 'bi bi-circle'"></i>
            </span>
            <span class="task-row__content">
              <span class="task-row__title">{{ task.title }}</span>
              <span class="task-row__meta">
                <span v-if="taskTimeLabel(task)"><i class="bi bi-clock"></i>{{ taskTimeLabel(task) }}</span>
                <span>{{ task.extendedProps?.taskState || 'Sem estado' }}</span>
              </span>
            </span>
            <i class="bi bi-chevron-right task-row__chev"></i>
          </button>
        </div>

        <p v-else class="calendar-empty">Nenhuma tarefa nesta data.</p>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import api from '@/api/axios'
import { useRouter } from 'vue-router'

const router = useRouter()
const today = new Date()
const events = ref([])
const isLoading = ref(false)
const visibleYear = ref(today.getFullYear())
const visibleMonth = ref(today.getMonth())
const selectedDateKey = ref(formatDateKey(today))
const weekdays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

const monthTitle = computed(() => {
  const label = new Date(visibleYear.value, visibleMonth.value, 1).toLocaleDateString('pt-BR', {
    month: 'long',
    year: 'numeric',
  })

  return label.charAt(0).toUpperCase() + label.slice(1)
})

const eventsByDate = computed(() => {
  const groups = {}

  events.value.forEach((task) => {
    const dateKey = taskDateKey(task)
    if (!dateKey) return
    if (!groups[dateKey]) groups[dateKey] = []
    groups[dateKey].push(task)
  })

  Object.values(groups).forEach((tasks) => {
    tasks.sort((a, b) => String(a.start || '').localeCompare(String(b.start || '')))
  })

  return groups
})

const calendarDays = computed(() => {
  const firstDay = new Date(visibleYear.value, visibleMonth.value, 1)
  const daysInMonth = new Date(visibleYear.value, visibleMonth.value + 1, 0).getDate()
  const cells = []

  for (let index = 0; index < firstDay.getDay(); index += 1) {
    cells.push({ key: `blank-start-${index}`, dateKey: null, tasks: [] })
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    const dateKey = formatDateKey(new Date(visibleYear.value, visibleMonth.value, day))
    const tasks = eventsByDate.value[dateKey] || []

    cells.push({
      key: dateKey,
      dateKey,
      day,
      tasks,
      isToday: dateKey === formatDateKey(today),
      allCompleted: tasks.every((task) => isCompleted(task)),
    })
  }

  while (cells.length % 7 !== 0) {
    cells.push({ key: `blank-end-${cells.length}`, dateKey: null, tasks: [] })
  }

  return cells
})

const selectedTasks = computed(() => eventsByDate.value[selectedDateKey.value] || [])

const selectedDateLabel = computed(() => {
  const date = parseDateKey(selectedDateKey.value)
  const label = date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })

  return label
})

async function fetchTasks() {
  try {
    isLoading.value = true
    const response = await api.get('/tasks/calendar')
    events.value = Array.isArray(response.data) ? response.data : []
    ensureSelectedDate()
  } catch (error) {
    console.error('Erro ao buscar tarefas para o calendário:', error)
    if (error.response?.status === 401) {
      console.warn('Usuário não autenticado para buscar tarefas')
    }
  } finally {
    isLoading.value = false
  }
}

function goToPreviousMonth() {
  setVisibleMonth(-1)
}

function goToNextMonth() {
  setVisibleMonth(1)
}

function setVisibleMonth(offset) {
  const nextMonth = new Date(visibleYear.value, visibleMonth.value + offset, 1)
  visibleYear.value = nextMonth.getFullYear()
  visibleMonth.value = nextMonth.getMonth()
  selectedDateKey.value = defaultDateForVisibleMonth()
}

function selectDay(day) {
  if (!day.dateKey) return
  selectedDateKey.value = day.dateKey
}

function openTask(task) {
  router.push(`/tasks/${task.id}`)
}

function ensureSelectedDate() {
  if (isDateInVisibleMonth(selectedDateKey.value)) return
  selectedDateKey.value = defaultDateForVisibleMonth()
}

function defaultDateForVisibleMonth() {
  const currentMonthKey = formatMonthKey(new Date(visibleYear.value, visibleMonth.value, 1))
  const firstTask = events.value
    .map((task) => taskDateKey(task))
    .filter((dateKey) => dateKey && dateKey.startsWith(currentMonthKey))
    .sort()[0]

  return firstTask || formatDateKey(new Date(visibleYear.value, visibleMonth.value, 1))
}

function isDateInVisibleMonth(dateKey) {
  return dateKey?.startsWith(formatMonthKey(new Date(visibleYear.value, visibleMonth.value, 1)))
}

function taskDateKey(task) {
  return normalizeDateKey(task?.start || task?.deadline)
}

function normalizeDateKey(value) {
  if (!value) return ''

  if (typeof value === 'string') {
    const match = value.match(/^(\d{4})-(\d{2})-(\d{2})/)
    if (match) return `${match[1]}-${match[2]}-${match[3]}`
  }

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''

  return formatDateKey(date)
}

function formatDateKey(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

function formatMonthKey(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')

  return `${year}-${month}`
}

function parseDateKey(dateKey) {
  const [year, month, day] = dateKey.split('-').map(Number)
  return new Date(year, month - 1, day)
}

function isCompleted(task) {
  return !!task?.extendedProps?.completed
}

function taskTimeLabel(task) {
  const value = task?.start || task?.deadline
  if (!value) return ''

  if (typeof value === 'string') {
    const match = value.match(/[T\s](\d{2}):(\d{2})/)
    if (match && `${match[1]}:${match[2]}` !== '00:00') return `${match[1]}:${match[2]}`
  }

  const date = new Date(value)
  if (Number.isNaN(date.getTime()) || (date.getHours() === 0 && date.getMinutes() === 0)) return ''

  return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

onMounted(() => {
  fetchTasks()
})

defineExpose({
  fetchTasks,
})
</script>

<style scoped>
.task-calendar {
  width: 100%;
}

.calendar-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 10px;
}

.calendar-title {
  color: var(--ad-ink, #1a2233);
  font-size: 14px;
  font-weight: 700;
}

.calendar-nav {
  width: 28px;
  height: 28px;
  border: 0;
  border-radius: 999px;
  background: transparent;
  color: var(--ad-muted, #8b93a3);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: background-color 0.15s ease, color 0.15s ease;
}

.calendar-nav:hover {
  background: #eef1f7;
  color: var(--ad-navy, #16223f);
}

.calendar-loading,
.calendar-empty {
  margin: 10px 0 0;
  color: var(--ad-muted, #8b93a3);
  font-size: 13px;
}

.calendar-weekdays,
.calendar-grid {
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
}

.calendar-weekdays {
  margin-bottom: 4px;
  color: var(--ad-muted, #8b93a3);
  font-size: 10.5px;
  font-weight: 700;
  text-align: center;
}

.calendar-grid {
  gap: 4px;
}

.calendar-day {
  min-height: 42px;
  padding: 4px 2px;
  border: 0;
  border-radius: 12px;
  background: transparent;
  color: var(--ad-ink, #1a2233);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 3px;
  font-size: 11.5px;
  transition: background-color 0.15s ease, box-shadow 0.15s ease;
}

.calendar-day:not(.is-empty):hover {
  background: #f7f8fa;
}

.calendar-day.is-empty {
  cursor: default;
}

.calendar-day.is-selected {
  background: #eef1f7;
  box-shadow: inset 0 0 0 1px var(--ad-navy, #16223f);
}

.calendar-day.is-today .calendar-day__label {
  min-width: 22px;
  min-height: 22px;
  padding: 0 6px;
  border-radius: 999px;
  background: var(--ad-navy, #16223f);
  color: #fff;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.calendar-day__dot {
  width: 5px;
  height: 5px;
  border-radius: 999px;
  background: #f5b82e;
}

.calendar-day.all-completed .calendar-day__dot {
  background: #198754;
}

.selected-tasks {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid var(--ad-line, #e6e8ee);
}

.selected-tasks__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 8px;
}

.selected-tasks__head strong {
  color: var(--ad-ink, #1a2233);
  font-size: 13px;
  font-weight: 700;
}

.selected-tasks__head span {
  color: var(--ad-muted, #8b93a3);
  font-size: 11px;
  white-space: nowrap;
}

.task-day-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.task-row {
  width: 100%;
  padding: 8px 10px;
  border: 1px solid var(--ad-line, #e6e8ee);
  border-radius: 12px;
  background: #fff;
  color: inherit;
  display: flex;
  align-items: center;
  gap: 9px;
  text-align: left;
  transition: border-color 0.15s ease, background-color 0.15s ease;
}

.task-row:hover {
  border-color: #cfd5e2;
  background: #f9fafc;
}

.task-row__mark {
  width: 22px;
  height: 22px;
  border-radius: 999px;
  background: #eef1f7;
  color: var(--ad-navy, #16223f);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  font-size: 12px;
}

.task-row.is-completed .task-row__mark {
  background: #e8f5ee;
  color: #198754;
}

.task-row__content {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.task-row__title {
  color: var(--ad-ink, #1a2233);
  font-size: 12.5px;
  font-weight: 700;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.task-row.is-completed .task-row__title {
  color: #587064;
}

.task-row__meta {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--ad-muted, #8b93a3);
  font-size: 11px;
}

.task-row__meta span {
  display: inline-flex;
  align-items: center;
  gap: 3px;
}

.task-row__chev {
  color: var(--ad-muted, #8b93a3);
  font-size: 12px;
}
</style>
