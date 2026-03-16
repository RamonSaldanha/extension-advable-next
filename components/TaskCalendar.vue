<template>
  <div class="task-calendar">
    <FullCalendar
      ref="calendar"
      :options="calendarOptions"
    />
    
    <!-- Dropdown Modal para detalhes da tarefa -->
    <div 
      v-if="selectedTask" 
      class="task-dropdown dropdown-menu show position-absolute"
      :style="dropdownStyle"
    >
      <div class="dropdown-header">
        <strong>{{ selectedTask.title }}</strong>
        <button 
          type="button" 
          class="btn-close btn-close-sm ms-auto" 
          @click="closeDropdown"
        ></button>
      </div>
      <div class="dropdown-body p-2">
        <div class="mb-2">
          <small class="text-muted">Estado:</small>
          <span class="badge bg-secondary ms-1 small">{{ selectedTask.extendedProps.taskState }}</span>
        </div>
        <div class="mb-2">
          <small class="text-muted">Status:</small>
          <span :class="selectedTask.extendedProps.completed ? 'badge bg-success ms-1 small' : 'badge bg-warning ms-1 small'">
            {{ selectedTask.extendedProps.completed ? 'Concluída' : 'Pendente' }}
          </span>
        </div>
        <div v-if="selectedTask.extendedProps.collaborators.length > 0" class="mb-2">
          <small class="text-muted">Colaboradores:</small>
          <p class="mb-0 small">{{ selectedTask.extendedProps.collaborators.join(', ') }}</p>
        </div>
        <div class="mb-2">
          <small class="text-muted">
            {{ hasTime(selectedTask.start) ? 'Data e Horário:' : 'Data:' }}
          </small>
          <p class="mb-0 small">
            <i v-if="hasTime(selectedTask.start)" class="bi bi-clock me-1"></i>
            {{ formatDate(selectedTask.start) }}
          </p>
        </div>
      </div>
      <div class="dropdown-footer">
        <button class="btn btn-primary btn-sm" @click="openTaskDetail">
          <i class="bi bi-arrow-up-right-square"></i> Abrir Tarefa
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, nextTick } from 'vue'
import FullCalendar from '@fullcalendar/vue3'
import dayGridPlugin from '@fullcalendar/daygrid'
import bootstrap5Plugin from '@fullcalendar/bootstrap5'
import interactionPlugin from '@fullcalendar/interaction'
import api from '@/api/axios'
import { useRouter } from 'vue-router'

const router = useRouter()
const calendar = ref(null)
const events = ref([])
const isLoading = ref(false)
const selectedTask = ref(null)
const dropdownPosition = ref({ x: 0, y: 0 })

const calendarOptions = computed(() => ({
  plugins: [dayGridPlugin, bootstrap5Plugin, interactionPlugin],
  initialView: 'dayGridMonth',
  themeSystem: 'bootstrap5',
  height: 'auto',
  locale: 'pt-br',
  headerToolbar: {
    left: 'prev,next',
    center: 'title',
    right: 'today'
  },
  titleFormat: { 
    month: 'long', 
    year: 'numeric' 
  },
  buttonText: {
    today: 'Hoje'
  },
  events: events.value,
  eventClick: handleEventClick,
  eventDidMount: handleEventDidMount,
  dateClick: handleDateClick,
  dayMaxEvents: 2,
  moreLinkClick: 'popover',
  eventDisplay: 'block',
  displayEventTime: true,
  dayHeaderFormat: { weekday: 'short' },
  aspectRatio: 1.2
}))

const fetchTasks = async () => {
  try {
    isLoading.value = true
    const response = await api.get('/tasks/calendar')
    events.value = response.data
    
    // Força a atualização do calendário
    if (calendar.value) {
      calendar.value.getApi().removeAllEvents()
      calendar.value.getApi().addEventSource(events.value)
    }
  } catch (error) {
    console.error('Erro ao buscar tarefas para o calendário:', error)
    if (error.response?.status === 401) {
      console.warn('Usuário não autenticado para buscar tarefas')
    }
  } finally {
    isLoading.value = false
  }
}

const dropdownStyle = computed(() => ({
  left: `${dropdownPosition.value.x}px`,
  top: `${dropdownPosition.value.y}px`,
  zIndex: 1050,
  minWidth: '280px',
  maxWidth: '320px'
}))

const handleEventClick = (clickInfo) => {
  const event = clickInfo.event
  const jsEvent = clickInfo.jsEvent
  
  // Calcular posição do dropdown
  const rect = clickInfo.el.getBoundingClientRect()
  const containerRect = calendar.value.$el.getBoundingClientRect()
  
  dropdownPosition.value = {
    x: rect.left - containerRect.left + rect.width / 2 - 140,
    y: rect.bottom - containerRect.top + 5
  }
  
  selectedTask.value = event
  
  // Prevenir o comportamento padrão
  jsEvent.preventDefault()
  jsEvent.stopPropagation()
}

const handleEventDidMount = (info) => {
  // Adiciona tooltip simples
  const event = info.event
  const extendedProps = event.extendedProps
  
  info.el.setAttribute('title', 
    `${event.title} - ${extendedProps.taskState}`
  )
  
  // Adiciona cursor pointer
  info.el.style.cursor = 'pointer'
}

const closeDropdown = () => {
  selectedTask.value = null
}

const hasTime = (date) => {
  const dateObj = new Date(date)
  return dateObj.getHours() !== 0 || dateObj.getMinutes() !== 0
}

const formatDate = (date) => {
  const dateObj = new Date(date)
  
  // Verificar se a data tem horário específico (não é meia-noite)
  const hasTimeValue = hasTime(date)
  
  const options = {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }
  
  let formatted = dateObj.toLocaleDateString('pt-BR', options)
  
  // Adicionar horário se não for meia-noite
  if (hasTimeValue) {
    const timeFormatted = dateObj.toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit'
    })
    formatted += ` às ${timeFormatted}`
  }
  
  return formatted
}

const openTaskDetail = () => {
  if (selectedTask.value) {
    // Navegar para a página de detalhes da tarefa
    router.push(`/tasks/${selectedTask.value.id}`)
    closeDropdown()
  }
}

const handleDateClick = (dateClickInfo) => {
  // Fechar dropdown se estiver aberto
  if (selectedTask.value) {
    closeDropdown()
  }
  
  // Obter a data clicada
  const selectedDate = dateClickInfo.date
  console.log('Data clicada no calendário:', selectedDate)
  
  // Criar data de hoje apenas com ano, mês e dia (ignorar horário completamente)
  const today = new Date()
  const todayDateOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  const selectedDateOnly = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate())
  
  console.log('Comparação de datas:', {
    today: todayDateOnly,
    selected: selectedDateOnly,
    isValidDate: selectedDateOnly >= todayDateOnly
  })
  
  // Verificar se não é uma data passada (permitir hoje e futuro)
  if (selectedDateOnly < todayDateOnly) {
    console.warn('Data no passado clicada, ignorando:', selectedDate)
    return
  }
  
  // Formatar a data para ISO string (YYYY-MM-DD) 
  const dateString = selectedDate.toISOString().split('T')[0]
  console.log('Data formatada para navegação:', dateString)
  
  // Navegar para AddTask com a data pré-selecionada como query parameter
  router.push({
    path: '/tasks/add',
    query: { date: dateString }
  })
}

onMounted(() => {
  fetchTasks()
  
  // Adicionar listener para fechar dropdown ao clicar fora
  document.addEventListener('click', (event) => {
    if (selectedTask.value && !event.target.closest('.task-dropdown')) {
      closeDropdown()
    }
  })
})

defineExpose({
  fetchTasks,
  closeDropdown
})
</script>

<style scoped>
.task-calendar {
  position: relative;
  width: 100%;
}

/* Estilos do Calendário */
:deep(.fc-theme-bootstrap5) {
  --fc-border-color: #dee2e6;
  --fc-button-bg-color: #6c757d;
  --fc-button-border-color: #6c757d;
  --fc-button-hover-bg-color: #5c636a;
  --fc-button-hover-border-color: #565e64;
  --fc-today-bg-color: rgba(13, 110, 253, 0.1);
}

/* Header do calendário mais compacto */
:deep(.fc-header-toolbar) {
  margin-bottom: 0.5rem !important;
}

:deep(.fc-toolbar-title) {
  font-size: 1rem !important;
  font-weight: 600 !important;
  color: #495057;
  text-transform: capitalize;
}

:deep(.fc-button) {
  padding: 0.25rem 0.5rem !important;
  font-size: 0.75rem !important;
  line-height: 1.2 !important;
}

/* Cabeçalhos dos dias da semana */
:deep(.fc-col-header-cell) {
  background-color: #f8f9fa;
  font-weight: 600;
  font-size: 0.7rem;
  padding: 0.25rem !important;
  text-transform: uppercase;
}

/* Células dos dias */
:deep(.fc-daygrid-day) {
  min-height: 32px !important;
}

:deep(.fc-daygrid-day-number) {
  font-size: 0.8rem;
  padding: 2px 4px;
}

/* Eventos do calendário */
:deep(.fc-event-completed) {
  background-color: #198754 !important;
  border-color: #157347 !important;
  color: white !important;
}

:deep(.fc-event-overdue) {
  background-color: #dc3545 !important;
  border-color: #b02a37 !important;
  color: white !important;
}

:deep(.fc-event-warning) {
  background-color: #fd7e14 !important;
  border-color: #e67d22 !important;
  color: white !important;
}

:deep(.fc-event-success) {
  background-color: #0d6efd !important;
  border-color: #0a58ca !important;
  color: white !important;
}

:deep(.fc-daygrid-event) {
  cursor: pointer !important;
  font-size: 0.65rem !important;
  border-radius: 3px !important;
  margin: 1px 2px !important;
  padding: 1px 4px !important;
  font-weight: 500 !important;
}

:deep(.fc-daygrid-event-harness) {
  margin-top: 1px !important;
  margin-bottom: 1px !important;
}

:deep(.fc-event-title) {
  font-weight: 500 !important;
}

/* Remove margin-bottom indesejado */
:deep(.fc .fc-daygrid-body-natural .fc-daygrid-day-events) {
  margin-bottom: 0 !important;
}

/* Cursor pointer e hover nos dias do calendário */
:deep(.fc-daygrid-day-frame) {
  cursor: pointer !important;
  transition: background-color 0.2s ease !important;
}

:deep(.fc-daygrid-day-frame:hover) {
  background-color: rgba(13, 110, 253, 0.1) !important;
}

:deep(.fc-daygrid-day-top) {
  cursor: pointer !important;
}

:deep(.fc-daygrid-day) {
  position: relative;
}

:deep(.fc-daygrid-day:not(.fc-day-past):not(.fc-day-disabled)) {
  cursor: pointer !important;
}

/* Aparência diferenciada para datas passadas */
:deep(.fc-daygrid-day.fc-day-past) {
  opacity: 0.5;
  background-color: rgba(108, 117, 125, 0.05);
}

:deep(.fc-daygrid-day.fc-day-past .fc-daygrid-day-number) {
  color: #6c757d !important;
}

/* Datas passadas não têm cursor pointer */
:deep(.fc-daygrid-day.fc-day-past) {
  cursor: default !important;
}

/* Adicionar ícone de "+" apenas em datas válidas (hoje + futuro) */
:deep(.fc-daygrid-day:not(.fc-day-disabled):not(.fc-day-past):hover .fc-daygrid-day-top::after) {
  content: '+ Nova';
  position: absolute;
  bottom: 2px;
  right: 2px;
  color: rgba(13, 110, 253, 0.8);
  font-size: 0.6rem;
  font-weight: 600;
  background: rgba(255, 255, 255, 0.9);
  padding: 2px 4px;
  border-radius: 3px;
  pointer-events: none;
  white-space: nowrap;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
  z-index: 10;
}

/* Hover só em datas válidas (hoje + futuro) */
:deep(.fc-daygrid-day:not(.fc-day-disabled):not(.fc-day-past):hover) {
  background-color: rgba(13, 110, 253, 0.05) !important;
}

/* Ocultar hover em dias desabilitados e passados */
:deep(.fc-daygrid-day.fc-day-disabled:hover .fc-daygrid-day-top::after),
:deep(.fc-daygrid-day.fc-day-past:hover .fc-daygrid-day-top::after) {
  display: none !important;
}

/* Dropdown da tarefa */
.task-dropdown {
  border: 1px solid #dee2e6;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  background: white;
  padding: 0;
  margin: 0;
  max-height: 400px;
  overflow-y: auto;
}

.dropdown-header {
  display: flex;
  align-items: center;
  padding: 0.75rem;
  background-color: #f8f9fa;
  border-bottom: 1px solid #dee2e6;
  border-radius: 8px 8px 0 0;
}

.dropdown-header strong {
  font-size: 0.9rem;
  color: #495057;
  flex: 1;
}

.btn-close-sm {
  width: 0.75rem;
  height: 0.75rem;
}

.dropdown-body {
  font-size: 0.8rem;
}

.dropdown-body .text-muted {
  font-size: 0.7rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.dropdown-body p {
  font-size: 0.8rem;
  line-height: 1.3;
}

.dropdown-body .badge {
  font-size: 0.65rem;
}

.dropdown-footer {
  padding: 0.75rem;
  background-color: #f8f9fa;
  border-top: 1px solid #dee2e6;
  border-radius: 0 0 8px 8px;
  text-align: center;
}

.dropdown-footer .btn {
  font-size: 0.75rem;
  padding: 0.375rem 0.75rem;
  font-weight: 600;
}

/* Responsividade */
@media (max-width: 576px) {
  .task-dropdown {
    min-width: 250px !important;
    max-width: 280px !important;
  }
  
  :deep(.fc-toolbar-title) {
    font-size: 0.9rem !important;
  }
  
  :deep(.fc-button) {
    padding: 0.2rem 0.4rem !important;
    font-size: 0.7rem !important;
  }
}
</style>