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

      // Injeta a bridge no MAIN world da aba do WhatsApp (isento da CSP da página,
      // pois é injeção do navegador via scripting API — não um <script> no DOM).
      if (message.type === 'INJECT_WPP_BRIDGE') {
        const tabId = sender && sender.tab && sender.tab.id;
        if (!tabId) {
          sendResponse({ ok: false, error: 'sem aba de origem' });
          return true;
        }
        browser.scripting
          .executeScript({
            target: { tabId },
            world: 'MAIN',
            func: wppBridgeMain,
          })
          .then(() => {
            console.log('[Background] bridge MAIN injetada na aba', tabId);
            sendResponse({ ok: true });
          })
          .catch((e) => {
            console.error('[Background] erro ao injetar bridge MAIN:', e);
            sendResponse({ ok: false, error: String(e) });
          });
        return true;
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
                  phone: message.phone,
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
            phone: message.phone,
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

// Bridge injetada no MAIN world da aba do WhatsApp via scripting.executeScript.
// Roda no contexto da página (lê React fiber) e fala com o content script isolado
// por window.postMessage. Deve ser autossuficiente (só usa window/document).
function wppBridgeMain() {
  if (window.__advableBridgeRunning) return;
  window.__advableBridgeRunning = true;

  function fiberKey(el) {
    return Object.keys(el).find((k) => k.startsWith('__reactFiber$'));
  }

  function looksLikeChat(v) {
    return (
      v &&
      typeof v === 'object' &&
      v.id &&
      typeof v.id === 'object' &&
      typeof v.id._serialized === 'string' &&
      /@(c\.us|g\.us|lid)/.test(v.id._serialized) &&
      ('formattedTitle' in v || 'name' in v || 'isGroup' in v || 'contact' in v)
    );
  }

  function findChatInProps(props, depth, seen) {
    if (!props || typeof props !== 'object' || depth > 5) return null;
    if (seen.has(props)) return null;
    seen.add(props);
    if (looksLikeChat(props)) return props;
    for (const k of ['chat', 'contact', 'wid', 'peer']) {
      if (props[k] && looksLikeChat(props[k])) return props[k];
    }
    for (const k in props) {
      if (
        ['return', '_owner', 'stateNode', 'child', 'sibling', 'alternate', 'memoizedState'].indexOf(k) !== -1
      ) {
        continue;
      }
      try {
        const r = findChatInProps(props[k], depth + 1, seen);
        if (r) return r;
      } catch (e) {
        /* getters que lançam */
      }
    }
    return null;
  }

  // Deriva o telefone serializado (<num>@c.us). O WhatsApp passou a usar @lid
  // (sem telefone) como id do chat; o telefone real fica em contact.phoneNumber.
  function phoneSerialized(chat) {
    try {
      const s = chat.id && chat.id._serialized;
      if (s && s.indexOf('@c.us') !== -1) return s;
    } catch (e) {
      /* */
    }
    try {
      const pn = chat.contact && chat.contact.phoneNumber;
      const s = pn && (pn._serialized || (typeof pn === 'string' ? pn : null));
      if (s && s.indexOf('@c.us') !== -1) return s;
    } catch (e) {
      /* */
    }
    // Contato não salvo: o título é o próprio telefone formatado.
    try {
      const t = chat.formattedTitle || chat.name || '';
      if (/^\+?\d[\d\s().-]{6,}$/.test(t)) {
        const digits = t.replace(/\D/g, '');
        if (digits.length >= 10) return digits + '@c.us';
      }
    } catch (e) {
      /* */
    }
    return '';
  }

  function readActiveChat() {
    const start = document.querySelector('#main header') || document.querySelector('#main');
    if (!start) return null;
    const fk = fiberKey(start);
    if (!fk) return null;
    let fiber = start[fk];
    let up = 0;
    let chat = null;
    while (fiber && up < 50 && !chat) {
      if (fiber.memoizedProps) chat = findChatInProps(fiber.memoizedProps, 0, new WeakSet());
      fiber = fiber.return;
      up += 1;
    }
    if (!chat) return null;
    const serialized = phoneSerialized(chat);
    // Id estável do chat (@lid/@c.us) — sempre presente, usado p/ vínculo manual.
    let rawId = '';
    try {
      rawId = (chat.id && chat.id._serialized) || '';
    } catch (e) {
      rawId = '';
    }
    let name = '';
    try {
      name =
        chat.formattedTitle ||
        chat.name ||
        (chat.contact && (chat.contact.name || chat.contact.pushname)) ||
        '';
    } catch (e) {
      name = '';
    }
    return { serialized, rawId, name };
  }

  let lastKey = null;

  function emitActiveChat(force) {
    let info = null;
    try {
      info = readActiveChat();
    } catch (e) {
      info = null;
    }
    // Emite quando há telefone (serialized @c.us) OU id de chat estável (@lid),
    // para que chats sem telefone derivável ainda permitam vínculo manual.
    if (!info || (!info.serialized && !info.rawId)) return;
    const key = info.rawId || info.serialized;
    if (!force && key === lastKey) return;
    lastKey = key;
    console.log('[Advable bridge] chat ativo:', info.serialized || '(sem telefone)', info.rawId, info.name);
    window.postMessage(
      {
        source: 'ADVABLE_WPP',
        type: 'ACTIVE_CHAT',
        serialized: info.serialized,
        chatId: info.rawId,
        chatName: info.name,
      },
      '*'
    );
  }

  window.addEventListener('message', (event) => {
    if (event.source !== window) return;
    const d = event.data;
    if (d && d.source === 'ADVABLE_WPP_REQ' && d.type === 'GET_ACTIVE_CHAT') {
      emitActiveChat(true);
    }
  });

  let debounceTimer = null;
  function scheduleEmit() {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => emitActiveChat(false), 300);
  }

  function startObserver() {
    const root = document.querySelector('#app') || document.body;
    if (!root) {
      setTimeout(startObserver, 500);
      return;
    }
    new MutationObserver(scheduleEmit).observe(root, { childList: true, subtree: true });
    emitActiveChat(true);
  }
  startObserver();

  console.log('[Advable bridge] iniciada (main world via scripting)');
}

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
