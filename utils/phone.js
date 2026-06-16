// Espelho leve da normalização do backend (App\Support\PhoneNumber), só para
// PREFILL/EXIBIÇÃO na extensão. O casamento de verdade é feito no servidor.

export function onlyDigits(value) {
  return String(value || '')
    .replace(/@.*/, '') // remove sufixo do WhatsApp (@c.us/@lid)
    .replace(/\D/g, '');
}

// Constrói um E.164 só dígitos a partir de qualquer entrada. Assume BR (55) para
// números nacionais (até 11 dígitos); 12+ dígitos são tratados como já incluindo
// o código do país. Retorna '' quando não há número plausível.
export function toE164(raw) {
  const s = String(raw || '').trim();
  const d = onlyDigits(s);
  if (d.length < 10) return '';
  if (s.startsWith('+')) return d;
  if (d.length <= 11) return `55${d}`;
  return d;
}

// Formata um número (E.164 ou cru) para exibição amigável no padrão BR; números
// estrangeiros caem para o formato internacional `+<dígitos>`. Celular BR vindo do
// WhatsApp (@c.us costuma omitir o 9) tem o 9 recomposto, igual ao backend.
export function displayBR(raw) {
  const d = toE164(raw);
  if (!d) return String(raw || '');

  if (d.startsWith('55') && d.length >= 12) {
    const ddd = d.slice(2, 4);
    let sub = d.slice(4);
    if (sub.length === 8 && !['2', '3', '4', '5'].includes(sub[0])) {
      sub = `9${sub}`;
    }
    if (sub.length === 9) {
      return `(${ddd}) ${sub[0]} ${sub.slice(1, 5)}-${sub.slice(5)}`;
    }
    if (sub.length === 8) {
      return `(${ddd}) ${sub.slice(0, 4)}-${sub.slice(4)}`;
    }
  }

  return `+${d}`;
}
