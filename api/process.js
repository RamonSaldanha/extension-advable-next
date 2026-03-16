import api from './axios';

export function getJurisdictions(searchTerm) {
  if (searchTerm) {
    return api.get(`/jurisdictions?search=${encodeURIComponent(searchTerm)}`).then((response) => response.data);
  }
  return api.get('/jurisdictions').then((response) => response.data);
}

export function updateProcessJurisdiction(processId, jurisdictionId) {
  return api.patch(`/processes/${processId}/jurisdiction`, { jurisdiction_id: jurisdictionId }).then((response) => response.data);
}

export function markAllMovementsAsRead(processId) {
  return api.patch(`/processes/${processId}/movements/read-all`).then((response) => response.data);
}

export function updateProcessField(processId, field, value) {
  return api
    .patch(`/processes/${processId}/update-field`, { field, value })
    .then((response) => response.data);
}

export function attachPersonToProcess(processId, personId, polo = 'Ativo') {
  return api
    .post(`/processes/${processId}/peoples/${personId}`, { polo })
    .then((response) => response.data);
}

export function searchProcesses(searchTerm) {
  return api
    .get('/processes/search', { params: { search: searchTerm } })
    .then((response) => response.data);
}

export function getProcessById(id) {
  return api
    .get(`/processes/${id}`)
    .then((response) => response.data);
}

export function detachPersonFromProcess(processId, personId) {
  return api
    .delete(`/processes/${processId}/peoples/${personId}`)
    .then((response) => response.data);
}

export function getProcess(processNum, systemUrl) {
  return api
    .post('/consult-unique-process/', { processNum, systemUrl })
    .then((response) => response.data);
}

export function addProcess(data, endpoint = '/create-process') {
  return api
    .post(endpoint, data)
    .then((response) => response.data);
}

export function addProcessTrabalho(data, endpoint = '/create-process-trt') {
  return api
    .post(endpoint, data)
    .then((response) => response.data);
}

export function getCourts() {
  return api
    .get('/courts')
    .then((response) => response.data);
}

export function toggleProcessPush(processId) {
  return api
    .put(`/toggle-push/${processId}`)
    .then((response) => response.data);
}

export function updateProcessCourt(processId, courtId) {
  return api
    .put(`/processes/${processId}/court`, { court_id: courtId })
    .then((response) => response.data);
}

export function updateProcessCourtSystem(processId, systemId) {
  return api
    .put(`/processes/${processId}/court-system`, { court_system_id: systemId })
    .then((response) => response.data);
}

export function checkExistingProcesses(processNumbers) {
  return api
    .post('/processes/check-existing', { process_numbers: processNumbers })
    .then((response) => response.data);
}
