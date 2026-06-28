// Helpers compartilhados das telas de finanças (PersonFinance.vue / Finance.vue).

// Valor em moeda brasileira (mesmo formato do app web).
export function formatBRL(value) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(Number(value || 0));
}

// "YYYY-MM-DD" -> "DD/MM/YYYY" (o backend já devolve a data como Y-m-d).
export function formatDateBR(isoDate) {
  if (!isoDate) return '';
  const [y, m, d] = String(isoDate).slice(0, 10).split('-');
  if (!y || !m || !d) return isoDate;
  return `${d}/${m}/${y}`;
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
