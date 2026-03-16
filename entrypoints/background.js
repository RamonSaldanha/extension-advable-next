export default defineBackground(() => {
  console.log('[Background] Service worker iniciado');

  // Keep-alive para manter service worker ativo
  const keepAlive = () => {
    if (browser && browser.runtime) {
      console.log('[Background] Service worker mantido ativo:', new Date().toISOString());
    }
  };

  // Ping a cada 20 segundos para manter ativo
  setInterval(keepAlive, 20000);
  keepAlive();

  browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
    try {
      console.log('[Background] Mensagem recebida:', message.type);

      if (message.type === 'GET_CURRENT_TAB_HTML') {
        browser.tabs.query({ active: true, currentWindow: true }).then(async (tabs) => {
          if (tabs[0]) {
            try {
              const response = await browser.tabs.sendMessage(tabs[0].id, { type: 'GET_HTML_CONTENT' });
              sendResponse(response);
            } catch (e) {
              sendResponse({ html: '' });
            }
          } else {
            sendResponse({ html: '' });
          }
        });
        return true; // Mantém a porta aberta para resposta assíncrona
      }

      // Coleta de expedientes do PJE
      if (message.type === 'COLLECT_EXPEDIENTES') {
        browser.tabs.query({ active: true, currentWindow: true }).then(async (tabs) => {
          if (!tabs[0]) {
            sendResponse({ success: false, error: 'Nenhuma aba ativa encontrada' });
            return;
          }

          const tabId = tabs[0].id;
          const tabUrl = tabs[0].url || '';

          if (!tabUrl.includes('pje') || !tabUrl.includes('jus.br')) {
            sendResponse({ success: false, error: 'Abra o painel do PJE antes de coletar' });
            return;
          }

          try {
            const results = await browser.scripting.executeScript({
              target: { tabId },
              func: collectExpedientesPJE,
            });

            const data = results?.[0]?.result;
            if (data && data.success) {
              sendResponse({ success: true, dados: data.dados });
            } else {
              sendResponse({ success: false, error: data?.error || 'Erro desconhecido na coleta' });
            }
          } catch (e) {
            console.error('[Background] Erro ao injetar script:', e);
            sendResponse({ success: false, error: 'Erro ao injetar script: ' + e.message });
          }
        });
        return true;
      }

      // Escuta mudanças de chat do WhatsApp
      if (message.type === 'WHATSAPP_CHAT_CHANGED') {
        console.log('[Background] Chat alterado:', message.chatName, message.chatId);

        // Retransmite a mensagem para todas as abas da extensão
        browser.tabs.query({}).then((tabs) => {
          tabs.forEach((tab) => {
            // Verifica se a aba é da extensão
            if (tab.url && tab.url.includes(browser.runtime.id)) {
              browser.tabs
                .sendMessage(tab.id, {
                  type: 'WHATSAPP_CHAT_CHANGED',
                  chatId: message.chatId,
                  chatName: message.chatName,
                })
                .catch(() => {
                  // Ignora erros de abas que não podem receber mensagens
                });
            }
          });
        });

        // Também envia via runtime para popup/páginas da extensão
        browser.runtime
          .sendMessage({
            type: 'WHATSAPP_CHAT_CHANGED',
            chatId: message.chatId,
            chatName: message.chatName,
          })
          .catch(() => {
            // Ignora se não há receivers
          });
      }
    } catch (error) {
      console.error('[Background] Erro ao processar mensagem:', error);
    }
  });

  // Eventos de ciclo de vida
  browser.runtime.onStartup.addListener(() => {
    console.log('[Background] Extension startup');
    keepAlive();
  });

  browser.runtime.onInstalled.addListener(() => {
    console.log('[Background] Extension installed/updated');
    keepAlive();
  });

  console.log('[Background] Service worker carregado com sucesso');
});

// Função injetada na página do PJE para coletar expedientes
function collectExpedientesPJE() {
  return new Promise((resolve) => {
    const dados = [];
    const processosJaColetados = new Set();
    let indiceComarca = 0;
    let comarcasLinks = [];

    function extrairNumeroProcesso(texto) {
      const match = texto.match(/([A-Za-z]{2,15}\s+)?(\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4})/);
      return match ? match[0].trim() : '';
    }

    function extrairAssunto(textoProcesso) {
      const partes = textoProcesso.split(/\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4}/);
      return partes.length > 1 ? partes[1].trim().substring(0, 100) : '';
    }

    function extrairTipoDocumento(texto) {
      const match = texto.match(/([A-Za-zÀ-ú]+)\s*\(\d{5,}\)/);
      return match ? match[1] : '';
    }

    function extrairIdExpedienteDoHTML(linha) {
      const html = linha.outerHTML;
      const match = html.match(/tbExpedientes:(\d+):/);
      return match ? match[1] : '';
    }

    function extrairIdExpedienteDoTexto(texto) {
      const match = texto.match(/[A-Za-zÀ-ú]+\s*\((\d{5,})\)/);
      return match ? match[1] : '';
    }

    function extrairDestinatario(linha) {
      const spanDestinatario = linha.querySelector('span[title="Destinatário"]');
      if (spanDestinatario) return (spanDestinatario.innerText || '').trim();
      const spanBold = linha.querySelector('.informacoes-linha-expedientes span.text-bold');
      if (spanBold) return (spanBold.innerText || '').trim();
      return '';
    }

    function extrairMeioComunicacao(texto) {
      const match = texto.match(/([A-Za-zÀ-ú\s]+)\s*\(\d{2}\/\d{2}\/\d{4}/);
      if (match) {
        const meio = match[1].trim();
        if (!meio.match(/Prazo|Data|sistema/i)) return meio;
      }
      return '';
    }

    function extrairDataExpedicao(texto) {
      const match = texto.match(/\((\d{2}\/\d{2}\/\d{4}\s+\d{2}:\d{2})\)/);
      return match ? match[1] : '';
    }

    function extrairPrazo(texto) {
      if (texto.match(/Prazo[:\s]*sem\s+prazo/i)) return 'Sem prazo';
      const match = texto.match(/Prazo[:\s]*(\d+)\s*dias?/i);
      return match ? match[1] + ' dias' : '';
    }

    function extrairDataLimite(texto) {
      const match = texto.match(/Data\s+limite[^:]*:\s*(\d{2}\/\d{2}\/\d{4}(?:\s+\d{2}:\d{2})?)/i);
      if (match) return match[1];
      if (texto.match(/c[áa]lculo\s+em\s+processamento/i)) return 'Em processamento';
      return '';
    }

    function extrairDataCiencia(texto) {
      const match = texto.match(/ci[êe]ncia\s+em\s*(\d{2}\/\d{2}\/\d{4}(?:\s+\d{2}:\d{2})?)/i);
      return match ? match[1] : '';
    }

    function extrairQuemTomouCiencia(texto) {
      const match = texto.match(/([A-ZÀ-Ú\s]+)\s+tomou\s+ci[êe]ncia/i);
      if (match) return match[1].trim();
      if (texto.match(/sistema\s+registrou\s+ci[êe]ncia/i)) return 'Sistema (automático)';
      return '';
    }

    function extrairPartes(texto) {
      const linhas = texto.split('\n');
      for (let i = 0; i < linhas.length; i++) {
        const linha = linhas[i].trim();
        if (linha.match(/\s+[Xx]\s+/)) return linha.substring(0, 200);
      }
      return '';
    }

    function extrairVara(texto) {
      let match = texto.match(/\/?\d*[ªº]?\s*Vara[^\n\/]*/i);
      if (match) return match[0].trim();
      match = texto.match(/Juizado[^\n\/]*/i);
      if (match) return match[0].trim();
      return '';
    }

    function verificarEexpandirSecao() {
      // Primeiro tenta encontrar comarcas diretamente (seção pode já estar expandida)
      setTimeout(() => {
        buscarComarcas(1, false);
      }, 500);
    }

    function buscarComarcas(tentativa, jaClicouPendentes) {
      tentativa = tentativa || 1;
      comarcasLinks = [];
      const nomesColecionados = new Set();

      const todosLinks = Array.from(document.querySelectorAll('a[href="#"]'));

      for (let i = 0; i < todosLinks.length; i++) {
        const link = todosLinks[i];
        const conteudo = link.innerText || link.textContent || '';

        // Filtro de INCLUSÃO: deve conter uma dessas palavras-chave de jurisdição
        if ((conteudo.includes('Comarca') ||
             conteudo.includes('Juizado') ||
             conteudo.includes('Justiça') ||
             conteudo.includes('Criminal') ||
             conteudo.includes('Natal')) &&
            // Exclusões: termos que não são comarcas
            !conteudo.includes('Caixa') &&
            !conteudo.includes('Responder') &&
            !conteudo.includes('Clique') &&
            !conteudo.includes('Apenas') &&
            !conteudo.includes('Ciência') &&
            !conteudo.includes('Consulta') &&
            !conteudo.includes('Arquivados')) {

          const nomeLimpo = conteudo.trim();
          if (!nomesColecionados.has(nomeLimpo) && nomeLimpo.length > 8) {
            nomesColecionados.add(nomeLimpo);
            comarcasLinks.push({
              nome: nomeLimpo,
              elemento: link
            });
            console.log('[Advable] Comarca detectada:', nomeLimpo);
          }
        }
      }

      console.log('[Advable] Comarcas encontradas:', comarcasLinks.length, '(tentativa', tentativa + ', clicou:', jaClicouPendentes + ')');

      // Se não encontrou comarcas e ainda não clicou no "Pendentes", tenta expandir
      if (comarcasLinks.length === 0 && !jaClicouPendentes) {
        const pendentesLink = todosLinks.find(l => {
          const txt = (l.innerText || l.textContent || '').trim();
          return txt.includes('Pendentes') && !txt.includes('Apenas');
        });

        if (pendentesLink) {
          console.log('[Advable] Clicando em "Pendentes" para expandir...');
          pendentesLink.click();
          setTimeout(() => buscarComarcas(tentativa + 1, true), 2000);
          return;
        }
      }

      // Se ainda não encontrou, tenta mais vezes
      if (comarcasLinks.length === 0 && tentativa < 5) {
        setTimeout(() => buscarComarcas(tentativa + 1, jaClicouPendentes), 2000);
        return;
      }

      processarProximaComarca();
    }

    function processarProximaComarca() {
      if (indiceComarca >= comarcasLinks.length) {
        console.log('[Advable] Coleta concluída. Total:', dados.length);
        resolve({ success: true, dados });
        return;
      }

      const comarca = comarcasLinks[indiceComarca];
      console.log('[Advable] Processando comarca:', comarca.nome);
      comarca.elemento.click();

      setTimeout(() => {
        coletarDados(comarca.nome);
        indiceComarca++;
        setTimeout(() => processarProximaComarca(), 1500);
      }, 2000);
    }

    function coletarDados(nomeComarca) {
      const linhasExpedientes = document.querySelectorAll('tr.rich-table-row');

      linhasExpedientes.forEach((linha) => {
        const linkProcesso = linha.querySelector('a.numero-processo-expediente');
        if (!linkProcesso) return;

        const textoProcesso = (linkProcesso.innerText || linkProcesso.textContent || '').trim();
        const numeroProcesso = extrairNumeroProcesso(textoProcesso);
        if (!numeroProcesso) return;

        const idExpediente = extrairIdExpedienteDoHTML(linha);
        const textoCompleto = linha.innerText || '';

        const item = {
          comarca: nomeComarca,
          processo: numeroProcesso,
          assunto: extrairAssunto(textoProcesso),
          tipoDocumento: extrairTipoDocumento(textoCompleto),
          idExpediente: idExpediente || extrairIdExpedienteDoTexto(textoCompleto),
          destinatario: extrairDestinatario(linha),
          meioComunicacao: extrairMeioComunicacao(textoCompleto),
          dataExpedicao: extrairDataExpedicao(textoCompleto),
          prazo: extrairPrazo(textoCompleto),
          dataLimite: extrairDataLimite(textoCompleto),
          dataCiencia: extrairDataCiencia(textoCompleto),
          quemTomouCiencia: extrairQuemTomouCiencia(textoCompleto),
          partes: extrairPartes(textoCompleto),
          vara: extrairVara(textoCompleto),
        };

        const chaveUnica =
          item.idExpediente ||
          numeroProcesso + '|' + item.destinatario + '|' + item.tipoDocumento + '|' + nomeComarca;

        if (!processosJaColetados.has(chaveUnica)) {
          processosJaColetados.add(chaveUnica);
          dados.push(item);
        }
      });
    }

    // Inicia a coleta
    try {
      verificarEexpandirSecao();
    } catch (e) {
      resolve({ success: false, error: e.message });
    }
  });
}
