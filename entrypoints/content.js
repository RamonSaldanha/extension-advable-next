export default defineContentScript({
  // Só os domínios onde a extensão realmente atua: WhatsApp Web e PJe/jus.br.
  // (O botão/modal já era restrito a estes domínios pela checagem interna.)
  matches: ['https://web.whatsapp.com/*', '*://*.jus.br/*'],

  main() {
    console.log('[Advable content] carregado em', window.location.href);

    // === Listener para GET_HTML_CONTENT ===
    browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
      if (message.type === 'GET_HTML_CONTENT') {
        sendResponse({ html: document.documentElement.innerHTML });
      }
      return true;
    });

    // === WhatsApp chat tracking ===
    // O WhatsApp removeu o telefone/JID do DOM e bloqueou o store via webpack.
    // O telefone só está acessível nas props da árvore React (React fiber) de #main,
    // que SÓ são legíveis no MAIN world. A bridge (bridgeMain) é injetada no MAIN
    // world via blob: (permitido pela CSP do WhatsApp) a partir deste content script
    // isolado, e responde via window.postMessage.
    let lastKey = null;
    let currentChatInfo = null; // cache do último chat ativo conhecido
    let clusterState = { registered: false, hasNote: false, personId: null };
    let refreshClusterImpl = null; // atribuído ao criar o cluster (só no WhatsApp)
    let dockedMode = false; // painel encaixado sempre visível (lido de storage.local; liga/desliga pelo menu)

    function notifyChatChange(chatInfo) {
      if (!chatInfo || !chatInfo.chatId) return;

      browser.runtime.sendMessage({
        type: 'WHATSAPP_CHAT_CHANGED',
        ...chatInfo,
      });

      window.postMessage(
        {
          type: 'WHATSAPP_CHAT_CHANGED',
          ...chatInfo,
        },
        '*'
      );

      console.log('Chat alterado notificado:', chatInfo.chatName, chatInfo.chatId, chatInfo.phone);
    }

    // Trata o chat ativo recebido da bridge. `serialized` é o telefone
    // (<num>@c.us) quando derivável; `rawChatId` é o id estável do WhatsApp
    // (@lid/@c.us), sempre presente. Chats sem telefone (ex.: @lid) também são
    // repassados — permitem vínculo manual pelo painel.
    function handleActiveChat(serialized, rawChatId, chatName) {
      const phone = serialized && serialized.endsWith('@c.us') ? serialized : '';
      const chatId = rawChatId || phone;
      if (!chatId) return;

      const info = { chatId, phone, chatName: chatName || 'Chat' };
      currentChatInfo = info;

      if (chatId === lastKey) return;
      lastKey = chatId;

      notifyChatChange(info);
      if (typeof refreshClusterImpl === 'function') refreshClusterImpl(info);
    }

    // Pede à bridge (main world) o chat ativo atual.
    function requestActiveChat() {
      window.postMessage({ source: 'ADVABLE_WPP_REQ', type: 'GET_ACTIVE_CHAT' }, '*');
    }

    let activeChatCheckTimer = null;
    function scheduleActiveChatCheck(delay = 400) {
      clearTimeout(activeChatCheckTimer);
      activeChatCheckTimer = setTimeout(requestActiveChat, delay);
    }

    // Recebe respostas da bridge
    window.addEventListener('message', (event) => {
      if (event.source !== window) return;
      const d = event.data;
      if (d && d.source === 'ADVABLE_WPP' && d.type === 'ACTIVE_CHAT') {
        console.log('[Advable content] ACTIVE_CHAT recebido da bridge:', d.serialized, d.chatId, d.chatName);
        handleActiveChat(d.serialized, d.chatId, d.chatName);
      }
    });

    // Listener para GET_WHATSAPP_CHAT_ID — responde com o cache e dispara refresh
    browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
      if (message.type === 'GET_WHATSAPP_CHAT_ID') {
        requestActiveChat();
        sendResponse(currentChatInfo);
      }
      return true;
    });

    // === Injeção da bridge MAIN world ===
    // A CSP do WhatsApp bloqueia injetar <script> (chrome-extension:, blob: e inline).
    // A única forma de rodar código no MAIN world (onde o React fiber é legível) é o
    // background injetar via browser.scripting.executeScript({ world: 'MAIN' }), que é
    // injeção do navegador (isenta da CSP da página). Pedimos isso ao background.
    function injectBridge() {
      browser.runtime
        .sendMessage({ type: 'INJECT_WPP_BRIDGE' })
        .then((res) => {
          console.log('[Advable content] resposta INJECT_WPP_BRIDGE:', res);
        })
        .catch((e) => {
          console.error('[Advable content] erro ao pedir injeção da bridge:', e);
        });
    }

    // === Verificação de URL ===
    // Atua em QUALQUER tribunal/site .jus.br (não só PJe) e no WhatsApp Web —
    // o painel encaixado deve funcionar "em qualquer site jus".
    const pattern = /(jus\.br|web\.whatsapp\.com)/;
    const currentUrl = window.location.href;
    const isAllowedDomain = pattern.test(currentUrl);

    if (!isAllowedDomain) return;

    // No WhatsApp, pede ao background para injetar a bridge no MAIN world e pede o
    // chat ativo algumas vezes logo após o carregamento. A bridge também emite
    // proativamente quando a conversa muda (MutationObserver); o poll é reforço inicial.
    if (window.location.href.includes('web.whatsapp.com')) {
      console.log('[Advable content] WhatsApp detectado — pedindo injeção da bridge ao background');
      injectBridge();

      let bootTries = 0;
      const bootPoll = setInterval(() => {
        bootTries += 1;
        requestActiveChat();
        if (bootTries > 30) clearInterval(bootPoll); // ~15s
      }, 500);
    }

    // Evita duplicação do cluster
    if (document.getElementById('advable-icon-cluster')) return;

    const isWhatsApp = window.location.href.includes('web.whatsapp.com');

    // SVGs (Bootstrap Icons) dos ícones contextuais. Cor herda do `color` do botão.
    const ICON_PERSON = `
      <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" fill="currentColor" viewBox="0 0 16 16" style="pointer-events:none;">
        <path d="M8 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6m2-3a2 2 0 1 1-4 0 2 2 0 0 1 4 0m4 8c0 1-1 1-1 1H3s-1 0-1-1 1-4 6-4 6 3 6 4m-1-.004c-.001-.246-.154-.986-.832-1.664C11.516 10.68 10.289 10 8 10c-2.29 0-3.516.68-4.168 1.332-.678.678-.83 1.418-.832 1.664z"/>
      </svg>`;
    const ICON_PERSON_ADD = `
      <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" fill="currentColor" viewBox="0 0 16 16" style="pointer-events:none;">
        <path d="M6 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6m2-3a2 2 0 1 1-4 0 2 2 0 0 1 4 0m4 8c0 1-1 1-1 1H1s-1 0-1-1 1-4 6-4 6 3 6 4m-1-.004c-.001-.246-.154-.986-.832-1.664C9.516 10.68 8.289 10 6 10c-2.29 0-3.516.68-4.168 1.332-.678.678-.83 1.418-.832 1.664z"/>
        <path fill-rule="evenodd" d="M13.5 5a.5.5 0 0 1 .5.5V7h1.5a.5.5 0 0 1 0 1H14v1.5a.5.5 0 0 1-1 0V8h-1.5a.5.5 0 0 1 0-1H13V5.5a.5.5 0 0 1 .5-.5"/>
      </svg>`;
    const ICON_NOTE = `
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 16 16" style="pointer-events:none;">
        <path d="M5 10.5a.5.5 0 0 1 .5-.5h2a.5.5 0 0 1 0 1h-2a.5.5 0 0 1-.5-.5m0-2a.5.5 0 0 1 .5-.5h5a.5.5 0 0 1 0 1h-5a.5.5 0 0 1-.5-.5m0-2a.5.5 0 0 1 .5-.5h5a.5.5 0 0 1 0 1h-5a.5.5 0 0 1-.5-.5m0-2a.5.5 0 0 1 .5-.5h5a.5.5 0 0 1 0 1h-5a.5.5 0 0 1-.5-.5"/>
        <path d="M3 0h10a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V2a2 2 0 0 1 2-2m0 1a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V2a1 1 0 0 0-1-1z"/>
      </svg>`;
    const ICON_FINANCE = `
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 16 16" style="pointer-events:none;">
        <path d="M4 10.781c.148 1.667 1.513 2.85 3.591 3.003V15h1.043v-1.216c2.27-.179 3.678-1.438 3.678-3.298 0-1.59-.947-2.51-2.956-3.028l-.722-.187V3.467c1.122.11 1.879.714 2.07 1.616h1.47c-.166-1.6-1.54-2.748-3.54-2.875V1H7.591v1.233c-1.939.23-3.27 1.472-3.27 3.156 0 1.454.966 2.483 2.661 2.917l.61.162v4.031c-1.149-.17-1.94-.8-2.131-1.718zm3.391-3.836c-1.043-.263-1.6-.825-1.6-1.616 0-.944.704-1.641 1.8-1.828v3.495l-.2-.05zm1.591 1.872c1.287.323 1.852.859 1.852 1.769 0 1.097-.826 1.828-2.2 1.939V8.73z"/>
      </svg>`;

    // === Cluster de ícones flutuante (canto inferior direito) ===
    const cluster = document.createElement('div');
    cluster.id = 'advable-icon-cluster';
    Object.assign(cluster.style, {
      all: 'unset',
      position: 'fixed',
      bottom: '104px', // acima da barra de composição do WhatsApp
      right: '24px',
      zIndex: '2147483646',
      display: 'none', // só aparece quando há chat ativo (no WhatsApp)
      flexDirection: 'column',
      gap: '10px',
      alignItems: 'center',
    });

    // Cria um botão circular branco com glifo navy e sombra preta (sem gradiente).
    function makeIconButton(html, title) {
      const btn = document.createElement('div');
      btn.title = title || '';
      Object.assign(btn.style, {
        all: 'unset',
        width: '42px',
        height: '42px',
        boxSizing: 'border-box',
        backgroundColor: '#FFFFFF',
        color: '#16223f',
        cursor: 'pointer',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: '50%',
        border: '1px solid rgba(0, 0, 0, 0.10)',
        boxShadow: '0 4px 14px rgba(0, 0, 0, 0.25)',
        transition: 'box-shadow 0.18s ease, transform 0.12s ease',
        position: 'relative',
      });
      btn.innerHTML = html;
      btn.addEventListener('mouseover', () => {
        btn.style.boxShadow = '0 8px 22px rgba(0, 0, 0, 0.38)';
        btn.style.transform = 'translateY(-1px)';
      });
      btn.addEventListener('mouseout', () => {
        btn.style.boxShadow = '0 4px 14px rgba(0, 0, 0, 0.25)';
        btn.style.transform = 'none';
      });
      return btn;
    }

    // Abre o modal (iframe do popup) numa rota específica do hash. Se já estiver
    // aberto, fecha e reabre na rota desejada.
    function openModal(hashRoute) {
      // Modo encaixado: garante o painel lateral (que reserva espaço, não sobrepõe).
      if (dockedMode) {
        if (!document.getElementById('advable-docked-panel')) enterDockedMode(hashRoute);
        return;
      }
      if (document.getElementById('advable-modal')) {
        closeModal();
        setTimeout(() => createModal(hashRoute), 220);
        return;
      }
      createModal(hashRoute);
    }

    // Deep-links (ficha e notas) do chat ativo, carregando os identificadores
    // exatos (raw = id estável; phone = telefone) para resolução determinística.
    function chatHashRoutes() {
      const info = currentChatInfo || {};
      const raw = info.chatId || '';
      const phone = info.phone || '';
      const searchKey = phone || raw;
      const name = info.chatName || 'Chat';
      const qs = `?raw=${encodeURIComponent(raw)}&phone=${encodeURIComponent(phone)}`;
      return {
        person: `/person/search/${encodeURIComponent(searchKey)}/${encodeURIComponent(name)}${qs}`,
        note: `/person/note/${encodeURIComponent(searchKey)}/${encodeURIComponent(name)}${qs}`,
      };
    }

    if (isWhatsApp) {
      const personBtn = makeIconButton(ICON_PERSON_ADD, 'Cadastrar cliente');
      const noteBtn = makeIconButton(ICON_NOTE, 'Anotações');

      // Ponto indicador de "tem anotação".
      const noteDot = document.createElement('span');
      Object.assign(noteDot.style, {
        position: 'absolute',
        top: '5px',
        right: '5px',
        width: '9px',
        height: '9px',
        borderRadius: '50%',
        backgroundColor: '#2e7d32',
        border: '2px solid #FFFFFF',
        display: 'none',
        pointerEvents: 'none',
      });
      noteBtn.appendChild(noteDot);

      cluster.appendChild(personBtn);
      cluster.appendChild(noteBtn);

      personBtn.addEventListener('click', () => openModal(chatHashRoutes().person));
      noteBtn.addEventListener('click', () => {
        const r = chatHashRoutes();
        // Sem cliente cadastrado, manda para a ficha (que oferece cadastro/vínculo).
        openModal(clusterState.registered ? r.note : r.person);
      });

      // Finanças (visão geral do usuário) — abre o painel direto na página de finanças.
      const financeBtn = makeIconButton(ICON_FINANCE, 'Finanças');
      cluster.appendChild(financeBtn);
      financeBtn.addEventListener('click', () => openModal('/finances'));

      // Atualiza os glifos a partir do resultado do lookup de registro.
      function updateClusterForChat(state) {
        clusterState = state;
        personBtn.innerHTML = state.registered ? ICON_PERSON : ICON_PERSON_ADD;
        personBtn.title = state.registered ? 'Ver cliente' : 'Cadastrar cliente';
        noteDot.style.display = state.registered && state.hasNote ? 'block' : 'none';
      }

      let lookupTimer = null;
      refreshClusterImpl = function (info) {
        if (!info || !info.chatId) {
          cluster.style.display = 'none';
          return;
        }
        // No modo encaixado o painel já está sempre na tela; o cluster fica oculto.
        cluster.style.display = dockedMode ? 'none' : 'flex';
        applyClusterPlacement();
        clearTimeout(lookupTimer);
        lookupTimer = setTimeout(() => {
          browser.runtime
            .sendMessage({ type: 'LOOKUP_PERSON', phone: info.phone || '', chatId: info.chatId || '' })
            .then((res) => {
              if (!res) return;
              updateClusterForChat({
                registered: !!res.registered,
                hasNote: !!res.hasNote,
                personId: res.personId || null,
              });
            })
            .catch(() => {
              /* sem token / offline: mantém o estado atual */
            });
        }, 250);
      };

      // Se um chat já foi detectado antes do cluster existir, atualiza já.
      if (currentChatInfo) refreshClusterImpl(currentChatInfo);
    } else {
      // PJe/jus.br: ponto de entrada simples para abrir o painel (não há chat).
      const logoBtn = makeIconButton(
        `<img src="${browser.runtime.getURL('/icon48.png')}" alt="Advable" style="width:24px;height:24px;display:block;pointer-events:none;" />`,
        'Abrir Advable'
      );
      logoBtn.addEventListener('click', () => openModal('/dashboard'));
      cluster.appendChild(logoBtn);
      cluster.style.display = 'flex';
    }

    document.body.appendChild(cluster);

    // === Reposicionamento quando um arquivo abre em tela cheia ===
    // O WhatsApp abre imagens/vídeos/PDFs num visualizador fullscreen cujos
    // controles ficam à direita (zoom etc.), colidindo com o cluster. Detectamos
    // o visualizador (sem depender de classes internas do WhatsApp) checando se o
    // centro da tela ainda pertence a #main; se não, sobe o cluster para o topo.
    function isFullscreenViewerOpen() {
      try {
        const el = document.elementFromPoint(window.innerWidth / 2, window.innerHeight / 2);
        if (!el) return false;
        if (el.closest('#advable-modal') || el.closest('#advable-icon-cluster')) return false;
        return !el.closest('#main');
      } catch (e) {
        return false;
      }
    }

    function applyClusterPlacement() {
      if (!isWhatsApp) return;
      if (isFullscreenViewerOpen()) {
        cluster.style.top = '76px';
        cluster.style.bottom = 'auto';
      } else {
        cluster.style.top = 'auto';
        cluster.style.bottom = '104px';
      }
    }

    let placementTimer = null;
    function scheduleClusterPlacement() {
      clearTimeout(placementTimer);
      placementTimer = setTimeout(applyClusterPlacement, 120);
    }

    if (isWhatsApp) {
      applyClusterPlacement();
      // Fechar o visualizador com Esc também precisa restaurar a posição.
      document.addEventListener('keyup', (e) => {
        if (e.key === 'Escape') scheduleClusterPlacement();
      }, true);
    }

    // === Observadores de mudanças ===
    // Em vez de raspar o DOM, cada gatilho apenas pede o chat ativo à bridge;
    // handleActiveChat faz o dedupe e notifica quando realmente muda.
    let lastUrl = location.href;
    new MutationObserver(() => {
      const url = location.href;
      if (url !== lastUrl) {
        lastUrl = url;
        if (url.includes('web.whatsapp.com')) {
          scheduleActiveChatCheck(800);
        }
      }
    }).observe(document, { subtree: true, childList: true });

    document.addEventListener(
      'click',
      () => {
        if (window.location.href.includes('web.whatsapp.com')) {
          scheduleActiveChatCheck(400);
          scheduleClusterPlacement();
        }
      },
      true
    );

    const chatListObserver = new MutationObserver(() => {
      if (window.location.href.includes('web.whatsapp.com')) {
        scheduleActiveChatCheck(400);
      }
    });

    const mainPanel = document.querySelector('#main');
    if (mainPanel) {
      chatListObserver.observe(mainPanel, {
        childList: true,
        subtree: true,
      });
    }

    // === Modal Advable (flutuante, móvel na horizontal e redimensionável) ===
    const MODAL_MIN_WIDTH = 360;
    const MODAL_DEFAULT_WIDTH = 470;
    const MODAL_GAP = 16; // espaço entre o modal e as bordas do navegador

    function getModalMaxWidth() {
      return Math.min(900, window.innerWidth - 2 * MODAL_GAP);
    }

    function clampValue(value, min, max) {
      return Math.max(min, Math.min(max, value));
    }

    function createModal(hashRoute = '/dashboard') {
      const maxWidth = getModalMaxWidth();

      // Restaura largura/posição salvas (com limites)
      let width = parseInt(localStorage.getItem('advableModalWidth'), 10);
      if (!width || Number.isNaN(width)) width = MODAL_DEFAULT_WIDTH;
      width = clampValue(width, MODAL_MIN_WIDTH, maxWidth);

      let left = parseInt(localStorage.getItem('advableModalLeft'), 10);
      if (Number.isNaN(left)) left = window.innerWidth - width - MODAL_GAP; // padrão: à direita, com folga
      left = clampValue(left, MODAL_GAP, Math.max(MODAL_GAP, window.innerWidth - width - MODAL_GAP));

      const modal = document.createElement('div');
      modal.id = 'advable-modal';
      modal.className = 'advable-modal';
      Object.assign(modal.style, {
        all: 'unset',
        position: 'fixed',
        top: MODAL_GAP + 'px',
        left: left + 'px',
        width: width + 'px',
        height: `calc(100vh - ${2 * MODAL_GAP}px)`,
        backgroundColor: '#ffffff',
        zIndex: '2147483647',
        boxShadow: '0 8px 40px rgba(0, 0, 0, 0.18)',
        borderRadius: '16px',
        overflow: 'hidden',
        opacity: '0',
        transform: 'translateX(16px)',
        transition: 'opacity 0.25s ease, transform 0.25s ease',
        display: 'flex',
        flexDirection: 'column',
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
        fontSize: '14px',
        lineHeight: '1.5',
        color: '#212529',
        boxSizing: 'border-box',
      });

      // === Cabeçalho (alça de arrasto) ===
      const header = document.createElement('div');
      Object.assign(header.style, {
        all: 'unset',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '12px 16px',
        borderBottom: '1px solid #ececf3',
        background: 'linear-gradient(180deg, #ffffff 0%, #f6f5fb 100%)',
        flexShrink: '0',
        boxSizing: 'border-box',
        minHeight: '56px',
        cursor: 'grab',
        userSelect: 'none',
      });

      const headerLeft = document.createElement('div');
      Object.assign(headerLeft.style, {
        all: 'unset',
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        color: '#16223f',
        fontSize: '15px',
        fontWeight: '600',
      });

      const grip = document.createElement('span');
      grip.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16">
          <path d="M7 2a1 1 0 1 1-2 0 1 1 0 0 1 2 0m3 0a1 1 0 1 1-2 0 1 1 0 0 1 2 0M7 5a1 1 0 1 1-2 0 1 1 0 0 1 2 0m3 0a1 1 0 1 1-2 0 1 1 0 0 1 2 0M7 8a1 1 0 1 1-2 0 1 1 0 0 1 2 0m3 0a1 1 0 1 1-2 0 1 1 0 0 1 2 0m-3 3a1 1 0 1 1-2 0 1 1 0 0 1 2 0m3 0a1 1 0 1 1-2 0 1 1 0 0 1 2 0m-3 3a1 1 0 1 1-2 0 1 1 0 0 1 2 0m3 0a1 1 0 1 1-2 0 1 1 0 0 1 2 0"/>
        </svg>
      `;
      Object.assign(grip.style, {
        all: 'unset',
        display: 'flex',
        alignItems: 'center',
        color: '#b9b6d6',
        pointerEvents: 'none',
      });

      const logoIcon = document.createElement('img');
      logoIcon.src = browser.runtime.getURL('/icon48.png');
      logoIcon.alt = 'Advable';
      Object.assign(logoIcon.style, {
        width: '22px',
        height: '22px',
        display: 'block',
        pointerEvents: 'none',
      });

      const title = document.createElement('span');
      title.textContent = 'Advable';
      Object.assign(title.style, {
        all: 'unset',
        fontSize: '15px',
        fontWeight: '600',
        color: '#212529',
        pointerEvents: 'none',
      });

      headerLeft.appendChild(grip);
      headerLeft.appendChild(logoIcon);
      headerLeft.appendChild(title);

      const headerControls = document.createElement('div');
      Object.assign(headerControls.style, {
        all: 'unset',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
      });

      const closeButton = document.createElement('button');
      closeButton.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
          <path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708"/>
        </svg>
      `;
      Object.assign(closeButton.style, {
        all: 'unset',
        width: '32px',
        height: '32px',
        background: 'transparent',
        color: '#6c757d',
        border: 'none',
        borderRadius: '8px',
        cursor: 'pointer',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        transition: 'background-color 0.2s, color 0.2s',
        boxSizing: 'border-box',
      });
      closeButton.addEventListener('mouseenter', () => {
        closeButton.style.backgroundColor = 'rgba(220, 53, 69, 0.1)';
        closeButton.style.color = '#dc3545';
      });
      closeButton.addEventListener('mouseleave', () => {
        closeButton.style.backgroundColor = 'transparent';
        closeButton.style.color = '#6c757d';
      });

      headerControls.appendChild(closeButton);
      header.appendChild(headerLeft);
      header.appendChild(headerControls);

      // === Conteúdo (iframe) ===
      const content = document.createElement('div');
      Object.assign(content.style, {
        all: 'unset',
        flex: '1',
        overflow: 'hidden',
        display: 'block',
        position: 'relative',
      });

      const iframe = document.createElement('iframe');
      iframe.src = browser.runtime.getURL('/popup.html#' + (hashRoute || '/dashboard'));
      Object.assign(iframe.style, {
        all: 'unset',
        width: '100%',
        height: '100%',
        border: 'none',
        display: 'block',
        backgroundColor: 'white',
      });
      content.appendChild(iframe);

      // === Alças de redimensionamento (bordas esquerda e direita) ===
      function createResizeHandle(side) {
        const handle = document.createElement('div');
        Object.assign(handle.style, {
          all: 'unset',
          position: 'absolute',
          top: '0',
          bottom: '0',
          [side]: '0',
          width: '6px',
          cursor: 'col-resize',
          zIndex: '2',
          backgroundColor: 'transparent',
          transition: 'background-color 0.15s ease',
        });
        handle.addEventListener('mouseenter', () => {
          handle.style.backgroundColor = 'rgba(50, 45, 120, 0.25)';
        });
        handle.addEventListener('mouseleave', () => {
          handle.style.backgroundColor = 'transparent';
        });
        return handle;
      }
      const leftHandle = createResizeHandle('left');
      const rightHandle = createResizeHandle('right');

      modal.appendChild(header);
      modal.appendChild(content);
      modal.appendChild(leftHandle);
      modal.appendChild(rightHandle);

      document.body.appendChild(modal);

      // Animação de entrada
      requestAnimationFrame(() => {
        modal.style.opacity = '1';
        modal.style.transform = 'translateX(0)';
      });

      // === Helpers de interação (evita que o iframe "engula" o mousemove) ===
      let overlay = null;
      function beginInteraction(cursor) {
        modal.style.transition = 'none';
        iframe.style.pointerEvents = 'none';
        overlay = document.createElement('div');
        Object.assign(overlay.style, {
          position: 'fixed',
          inset: '0',
          zIndex: '2147483646',
          cursor: cursor,
          background: 'transparent',
        });
        document.body.appendChild(overlay);
      }
      function endInteraction() {
        iframe.style.pointerEvents = 'auto';
        modal.style.transition = 'opacity 0.25s ease, transform 0.25s ease';
        if (overlay) {
          overlay.remove();
          overlay = null;
        }
      }

      // --- Arrasto horizontal pelo cabeçalho ---
      header.addEventListener('mousedown', (event) => {
        if (event.button !== 0) return;
        if (event.target.closest('button')) return; // não arrasta ao usar o botão fechar
        event.preventDefault();

        const startX = event.clientX;
        const startLeft = parseInt(modal.style.left, 10) || 0;
        const w = modal.offsetWidth;
        header.style.cursor = 'grabbing';
        beginInteraction('grabbing');

        function onMove(e) {
          const newLeft = clampValue(
            startLeft + (e.clientX - startX),
            MODAL_GAP,
            Math.max(MODAL_GAP, window.innerWidth - w - MODAL_GAP)
          );
          modal.style.left = newLeft + 'px';
        }
        function onUp() {
          document.removeEventListener('mousemove', onMove);
          document.removeEventListener('mouseup', onUp);
          header.style.cursor = 'grab';
          endInteraction();
          localStorage.setItem('advableModalLeft', String(parseInt(modal.style.left, 10) || 0));
        }
        document.addEventListener('mousemove', onMove);
        document.addEventListener('mouseup', onUp);
      });

      // --- Redimensionamento horizontal pelas bordas ---
      function attachResize(handle, side) {
        handle.addEventListener('mousedown', (event) => {
          if (event.button !== 0) return;
          event.preventDefault();

          const startX = event.clientX;
          const startWidth = modal.offsetWidth;
          const startLeft = parseInt(modal.style.left, 10) || 0;
          const rightEdge = startLeft + startWidth;
          const maxWidth = getModalMaxWidth();
          beginInteraction('col-resize');

          function onMove(e) {
            const dx = e.clientX - startX;
            if (side === 'left') {
              // âncora na borda direita
              let newWidth = clampValue(startWidth - dx, MODAL_MIN_WIDTH, maxWidth);
              let newLeft = rightEdge - newWidth;
              if (newLeft < MODAL_GAP) {
                newLeft = MODAL_GAP;
                newWidth = clampValue(rightEdge - MODAL_GAP, MODAL_MIN_WIDTH, maxWidth);
              }
              modal.style.width = newWidth + 'px';
              modal.style.left = newLeft + 'px';
            } else {
              // âncora na borda esquerda
              const newWidth = clampValue(
                startWidth + dx,
                MODAL_MIN_WIDTH,
                Math.min(maxWidth, window.innerWidth - startLeft - MODAL_GAP)
              );
              modal.style.width = newWidth + 'px';
            }
          }
          function onUp() {
            document.removeEventListener('mousemove', onMove);
            document.removeEventListener('mouseup', onUp);
            endInteraction();
            localStorage.setItem('advableModalWidth', String(modal.offsetWidth));
            localStorage.setItem('advableModalLeft', String(parseInt(modal.style.left, 10) || 0));
          }
          document.addEventListener('mousemove', onMove);
          document.addEventListener('mouseup', onUp);
        });
      }
      attachResize(leftHandle, 'left');
      attachResize(rightHandle, 'right');

      // --- Mantém o modal dentro da viewport quando a janela é redimensionada ---
      const onWindowResize = () => {
        const maxWidth = getModalMaxWidth();
        const newWidth = clampValue(modal.offsetWidth, MODAL_MIN_WIDTH, maxWidth);
        modal.style.width = newWidth + 'px';
        const newLeft = clampValue(
          parseInt(modal.style.left, 10) || 0,
          MODAL_GAP,
          Math.max(MODAL_GAP, window.innerWidth - newWidth - MODAL_GAP)
        );
        modal.style.left = newLeft + 'px';
      };
      window.addEventListener('resize', onWindowResize);
      modal._advableCleanup = () => window.removeEventListener('resize', onWindowResize);

      // Fechar
      closeButton.addEventListener('click', () => {
        closeModal();
      });
    }

    function closeModal() {
      const modal = document.getElementById('advable-modal');
      if (!modal) return;

      if (typeof modal._advableCleanup === 'function') modal._advableCleanup();

      modal.style.transition = 'opacity 0.2s ease, transform 0.2s ease';
      modal.style.opacity = '0';
      modal.style.transform = 'translateX(16px)';

      setTimeout(() => {
        if (modal) modal.remove();
      }, 200);
    }

    // ===================================================================
    // === Painel ENCAIXADO (docked): sempre visível, reserva espaço   ===
    // ===================================================================
    // Diferente do modal flutuante (que sobrepõe a página), o painel encaixado
    // encolhe a própria página para a faixa à esquerda e ocupa a faixa à direita,
    // lado a lado — sem cobrir o conteúdo. É reaplicado a cada carga de página
    // enquanto `dockedMode` estiver ligado, então "aparece sempre".

    let savedHtmlInline = null; // estilos inline originais do <html> (p/ restaurar)
    let dockRemoveTimer = null; // timeout de remoção animada (cancelável)

    function dockMaxWidth() {
      return Math.min(900, Math.max(MODAL_MIN_WIDTH, Math.floor(window.innerWidth * 0.8)));
    }

    function getDockWidth() {
      let w = parseInt(localStorage.getItem('advableModalWidth'), 10);
      if (!w || Number.isNaN(w)) w = MODAL_DEFAULT_WIDTH;
      return clampValue(w, MODAL_MIN_WIDTH, dockMaxWidth());
    }

    function defaultClusterDisplay() {
      if (!cluster) return 'none';
      if (isWhatsApp) return currentChatInfo ? 'flex' : 'none';
      return 'flex';
    }

    function defaultRoute() {
      if (isWhatsApp && currentChatInfo) return chatHashRoutes().person;
      return '/dashboard';
    }

    // Reserva a faixa à direita encolhendo o <html>. Receita validada ao vivo no
    // PJe e no WhatsApp:
    //  • width: calc(100vw - W) → força a largura mesmo quando o site fixa
    //    width:100% no html/body (caso do WhatsApp, onde margin-right sozinho é
    //    ignorado);
    //  • margin-right: W → ocupa a faixa e ainda reflui sites de fluxo normal
    //    (a soma com a largura dá exatamente 100vw, sem scroll horizontal);
    //  • transform: translateZ(0) → torna o <html> bloco contenedor dos
    //    position:fixed/absolute da PRÓPRIA página, forçando barras fixas e o
    //    visualizador do PJe a refluírem p/ a largura reduzida.
    function applyDockReserve(width, animate) {
      const el = document.documentElement;
      if (savedHtmlInline === null) {
        savedHtmlInline = {
          width: el.style.width,
          minWidth: el.style.minWidth,
          maxWidth: el.style.maxWidth,
          marginRight: el.style.marginRight,
          transform: el.style.transform,
          transition: el.style.transition,
          boxSizing: el.style.boxSizing,
        };
      }
      const calc = `calc(100vw - ${width}px)`;
      el.style.setProperty('transition', animate ? 'width 0.18s ease, margin-right 0.18s ease' : 'none', 'important');
      el.style.setProperty('box-sizing', 'border-box', 'important');
      el.style.setProperty('min-width', '0', 'important');
      el.style.setProperty('max-width', calc, 'important');
      el.style.setProperty('width', calc, 'important');
      el.style.setProperty('margin-right', width + 'px', 'important');
      el.style.setProperty('transform', 'translateZ(0)', 'important');
    }

    function clearDockReserve() {
      const el = document.documentElement;
      ['width', 'min-width', 'max-width', 'margin-right', 'transform', 'box-sizing', 'transition'].forEach(
        (p) => el.style.removeProperty(p)
      );
      if (savedHtmlInline) {
        const s = savedHtmlInline;
        if (s.width) el.style.width = s.width;
        if (s.minWidth) el.style.minWidth = s.minWidth;
        if (s.maxWidth) el.style.maxWidth = s.maxWidth;
        if (s.marginRight) el.style.marginRight = s.marginRight;
        if (s.transform) el.style.transform = s.transform;
        if (s.boxSizing) el.style.boxSizing = s.boxSizing;
        if (s.transition) el.style.transition = s.transition;
        savedHtmlInline = null;
      }
    }

    function enterDockedMode(hashRoute) {
      closeModal(); // garante que o flutuante não conviva com o encaixado
      if (cluster) cluster.style.display = 'none';
      createDockedPanel(hashRoute || defaultRoute());
    }

    function exitDockedMode() {
      removeDockedPanel();
      if (cluster) cluster.style.display = defaultClusterDisplay();
    }

    function createDockedPanel(hashRoute = '/dashboard') {
      // Cancela uma remoção animada pendente (toggle rápido) para não limpar a
      // reserva logo após reaplicá-la.
      if (dockRemoveTimer) {
        clearTimeout(dockRemoveTimer);
        dockRemoveTimer = null;
        const stale = document.getElementById('advable-docked-panel');
        if (stale) stale.remove();
      }
      if (document.getElementById('advable-docked-panel')) return;

      const width = getDockWidth();
      applyDockReserve(width, true);

      const panel = document.createElement('div');
      panel.id = 'advable-docked-panel';
      Object.assign(panel.style, {
        all: 'unset',
        position: 'fixed',
        top: '0',
        left: `calc(100vw - ${width}px)`,
        width: width + 'px',
        height: '100vh',
        backgroundColor: '#ffffff',
        zIndex: '2147483647',
        boxShadow: '-6px 0 24px rgba(0, 0, 0, 0.10)',
        borderLeft: '1px solid #e6e8ee',
        overflow: 'hidden',
        opacity: '0',
        transform: 'translateX(16px)',
        transition: 'opacity 0.22s ease, transform 0.22s ease',
        display: 'flex',
        flexDirection: 'column',
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
        fontSize: '14px',
        lineHeight: '1.5',
        color: '#212529',
        boxSizing: 'border-box',
      });

      // === Cabeçalho ===
      const header = document.createElement('div');
      Object.assign(header.style, {
        all: 'unset',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '12px 16px',
        borderBottom: '1px solid #ececf3',
        backgroundColor: '#ffffff',
        flexShrink: '0',
        boxSizing: 'border-box',
        minHeight: '56px',
        userSelect: 'none',
      });

      const headerLeft = document.createElement('div');
      Object.assign(headerLeft.style, {
        all: 'unset',
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
      });

      const logoIcon = document.createElement('img');
      logoIcon.src = browser.runtime.getURL('/icon48.png');
      logoIcon.alt = 'Advable';
      Object.assign(logoIcon.style, {
        width: '22px',
        height: '22px',
        display: 'block',
        pointerEvents: 'none',
      });

      const title = document.createElement('span');
      title.textContent = 'Advable';
      Object.assign(title.style, {
        all: 'unset',
        fontSize: '15px',
        fontWeight: '600',
        color: '#212529',
        pointerEvents: 'none',
      });

      headerLeft.appendChild(logoIcon);
      headerLeft.appendChild(title);

      const headerControls = document.createElement('div');
      Object.assign(headerControls.style, {
        all: 'unset',
        display: 'flex',
        alignItems: 'center',
        gap: '4px',
      });

      function headerIconButton(svg, label, danger) {
        const b = document.createElement('button');
        b.title = label;
        b.innerHTML = svg;
        Object.assign(b.style, {
          all: 'unset',
          width: '32px',
          height: '32px',
          background: 'transparent',
          color: '#6c757d',
          border: 'none',
          borderRadius: '8px',
          cursor: 'pointer',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          transition: 'background-color 0.2s, color 0.2s',
          boxSizing: 'border-box',
        });
        b.addEventListener('mouseenter', () => {
          b.style.backgroundColor = danger ? 'rgba(220, 53, 69, 0.1)' : 'rgba(22, 34, 63, 0.08)';
          b.style.color = danger ? '#dc3545' : '#16223f';
        });
        b.addEventListener('mouseleave', () => {
          b.style.backgroundColor = 'transparent';
          b.style.color = '#6c757d';
        });
        return b;
      }

      // Desencaixar: volta ao modo flutuante (desliga dockedMode e devolve a
      // largura cheia à página). É o "não quero agora" — reabrir é pelo menu.
      const unpinButton = headerIconButton(
        '<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" fill="currentColor" viewBox="0 0 16 16"><path d="M8.636 3.5a.5.5 0 0 0-.5-.5H1.5A1.5 1.5 0 0 0 0 4.5v10A1.5 1.5 0 0 0 1.5 16h10a1.5 1.5 0 0 0 1.5-1.5V7.864a.5.5 0 0 0-1 0V14.5a.5.5 0 0 1-.5.5h-10a.5.5 0 0 1-.5-.5v-10a.5.5 0 0 1 .5-.5h6.636a.5.5 0 0 0 .5-.5"/><path d="M16 .5a.5.5 0 0 0-.5-.5h-5a.5.5 0 0 0 0 1h3.793L6.146 9.146a.5.5 0 1 0 .708.708L15 1.707V5.5a.5.5 0 0 0 1 0z"/></svg>',
        'Desencaixar (voltar ao modo flutuante)',
        false
      );

      headerControls.appendChild(unpinButton);
      header.appendChild(headerLeft);
      header.appendChild(headerControls);

      // === Conteúdo (iframe do popup) ===
      const content = document.createElement('div');
      Object.assign(content.style, {
        all: 'unset',
        flex: '1',
        overflow: 'hidden',
        display: 'block',
        position: 'relative',
      });

      const iframe = document.createElement('iframe');
      iframe.src = browser.runtime.getURL('/popup.html#' + (hashRoute || '/dashboard'));
      Object.assign(iframe.style, {
        all: 'unset',
        width: '100%',
        height: '100%',
        border: 'none',
        display: 'block',
        backgroundColor: 'white',
      });
      content.appendChild(iframe);

      // === Alça de redimensionamento (apenas borda esquerda) ===
      const leftHandle = document.createElement('div');
      Object.assign(leftHandle.style, {
        all: 'unset',
        position: 'absolute',
        top: '0',
        bottom: '0',
        left: '0',
        width: '7px',
        cursor: 'col-resize',
        zIndex: '2',
        backgroundColor: 'transparent',
        transition: 'background-color 0.15s ease',
      });
      leftHandle.addEventListener('mouseenter', () => {
        leftHandle.style.backgroundColor = 'rgba(50, 45, 120, 0.25)';
      });
      leftHandle.addEventListener('mouseleave', () => {
        leftHandle.style.backgroundColor = 'transparent';
      });

      panel.appendChild(header);
      panel.appendChild(content);
      panel.appendChild(leftHandle);
      document.body.appendChild(panel);

      // Animação de entrada
      requestAnimationFrame(() => {
        panel.style.opacity = '1';
        panel.style.transform = 'translateX(0)';
      });

      // Evita que o iframe "engula" o mousemove durante o resize.
      let overlay = null;
      function beginInteraction(cursor) {
        iframe.style.pointerEvents = 'none';
        panel.style.transition = 'none';
        overlay = document.createElement('div');
        Object.assign(overlay.style, {
          position: 'fixed',
          inset: '0',
          zIndex: '2147483646',
          cursor: cursor,
          background: 'transparent',
        });
        document.body.appendChild(overlay);
      }
      function endInteraction() {
        iframe.style.pointerEvents = 'auto';
        panel.style.transition = 'opacity 0.22s ease, transform 0.22s ease';
        if (overlay) {
          overlay.remove();
          overlay = null;
        }
      }

      // Redimensiona ancorando a borda direita (colada na viewport); a largura
      // aumenta arrastando a alça esquerda para a esquerda. A margem do <html>
      // acompanha em tempo real para a página refluir junto.
      leftHandle.addEventListener('mousedown', (event) => {
        if (event.button !== 0) return;
        event.preventDefault();
        const startX = event.clientX;
        const startWidth = panel.offsetWidth;
        beginInteraction('col-resize');

        function onMove(e) {
          const dx = e.clientX - startX;
          const newWidth = clampValue(startWidth - dx, MODAL_MIN_WIDTH, dockMaxWidth());
          panel.style.width = newWidth + 'px';
          panel.style.left = `calc(100vw - ${newWidth}px)`;
          applyDockReserve(newWidth, false);
        }
        function onUp() {
          document.removeEventListener('mousemove', onMove);
          document.removeEventListener('mouseup', onUp);
          endInteraction();
          localStorage.setItem('advableModalWidth', String(panel.offsetWidth));
        }
        document.addEventListener('mousemove', onMove);
        document.addEventListener('mouseup', onUp);
      });

      // Mantém o painel/coluna dentro da viewport ao redimensionar a janela.
      const onWindowResize = () => {
        const w = clampValue(panel.offsetWidth, MODAL_MIN_WIDTH, dockMaxWidth());
        panel.style.width = w + 'px';
        panel.style.left = `calc(100vw - ${w}px)`;
        applyDockReserve(w, false);
      };
      window.addEventListener('resize', onWindowResize);
      panel._cleanup = () => window.removeEventListener('resize', onWindowResize);

      unpinButton.addEventListener('click', () => {
        // Desliga o modo encaixado (persiste); o onChanged faz a transição de
        // volta ao flutuante e devolve a largura cheia à página.
        try {
          browser.storage.local.set({ dockedMode: false });
        } catch (e) {
          /* storage indisponível */
        }
      });
    }

    function removeDockedPanel() {
      const el = document.documentElement;
      const p = document.getElementById('advable-docked-panel');
      if (p) {
        if (typeof p._cleanup === 'function') p._cleanup();
        p.id = ''; // libera o id para uma reabertura imediata, se houver
        p.style.transition = 'opacity 0.18s ease, transform 0.18s ease';
        p.style.opacity = '0';
        p.style.transform = 'translateX(16px)';
      }
      // Devolve a largura cheia com animação e restaura os estilos no fim.
      el.style.setProperty('transition', 'width 0.18s ease, margin-right 0.18s ease', 'important');
      el.style.setProperty('width', '100vw', 'important');
      el.style.setProperty('max-width', '100vw', 'important');
      el.style.setProperty('margin-right', '0px', 'important');
      if (dockRemoveTimer) clearTimeout(dockRemoveTimer);
      dockRemoveTimer = setTimeout(() => {
        dockRemoveTimer = null;
        if (p) p.remove();
        clearDockReserve();
      }, 200);
    }

    // === Inicialização do modo encaixado ===
    if (browser && browser.storage && browser.storage.local) {
      browser.storage.local
        .get('dockedMode')
        .then((res) => {
          dockedMode = !!(res && res.dockedMode);
          if (dockedMode) enterDockedMode(defaultRoute());
        })
        .catch(() => {
          /* storage indisponível */
        });
    }

    if (browser && browser.storage && browser.storage.onChanged) {
      browser.storage.onChanged.addListener((changes, area) => {
        if (area !== 'local' || !changes.dockedMode) return;
        const nv = !!changes.dockedMode.newValue;
        if (nv === dockedMode) return;
        dockedMode = nv;
        if (dockedMode) enterDockedMode(defaultRoute());
        else exitDockedMode();
      });
    }
  },
});
