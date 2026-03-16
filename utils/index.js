/**
 * Formata um valor numérico para o padrão de moeda brasileiro (BRL).
 */
export function formatNumberToBRL(amount) {
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Função para construir os dados a serem enviados para adicionar o processo.
 */
export function buildData(process, filteredPeople, currentUrl) {
  return {
    process_num: process.value.number,
    jurisdiction: process.value.jurisdiction,
    people: {
      _value: filteredPeople.map((person) => ({
        nome: person.nome,
        documento: person.documento,
        tipo: person.tipo,
        representantes: person.representantes || [],
        polo: person.polo,
      })),
    },
    autuacao: process.value.autuacao,
    details: process.value.details,
    current_url: currentUrl,
  };
}

/**
 * Função para limpar os assuntos removendo parênteses e seu conteúdo.
 */
export function cleanAssunto(assunto) {
  return assunto.replace(/\s*\(.*?\)$/, '').trim();
}

export async function waitForElement(selector, delay = 50, tries = 20) {
  const element = document.querySelector(selector);
  if (element) {
    return element;
  } else if (tries - 1 > 0) {
    await new Promise((resolve) => setTimeout(resolve, delay));
    return waitForElement(selector, delay, tries - 1);
  } else {
    throw new Error('Element not found');
  }
}

export function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function getActiveTabHTML() {
  return new Promise((resolve, reject) => {
    browser.tabs.query({ active: true, currentWindow: true }, function (tabs) {
      if (tabs.length === 0) {
        console.error('Nenhuma guia ativa encontrada.');
        return reject('Nenhuma guia ativa encontrada.');
      }

      const activeTab = tabs[0];

      browser.tabs.sendMessage(activeTab.id, { type: 'GET_HTML_CONTENT' }, function (response) {
        if (browser.runtime.lastError) {
          console.error(
            'Erro ao enviar mensagem para o script de conteúdo:',
            browser.runtime.lastError.message
          );
          return reject('Erro ao obter conteúdo da página.');
        }
        const htmlContent = response.html;
        const parser = new DOMParser();
        const doc = parser.parseFromString(htmlContent, 'text/html');
        resolve(doc);
      });
    });
  });
}

/**
 * Remove acentos e caracteres especiais de uma string.
 */
export function removeAcentos(str) {
  if (!str || typeof str !== 'string') {
    return '';
  }

  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9\s]/g, '');
}
