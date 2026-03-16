<!-- src/views/WhatsApp.vue -->
<template>
  <Layout>
    <template #header>
      <DefaultHeader />
    </template>
    
    <div class="whatsapp-crm-container">
      <!-- Instruções simples e objetivas -->
      <div class="whatsapp-info">
        <div class="text-center">
          <i class="bi bi-whatsapp fs-1 text-success mb-4"></i>
          <h2 class="mb-4 text-success">Integração WhatsApp</h2>
          
          <div class="instructions-card">
            <h4 class="mb-4">Como usar:</h4>
            <div class="steps">
              <div class="step">
                <span class="step-number">1</span>
                <a href="https://web.whatsapp.com" target="_blank" class="step-text">Abra o WhatsApp Web</a>
              </div>
              <div class="step">
                <span class="step-number">2</span>
                <span class="step-text">Abra esta extensão</span>
              </div>
              <div class="step">
                <span class="step-number">3</span>
                <span class="step-text">Selecione um chat</span>
              </div>
            </div>
            
            <!-- Status de rastreamento -->
            <div class="mt-4">
              <div class="status-indicator" :class="{ 'active': isListening }">
                <i class="bi bi-broadcast me-2"></i>
                <span v-if="isListening">
                  Rastreando mudanças de chat... 
                  <small class="text-success">Ativo</small>
                </span>
                <span v-else>
                  Aguardando conexão...
                  <small class="text-muted">Inativo</small>
                </span>
              </div>
            </div>
            
            <!-- Chat atual selecionado -->
            <div v-if="currentChat" class="mt-3">
              <div class="current-chat-info">
                <i class="bi bi-chat-dots me-2 text-primary"></i>
                <strong>Chat atual:</strong> {{ currentChat.chatName }}
                <br>
                <small class="text-muted">ID: {{ currentChat.chatId }}</small>
              </div>
            </div>
            
            <div class="mt-4">
              <p class="text-muted">
                Quando você selecionar um chat no WhatsApp, será redirecionado automaticamente para a aba de clientes.
              </p>
              
              <!-- Botão de teste -->
              <div class="mt-3">
                <button 
                  @click="testWhatsAppConnection" 
                  class="btn btn-outline-primary btn-sm me-2"
                  :disabled="!isListening"
                >
                  <i class="bi bi-broadcast me-1"></i>
                  Testar Conexão WhatsApp
                </button>
                
                <button 
                  @click="navigateToClients" 
                  class="btn btn-outline-secondary btn-sm"
                >
                  <i class="bi bi-people me-1"></i>
                  Ir para Clientes
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </Layout>
</template>

<script setup>
import Layout from '@/components/Layout.vue';
import DefaultHeader from '@/components/DefaultHeader.vue';
import { ref, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';

const router = useRouter();
const isListening = ref(false);
const currentChat = ref(null);

// Função para escutar mudanças de chat do WhatsApp
function setupWhatsAppListener() {
  // Escuta mensagens do content script
  const messageListener = (event) => {
    if (event.data && event.data.type === 'WHATSAPP_CHAT_CHANGED') {
      const { chatId, chatName } = event.data;
      
      if (chatId && chatName) {
        currentChat.value = { chatId, chatName };
        console.log('Chat selecionado:', chatName, 'ID:', chatId);
        
        // Redireciona automaticamente para a página de clientes com parâmetros
        router.push(`/person/search/${encodeURIComponent(chatId)}/${encodeURIComponent(chatName)}`);
      }
    }
  };

  // Adiciona listener para mensagens
  window.addEventListener('message', messageListener);
  isListening.value = true;

  return () => {
    window.removeEventListener('message', messageListener);
    isListening.value = false;
  };
}

// Função para verificar se o usuário está no WhatsApp Web
async function checkWhatsAppTab() {
  // Verifica se há abas do WhatsApp abertas
  if (typeof browser !== 'undefined' && browser.tabs) {
    try {
      const tabs = await browser.tabs.query({ url: '*://web.whatsapp.com/*' });
      if (tabs.length > 0) {
        console.log('WhatsApp Web detectado em', tabs.length, 'aba(s)');

        // Injeta script para comunicação se necessário
        for (const tab of tabs) {
          try {
            const response = await browser.tabs.sendMessage(tab.id, { type: 'CHECK_CHAT_STATUS' });
            if (response && response.chatId) {
              currentChat.value = response;
              router.push(`/person/search/${encodeURIComponent(response.chatId)}/${encodeURIComponent(response.chatName)}`);
            }
          } catch (e) {
            // Tab may not have content script loaded
          }
        }
      }
    } catch (error) {
      console.error('Erro ao verificar aba do WhatsApp:', error);
    }
  }
}

// Função para escutar mensagens do background script
function setupBackgroundListener() {
  if (typeof browser !== 'undefined' && browser.runtime) {
    const backgroundListener = (message, sender, sendResponse) => {
      if (message.type === 'WHATSAPP_CHAT_CHANGED') {
        const { chatId, chatName } = message;
        
        if (chatId && chatName) {
          currentChat.value = { chatId, chatName };
          console.log('Chat alterado via background:', chatName);
          
          // Redireciona para a página de clientes com parâmetros
          router.push(`/person/search/${encodeURIComponent(chatId)}/${encodeURIComponent(chatName)}`);
        }
      }
    };

    browser.runtime.onMessage.addListener(backgroundListener);
    
    return () => {
      browser.runtime.onMessage.removeListener(backgroundListener);
    };
  }
}

// Função para testar conexão com WhatsApp
async function testWhatsAppConnection() {
  if (typeof browser !== 'undefined' && browser.tabs) {
    try {
      const tabs = await browser.tabs.query({ url: '*://web.whatsapp.com/*' });
      if (tabs.length > 0) {
        alert(`WhatsApp Web detectado em ${tabs.length} aba(s)!\n\nRastreamento ativo: ${isListening.value ? 'Sim' : 'Não'}`);

        // Tenta obter informações do chat atual
        for (const tab of tabs) {
          try {
            const response = await browser.tabs.sendMessage(tab.id, { type: 'GET_WHATSAPP_CHAT_ID' });
            if (response && response.chatId) {
              currentChat.value = response;
              console.log('Chat atual detectado:', response);
            }
          } catch (e) {
            // Tab may not have content script loaded
          }
        }
      } else {
        alert('WhatsApp Web não encontrado.\n\nPor favor, abra https://web.whatsapp.com em uma nova aba.');
      }
    } catch (error) {
      console.error('Erro ao testar conexão:', error);
    }
  } else {
    alert('Funcionalidades da extensão não disponíveis.');
  }
}

// Função para navegar manualmente para a página de clientes
function navigateToClients() {
  if (currentChat.value && currentChat.value.chatId) {
    router.push(`/person/search/${encodeURIComponent(currentChat.value.chatId)}/${encodeURIComponent(currentChat.value.chatName)}`);
  } else {
    router.push('/person');
  }
}

// Lifecycle hooks
onMounted(() => {
  console.log('WhatsApp.vue montado - iniciando rastreamento de chats');
  
  // Configura listeners
  const cleanupWindow = setupWhatsAppListener();
  const cleanupBackground = setupBackgroundListener();
  
  // Verifica se há chats já selecionados
  checkWhatsAppTab();
  
  // Cleanup quando componente for desmontado
  onUnmounted(() => {
    console.log('WhatsApp.vue desmontado - parando rastreamento');
    if (cleanupWindow) cleanupWindow();
    if (cleanupBackground) cleanupBackground();
  });
});
</script>

<style scoped>
.whatsapp-crm-container {
  margin: 0 auto;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 300px;
}

.whatsapp-info {
  background: white;
  border-radius: 12px;
  width: 100%;
}

.instructions-card {
  background: #f8f9fa;
  border-radius: 12px;
  padding: 2rem;
  border: 1px solid #e9ecef;
}

.steps {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.step {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.step-number {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  background: #25d366;
  color: white;
  border-radius: 50%;
  font-weight: bold;
  font-size: 1.1rem;
}

.step-text {
  font-size: 1.1rem;
  color: #333;
  font-weight: 500;
}

.status-indicator {
  display: flex;
  align-items: center;
  padding: 12px 16px;
  border-radius: 8px;
  border: 1px solid #dee2e6;
  background: #ffffff;
  transition: all 0.3s ease;
}

.status-indicator.active {
  border-color: #198754;
  background: #f8fff9;
}

.status-indicator i {
  color: #6c757d;
}

.status-indicator.active i {
  color: #198754;
  animation: pulse 2s infinite;
}

.current-chat-info {
  padding: 12px 16px;
  border-radius: 8px;
  background: #e3f2fd;
  border: 1px solid #bbdefb;
  color: #1976d2;
}

@keyframes pulse {
  0% {
    opacity: 1;
  }
  50% {
    opacity: 0.6;
  }
  100% {
    opacity: 1;
  }
}

.btn {
  padding: 8px 16px;
  border-radius: 6px;
  border: 1px solid;
  cursor: pointer;
  font-size: 0.875rem;
  font-weight: 500;
  text-decoration: none;
  display: inline-flex;
  align-items: center;
  transition: all 0.2s ease;
}

.btn-outline-primary {
  color: #0d6efd;
  border-color: #0d6efd;
  background: transparent;
}

.btn-outline-primary:hover:not(:disabled) {
  background: #0d6efd;
  color: white;
}

.btn-outline-secondary {
  color: #6c757d;
  border-color: #6c757d;
  background: transparent;
}

.btn-outline-secondary:hover:not(:disabled) {
  background: #6c757d;
  color: white;
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-sm {
  padding: 6px 12px;
  font-size: 0.8rem;
}

.me-1 {
  margin-right: 0.25rem;
}

.me-2 {
  margin-right: 0.5rem;
}

/* Responsividade */
@media (max-width: 768px) {
  
  .whatsapp-info {
    padding: .7rem 2rem;
  }
  
  .instructions-card {
    padding: 1.5rem;
  }
  
  .step-text {
    font-size: 1rem;
  }
  
  .status-indicator {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.5rem;
  }
}
</style>
