import api from './axios';

export function getPerson(searchTerm) {
  return api.get('/people-search-by-phone', { params: { phone: searchTerm } }).then((response) => response.data);
}

export function addPeople(data) {
  return api.post('/add-person', data).then((response) => response.data);
}

export function getAllStates() {
  return api.get('/crm/get-all-states').then((response) => response.data);
}

export function addCase(data) {
  return api.post('/crm/add-case', data).then((response) => response.data);
}

export function getPersonById(id) {
  return api.get(`/person/${id}`).then((response) => response.data);
}

export function updateApiPerson(id, data) {
  return api.put(`/person/${id}`, data).then((response) => response.data);
}

export function getCaseByUuid(id) {
  return api.get(`/case/${id}`).then((response) => response.data);
}

export function updateCase(id, data) {
  return api.put(`/case/${id}`, data).then((response) => response.data);
}

export function deleteCaseByUuid(uuid) {
  return api.delete(`/case/${uuid}`).then((response) => response.data);
}
