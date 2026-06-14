export default defineContentScript({
  matches: ['<all_urls>'],

  main() {
    // === Listener para GET_HTML_CONTENT ===
    browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
      if (message.type === 'GET_HTML_CONTENT') {
        sendResponse({ html: document.documentElement.innerHTML });
      }
      return true;
    });

    // === WhatsApp chat tracking ===
    let lastChatId = null;

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

      console.log('Chat alterado notificado:', chatInfo.chatName, chatInfo.chatId);
    }

    function getWhatsAppChatInfo() {
      if (!window.location.href.includes('web.whatsapp.com')) return null;

      let chatId = '';

      const chatElement = document.querySelector('[data-id]');
      if (chatElement) {
        const rawChatId = chatElement.getAttribute('data-id');

        const match = rawChatId.match(/(true|false)_(.+?)_/);
        if (match && match[2]) {
          chatId = match[2];
        }

        if (chatId === lastChatId) {
          return null;
        }

        lastChatId = chatId;

        const chatHeader = document.querySelector('#main header');
        const chatName = chatHeader
          ? chatHeader.innerText.split('\n')[0] || 'Chat'
          : 'Chat';

        return { chatId, chatName };
      }

      return null;
    }

    // Listener para GET_WHATSAPP_CHAT_ID
    browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
      if (message.type === 'GET_WHATSAPP_CHAT_ID') {
        const info = getWhatsAppChatInfo();
        sendResponse(info);
      }
      return true;
    });

    // === Verificação de URL ===
    const pattern = /(pje.*jus\.br|jus\.br.*pje|web\.whatsapp\.com)/;
    const currentUrl = window.location.href;
    const isAllowedDomain = pattern.test(currentUrl);

    if (!isAllowedDomain) return;

    // Evita duplicação do ícone
    if (document.getElementById('advable-floating-icon')) return;

    // === Cria o botão flutuante (FAB circular fixo) ===
    const floatingIcon = document.createElement('div');
    floatingIcon.id = 'advable-floating-icon';

    floatingIcon.innerHTML = `
      <img src="${browser.runtime.getURL('/icon48.png')}" alt="Advable" style="width: 28px; height: 28px; display: block; pointer-events: none;" />
    `;

    Object.assign(floatingIcon.style, {
      all: 'unset',
      position: 'fixed',
      bottom: '24px',
      right: '24px',
      width: '56px',
      height: '56px',
      boxSizing: 'border-box',
      backgroundColor: '#FFFFFF',
      zIndex: '2147483646',
      cursor: 'pointer',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      borderRadius: '50%',
      border: '1px solid rgba(50, 45, 120, 0.12)',
      boxShadow: '0 6px 20px rgba(50, 45, 120, 0.35)',
      transition: 'box-shadow 0.18s ease',
    });

    // Botão para esconder o FAB (aparece apenas no hover)
    const hideButton = document.createElement('span');
    hideButton.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" fill="currentColor" viewBox="0 0 16 16">
        <path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708"/>
      </svg>
    `;
    Object.assign(hideButton.style, {
      position: 'absolute',
      top: '-2px',
      right: '-2px',
      width: '18px',
      height: '18px',
      borderRadius: '50%',
      backgroundColor: '#322d78',
      color: '#FFFFFF',
      cursor: 'pointer',
      display: 'none',
      justifyContent: 'center',
      alignItems: 'center',
      boxShadow: '0 2px 6px rgba(0, 0, 0, 0.3)',
    });
    floatingIcon.appendChild(hideButton);
    hideButton.addEventListener('click', (event) => {
      event.stopPropagation();
      floatingIcon.style.display = 'none';
    });

    // Efeito de hover (apenas realça a sombra e revela o "x") — sem escalar a logo
    floatingIcon.addEventListener('mouseover', () => {
      floatingIcon.style.boxShadow = '0 12px 32px rgba(50, 45, 120, 0.5)';
      hideButton.style.display = 'flex';
    });

    floatingIcon.addEventListener('mouseout', () => {
      floatingIcon.style.boxShadow = '0 6px 20px rgba(50, 45, 120, 0.35)';
      hideButton.style.display = 'none';
    });

    document.body.appendChild(floatingIcon);

    // Evento de clique para abrir o modal
    floatingIcon.addEventListener('click', () => {
      if (document.getElementById('advable-modal')) return;
      createModal();
    });

    // === Observadores de mudanças ===
    let lastUrl = location.href;
    new MutationObserver(() => {
      const url = location.href;
      if (url !== lastUrl) {
        lastUrl = url;
        if (url.includes('web.whatsapp.com')) {
          setTimeout(() => {
            const info = getWhatsAppChatInfo();
            if (info) {
              notifyChatChange(info);
            }
          }, 1000);
        }
      }
    }).observe(document, { subtree: true, childList: true });

    document.addEventListener(
      'click',
      () => {
        if (window.location.href.includes('web.whatsapp.com')) {
          setTimeout(() => {
            const info = getWhatsAppChatInfo();
            if (info) {
              notifyChatChange(info);
            }
          }, 500);
        }
      },
      true
    );

    const chatListObserver = new MutationObserver(() => {
      if (window.location.href.includes('web.whatsapp.com')) {
        const info = getWhatsAppChatInfo();
        if (info) {
          notifyChatChange(info);
          console.log('Chat alterado:', info.chatId);
        }
      }
    });

    const mainPanel = document.querySelector('#main');
    if (mainPanel) {
      chatListObserver.observe(mainPanel, {
        childList: true,
        subtree: true,
      });
    }

    const observer = new MutationObserver(() => {
      if (window.location.href.includes('web.whatsapp.com')) {
        const chatInfo = getWhatsAppChatInfo();
        if (chatInfo && chatInfo.chatId) {
          notifyChatChange({
            chatId: chatInfo.chatId,
            chatName: chatInfo.chatName,
          });
        }
      }
    });

    const targetNode = document.querySelector('#main') || document.body;
    observer.observe(targetNode, { childList: true, subtree: true });

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

    function createModal() {
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
        color: '#322d78',
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
      iframe.src = browser.runtime.getURL('/popup.html#/dashboard');
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
  },
});
