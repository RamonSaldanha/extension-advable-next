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

    // === Cria o ícone flutuante ===
    const floatingIcon = document.createElement('div');
    floatingIcon.id = 'advable-floating-icon';

    floatingIcon.innerHTML = `
      <img src="${browser.runtime.getURL('/icon16.png')}" alt="Advable Icon" style="margin-right: 5px;" />
      <span id="advable-text" style="display: none;">Assistente</span>
    `;

    Object.assign(floatingIcon.style, {
      all: 'unset',
      position: 'fixed',
      bottom: '25%',
      right: '0',
      width: '30px',
      backgroundColor: '#FFF',
      zIndex: '9999',
      cursor: 'pointer',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      borderRadius: '8px 0 0 8px',
      transition: 'width 0.3s ease-in-out',
      padding: '10px',
      fontFamily: 'Arial, sans-serif',
      fontSize: '14px',
      boxShadow: '0 2px 10px rgba(0, 0, 0, 0.3)',
    });

    // Botão para remover o ícone flutuante
    const hideButton = document.createElement('span');
    hideButton.textContent = 'X';
    Object.assign(hideButton.style, {
      position: 'absolute',
      top: '0',
      right: '0',
      cursor: 'pointer',
      color: '#333',
      fontSize: '12px',
      padding: '2px',
    });
    floatingIcon.appendChild(hideButton);
    hideButton.addEventListener('click', (event) => {
      event.stopPropagation();
      floatingIcon.style.display = 'none';
    });

    // Efeito de hover
    floatingIcon.addEventListener('mouseover', () => {
      floatingIcon.style.width = '100px';
      document.getElementById('advable-text').style.display = 'inline';
    });

    floatingIcon.addEventListener('mouseout', () => {
      floatingIcon.style.width = '30px';
      document.getElementById('advable-text').style.display = 'none';
    });

    document.body.appendChild(floatingIcon);

    // Restaura posição salva
    const savedPosition = localStorage.getItem('advableIconPosition');
    if (savedPosition) {
      floatingIcon.style.bottom = savedPosition;
    }

    // Permite arrastar o ícone verticalmente
    let isDragging = false;
    floatingIcon.addEventListener('mousedown', (event) => {
      if (event.target === hideButton) return;
      isDragging = true;
    });
    document.addEventListener('mousemove', (event) => {
      if (isDragging) {
        let newBottom = window.innerHeight - event.clientY;
        const iconHeight = floatingIcon.offsetHeight;
        if (newBottom < 0) newBottom = 0;
        if (newBottom > window.innerHeight - iconHeight) newBottom = window.innerHeight - iconHeight;
        floatingIcon.style.bottom = newBottom + 'px';
        localStorage.setItem('advableIconPosition', newBottom + 'px');
      }
    });

    document.addEventListener('mouseup', () => {
      isDragging = false;
    });

    // Evento de clique para abrir o offcanvas
    floatingIcon.addEventListener('click', () => {
      console.log('Ícone clicado');
      if (document.getElementById('advable-offcanvas')) return;
      createOffcanvas();
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

    // === Funções para gerenciar offcanvas ===
    function getOffcanvasMode() {
      return localStorage.getItem('advableOffcanvasMode') || 'floating';
    }

    function setOffcanvasMode(mode) {
      localStorage.setItem('advableOffcanvasMode', mode);
    }

    function createOffcanvas() {
      const mode = getOffcanvasMode();

      const offcanvas = document.createElement('div');
      offcanvas.id = 'advable-offcanvas';
      offcanvas.className = 'advable-offcanvas';
      Object.assign(offcanvas.style, {
        all: 'unset',
        position: 'fixed',
        top: '0',
        right: '0',
        width: '470px',
        height: '100vh',
        backgroundColor: 'white',
        zIndex: '2147483647',
        boxShadow: '-2px 0 10px rgba(0, 0, 0, 0.2)',
        transform: 'translateX(100%)',
        transition: 'transform 0.3s ease-in-out',
        display: 'flex',
        flexDirection: 'column',
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
        fontSize: '14px',
        lineHeight: '1.5',
        color: '#212529',
      });

      // Cabeçalho
      const header = document.createElement('div');
      Object.assign(header.style, {
        all: 'unset',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '12px 20px',
        borderBottom: '1px solid #dee2e6',
        background: '#f8f9fa',
        flexShrink: '0',
        boxSizing: 'border-box',
        minHeight: '60px',
      });

      const headerLeft = document.createElement('div');
      Object.assign(headerLeft.style, {
        all: 'unset',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        color: '#212529',
        fontSize: '16px',
        fontWeight: '600',
      });

      const logoIcon = document.createElement('img');
      logoIcon.src = browser.runtime.getURL('/icon48.png');
      logoIcon.alt = 'Logo';
      logoIcon.className = 'tab-icon logo-icon';
      Object.assign(logoIcon.style, {
        width: '24px',
        height: '24px',
        display: 'flex',
        alignItems: 'center',
      });

      const title = document.createElement('span');
      title.textContent = 'Detalhes do Processo';
      Object.assign(title.style, {
        all: 'unset',
        fontSize: '16px',
        fontWeight: '600',
        color: '#212529',
      });

      headerLeft.appendChild(logoIcon);
      headerLeft.appendChild(title);

      const headerControls = document.createElement('div');
      Object.assign(headerControls.style, {
        all: 'unset',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
      });

      // Botão de modo (fixo/flutuante)
      const pinFilledSVG = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
        <path d="M9.828.722a.5.5 0 0 1 .354.146l4.95 4.95a.5.5 0 0 1 0 .707c-.48.48-1.072.588-1.503.588-.177 0-.335-.018-.46-.039l-3.134 3.134a6 6 0 0 1 .16 1.013c.046.702-.032 1.687-.72 2.375a.5.5 0 0 1-.707 0l-2.829-2.828-3.182 3.182c-.195.195-1.219.902-1.414.707s.512-1.22.707-1.414l3.182-3.182-2.828-2.829a.5.5 0 0 1 0-.707c.688-.688 1.673-.767 2.375-.72a6 6 0 0 1 1.013.16l3.134-3.133a3 3 0 0 1-.04-.461c0-.43.108-1.022.589-1.503a.5.5 0 0 1 .353-.146"/>
      </svg>`;

      const pinOutlineSVG = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
        <path d="M9.828.722a.5.5 0 0 1 .354.146l4.95 4.95a.5.5 0 0 1 0 .707c-.48.48-1.072.588-1.503.588-.177 0-.335-.018-.46-.039l-3.134 3.134a6 6 0 0 1 .16 1.013c.046.702-.032 1.687-.72 2.375a.5.5 0 0 1-.707 0l-2.829-2.828-3.182 3.182c-.195.195-1.219.902-1.414.707s.512-1.22.707-1.414l3.182-3.182-2.828-2.829a.5.5 0 0 1 0-.707c.688-.688 1.673-.767 2.375-.72a6 6 0 0 1 1.013.16l3.134-3.133a3 3 0 0 1-.04-.461c0-.43.108-1.022.589-1.503a.5.5 0 0 1 .353-.146m.122 2.112v-.002zm0-.002v.002a.5.5 0 0 1-.122.51L6.293 6.878a.5.5 0 0 1-.511.12H5.78l-.014-.004a5 5 0 0 0-.288-.076 5 5 0 0 0-.765-.116c-.422-.028-.836.008-1.175.15l5.51 5.509c.141-.34.177-.753.149-1.175a5 5 0 0 0-.192-1.054l-.004-.013v-.001a.5.5 0 0 1 .12-.512l3.536-3.535a.5.5 0 0 1 .532-.115l.096.022c.087.017.208.034.344.034q.172.002.343-.04L9.927 2.028q-.042.172-.04.343a1.8 1.8 0 0 0 .062.46z"/>
      </svg>`;

      const modeButton = document.createElement('button');
      modeButton.innerHTML = mode === 'fixed' ? pinFilledSVG : pinOutlineSVG;
      modeButton.title =
        mode === 'fixed'
          ? 'Modo Fixo (clique para flutuante)'
          : 'Modo Flutuante (clique para fixo)';
      Object.assign(modeButton.style, {
        all: 'unset',
        width: '32px',
        height: '32px',
        background: 'transparent',
        color: '#6c757d',
        border: 'none',
        borderRadius: '6px',
        cursor: 'pointer',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        transition: 'background-color 0.2s, color 0.2s',
        boxSizing: 'border-box',
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
        borderRadius: '6px',
        cursor: 'pointer',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        transition: 'background-color 0.2s, color 0.2s',
        boxSizing: 'border-box',
      });

      // Hover effects
      modeButton.addEventListener('mouseenter', () => {
        modeButton.style.backgroundColor = 'rgba(108, 117, 125, 0.1)';
        modeButton.style.color = '#495057';
      });
      modeButton.addEventListener('mouseleave', () => {
        modeButton.style.backgroundColor = 'transparent';
        modeButton.style.color = '#6c757d';
      });

      closeButton.addEventListener('mouseenter', () => {
        closeButton.style.backgroundColor = 'rgba(220, 53, 69, 0.1)';
        closeButton.style.color = '#dc3545';
      });
      closeButton.addEventListener('mouseleave', () => {
        closeButton.style.backgroundColor = 'transparent';
        closeButton.style.color = '#6c757d';
      });

      headerControls.appendChild(modeButton);
      headerControls.appendChild(closeButton);
      header.appendChild(headerLeft);
      header.appendChild(headerControls);

      // Conteúdo com iframe
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
      offcanvas.appendChild(header);
      offcanvas.appendChild(content);

      document.body.appendChild(offcanvas);

      applyOffcanvasMode(mode, offcanvas);

      setTimeout(() => {
        offcanvas.style.transform = 'translateX(0)';
      }, 10);

      // Event listeners
      modeButton.addEventListener('click', () => {
        const currentMode = getOffcanvasMode();
        const newMode = currentMode === 'fixed' ? 'floating' : 'fixed';
        setOffcanvasMode(newMode);
        applyOffcanvasMode(newMode, offcanvas);

        modeButton.innerHTML = newMode === 'fixed' ? pinFilledSVG : pinOutlineSVG;
        modeButton.title =
          newMode === 'fixed'
            ? 'Modo Fixo (clique para flutuante)'
            : 'Modo Flutuante (clique para fixo)';
      });

      closeButton.addEventListener('click', () => {
        closeOffcanvas();
      });
    }

    function applyOffcanvasMode(mode, offcanvas) {
      const body = document.body;

      if (mode === 'fixed') {
        body.style.marginRight = '470px';
        body.style.transition = 'margin-right 0.3s ease-in-out';
        body.classList.add('advbl-offcanvas-fixed-mode');

        // WhatsApp Web: reduz a largura
        if (window.location.href.includes('web.whatsapp.com')) {
          const whatsappApp = document.querySelector('#app');
          if (whatsappApp) {
            const currentWidth = whatsappApp.offsetWidth;
            const newWidth = Math.max(currentWidth - 470, 300);
            whatsappApp.style.width = newWidth + 'px';
            whatsappApp.style.transition = 'width 0.3s ease-in-out';
            whatsappApp.setAttribute('data-advable-adjusted', 'true');
            whatsappApp.setAttribute('data-advable-original-width', currentWidth + 'px');
          }

          body.style.marginRight = '470px';
          body.setAttribute('data-advable-adjusted', 'true');
        }

        // PJE: ajusta contêineres específicos
        if (window.location.href.includes('pje') && window.location.href.includes('jus.br')) {
          const pjeContainers = document.querySelectorAll(
            '.ui-layout-center, .ui-layout-container, #content, .main-content'
          );
          pjeContainers.forEach((container) => {
            if (container && !container.id.includes('advable')) {
              container.style.marginRight = '470px';
              container.style.transition = 'margin-right 0.3s ease-in-out';
              container.setAttribute('data-advable-adjusted', 'true');
            }
          });
        }

        // Ajusta elementos com position: fixed
        const fixedElements = document.querySelectorAll(
          '[style*="position: fixed"], [style*="position:fixed"]'
        );
        fixedElements.forEach((el) => {
          if (!el.id.includes('advable') && !el.getAttribute('data-advable-adjusted')) {
            const computedStyle = window.getComputedStyle(el);
            if (computedStyle.position === 'fixed') {
              el.style.marginRight = '470px';
              el.style.transition = 'margin-right 0.3s ease-in-out';
              el.setAttribute('data-advable-adjusted', 'true');
            }
          }
        });

        const possibleFixedSelectors = [
          '.fixed',
          '.position-fixed',
          '.navbar-fixed-top',
          '.navbar-fixed-bottom',
          'header',
          'nav',
          '.header',
          '.navigation',
          '.sidebar',
        ];

        possibleFixedSelectors.forEach((selector) => {
          const elements = document.querySelectorAll(selector);
          elements.forEach((el) => {
            if (!el.id.includes('advable') && !el.getAttribute('data-advable-adjusted')) {
              const computedStyle = window.getComputedStyle(el);
              if (computedStyle.position === 'fixed' || computedStyle.position === 'sticky') {
                el.style.marginRight = '470px';
                el.style.transition = 'margin-right 0.3s ease-in-out';
                el.setAttribute('data-advable-adjusted', 'true');
              }
            }
          });
        });
      } else {
        // Modo flutuante
        body.style.marginRight = '0';
        body.classList.remove('advbl-offcanvas-fixed-mode');

        const adjustedElements = document.querySelectorAll('[data-advable-adjusted="true"]');
        adjustedElements.forEach((el) => {
          el.style.marginRight = '0';

          if (el.getAttribute('data-advable-original-width')) {
            el.style.width = el.getAttribute('data-advable-original-width');
            el.removeAttribute('data-advable-original-width');
          } else {
            el.style.width = '';
          }

          el.removeAttribute('data-advable-adjusted');
        });

        console.log('Modo flutuante ativado - ajustes removidos');
      }
    }

    function closeOffcanvas() {
      const offcanvas = document.getElementById('advable-offcanvas');

      if (offcanvas) {
        offcanvas.style.transform = 'translateX(100%)';

        setTimeout(() => {
          if (offcanvas) offcanvas.remove();

          const body = document.body;
          body.style.marginRight = '0';
          body.classList.remove('advbl-offcanvas-fixed-mode');

          const adjustedElements = document.querySelectorAll('[data-advable-adjusted="true"]');
          adjustedElements.forEach((el) => {
            el.style.marginRight = '0';

            if (el.getAttribute('data-advable-original-width')) {
              el.style.width = el.getAttribute('data-advable-original-width');
              el.removeAttribute('data-advable-original-width');
            } else {
              el.style.width = '';
            }

            el.removeAttribute('data-advable-adjusted');
          });
        }, 300);
      }
    }
  },
});
