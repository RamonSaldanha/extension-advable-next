import api from './axios';

export function getTasks() {
  return api.get('/tasks').then((response) => response.data);
}

export function getTaskStates() {
  return api.get('/task-states').then((response) => response.data);
}

export function addTask(task) {
  return api.post('/tasks', task).then((response) => response.data);
}

export function toggleTaskCompleted(id, completed) {
  return api.post('/toggle-completed-task', { id, completed }).then((response) => response.data);
}

export function searchProcesses(searchTerm) {
  return api.get('/tasks/search-processes', { params: { search: searchTerm } }).then((response) => response.data);
}

export function getTeamUsers() {
  return api.get('/tasks/team-users').then((response) => response.data);
}

export function getTaskDetails(taskId) {
  return api.get(`/tasks/${taskId}`).then((response) => response.data);
}

export function updateTask(taskId, taskData) {
  return api.put(`/tasks/${taskId}`, taskData).then((response) => response.data);
}

export function getTasksByProcess(processId) {
  return api.get(`/tasks/process/${processId}`).then((response) => response.data);
}

export function createTasksFromExpedientes(taskStateId, expedientes) {
  return api
    .post('/expedientes/create-tasks', { task_state_id: taskStateId, expedientes })
    .then((response) => response.data);
}
