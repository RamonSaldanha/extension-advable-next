// Helpers de texto compartilhados.

// Conectores que, em nomes próprios brasileiros, ficam em minúsculo.
const LOWER_CONNECTORS = new Set(['de', 'da', 'do', 'dos', 'das', 'e']);

// Normaliza um nome próprio para Title Case, independente de como está gravado
// no banco (tudo maiúsculo, tudo minúsculo, misto). Mantém conectores ("de",
// "da", "dos"...) em minúsculo — exceto quando forem a primeira palavra.
export function titleCasePtBr(str) {
  if (!str) return '';
  return String(str)
    .toLowerCase()
    .split(/\s+/)
    .filter((w) => w.length > 0)
    .map((word, index) => {
      if (index > 0 && LOWER_CONNECTORS.has(word)) return word;
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(' ');
}
