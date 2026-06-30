import api from './axios';

// Finanças de um cliente (lista ordenada por vencimento + resumo por situação).
export function getPersonFinances(personId) {
  return api.get(`/person/${personId}/finances`).then((response) => response.data);
}

// Cria um pagamento para o cliente. `data` = { description, amount, date, type,
// wallet_id, installments }. Com installments > 1, o backend cria N parcelas.
export function addPersonFinance(personId, data) {
  return api.post(`/person/${personId}/finances`, data).then((response) => response.data);
}

// Marca/desmarca um lançamento como pago.
export function setFinancePaid(id, paid) {
  return api.patch(`/finances/${id}/paid`, { paid }).then((response) => response.data);
}

// Atualiza campos (vencimento/valor/descrição/carteira) de um lançamento.
export function updateFinance(id, data) {
  return api.put(`/finances/${id}`, data).then((response) => response.data);
}

export function deleteFinance(id) {
  return api.delete(`/finances/${id}`).then((response) => response.data);
}

// Carteiras do time (seletor ao criar/editar um pagamento).
export function getWallets() {
  return api.get('/finances/wallets').then((response) => response.data);
}

// Visão geral de finanças do time por mês/ano (página geral da extensão).
export function getFinances({ month, year } = {}) {
  return api.get('/finances', { params: { month, year } }).then((response) => response.data);
}

// Cria um pagamento avulso na visão geral. `data` = { description, amount, date,
// type, wallet_id, installments, pessoa_id? } — pessoa_id é opcional ("sem cliente").
export function addFinance(data) {
  return api.post('/finances', data).then((response) => response.data);
}
