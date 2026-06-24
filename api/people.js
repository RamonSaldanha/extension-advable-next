import api from './axios';

// Busca a pessoa por telefone (E.164 canônico, tolerante ao 9º dígito) e/ou pelo
// id estável do chat (@lid/@c.us) usado em vínculos manuais.
export function getPerson({ phone, chatId } = {}) {
  return api
    .get('/people-search-by-phone', { params: { phone, chat_id: chatId } })
    .then((response) => response.data);
}

// Vincula um chat do WhatsApp a uma pessoa já cadastrada.
export function linkChat(personId, payload) {
  return api.post(`/person/${personId}/link-chat`, payload).then((response) => response.data);
}

// Lista/busca pessoas por nome (para vínculo manual e página de clientes).
export function searchPeople(name) {
  return api.post('/person-search', { name }).then((response) => response.data);
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

// Anotação (única) de uma pessoa. Retorna a nota mais recente (ou null).
export function getPersonNote(id) {
  return api.get(`/person/${id}/note`).then((response) => response.data);
}

// Cria/atualiza a anotação da pessoa. `data` = { content } (HTML do Quill).
export function savePersonNote(id, data) {
  return api.put(`/person/${id}/note`, data).then((response) => response.data);
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
