// Helpers compartilhados das telas de finanças (PersonFinance.vue / Finance.vue).

// Valor em moeda brasileira (mesmo formato do app web).
export function formatBRL(value) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(Number(value || 0));
}

// Config da máscara monetária (diretiva v-money). Mesmo padrão usado em EditCase.vue.
export const MONEY_MASK = {
  decimal: ',',
  thousands: '.',
  precision: 2,
  masked: false,
};

// "1.234,56" (valor mascarado pelo v-money) -> 1234.56 (number p/ a API).
// Espelha formatPriceToApi() de EditCase.vue, com guarda contra NaN.
export function parseBRLInput(value) {
  if (value === null || value === undefined || value === '') return 0;
  const n = parseFloat(String(value).replace(/\./g, '').replace(',', '.'));
  return Number.isFinite(n) ? n : 0;
}

// "YYYY-MM-DD" -> "DD/MM/YYYY" (o backend já devolve a data como Y-m-d).
export function formatDateBR(isoDate) {
  if (!isoDate) return '';
  const [y, m, d] = String(isoDate).slice(0, 10).split('-');
  if (!y || !m || !d) return isoDate;
  return `${d}/${m}/${y}`;
}

function todayISO() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
}

export function financeStatus(finance) {
  if (finance?.paid) return 'pago';

  const date = String(finance?.date || '').slice(0, 10);
  if (date && date < todayISO()) return 'atrasado';

  return 'pendente';
}

// Rótulo, ícone e classe do chip por situação. As classes existem no style.scss.
export const STATUS_META = {
  pago: { label: 'Pago', icon: 'bi-check-circle-fill', cls: 'fin-chip--paid' },
  pendente: { label: 'Pendente', icon: 'bi-hourglass-split', cls: 'fin-chip--pending' },
  atrasado: { label: 'Atrasado', icon: 'bi-exclamation-triangle-fill', cls: 'fin-chip--late' },
};

export const MONTH_NAMES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];
