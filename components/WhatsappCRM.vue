<template>
  <div class="whatsapp-crm">
    <div v-if="chatId && chatName" class="chat-active">
      <div class="chat-header mb-4">
        <h5 class="mb-2">
          <i class="bi bi-whatsapp text-success me-2"></i>
          {{ chatName }}
        </h5>
        <small class="text-muted">ID: {{ chatId }}</small>
      </div>
      
      <!-- Aqui você pode adicionar as funcionalidades do CRM -->
      <div class="crm-content">
        <div class="row">
          <div class="col-md-6">
            <div class="card">
              <div class="card-header">
                <h6 class="mb-0">Informações do Cliente</h6>
              </div>
              <div class="card-body">
                <p class="text-muted">Carregando informações...</p>
              </div>
            </div>
          </div>
          <div class="col-md-6">
            <div class="card">
              <div class="card-header">
                <h6 class="mb-0">Histórico de Conversas</h6>
              </div>
              <div class="card-body">
                <p class="text-muted">Nenhum histórico encontrado</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <div v-else class="no-chat">
      <div class="text-center text-muted">
        <i class="bi bi-chat-left fs-2 mb-3"></i>
        <p>Selecione um chat do WhatsApp para começar</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue'

// Props recebidas do componente pai
const props = defineProps({
  chatId: String,
  chatName: String
})

const chatId = ref(props.chatId)
const chatName = ref(props.chatName)

// Observar mudanças nas props
watch(() => props.chatId, (newChatId) => {
  chatId.value = newChatId
})

watch(() => props.chatName, (newChatName) => {
  chatName.value = newChatName
})

// Função para atualizar o chat
const updateChat = (info) => {
  if (info && info.chatId && info.chatName) {
    chatId.value = info.chatId
    chatName.value = info.chatName
    console.log('Chat atualizado no WhatsappCRM:', info)
  }
}

// Listener para mensagens do content script
browser.runtime.onMessage.addListener((message) => {
  if (message.type === 'WHATSAPP_CHAT_CHANGED') {
    updateChat(message)
  }
})

const getChat = async () => {
  try {
    const tabs = await browser.tabs.query({ active: true, currentWindow: true });
    if (tabs && tabs.length > 0) {
      const response = await browser.tabs.sendMessage(tabs[0].id, { type: 'GET_WHATSAPP_CHAT_ID' });
      if (response && response.chatId) {
        updateChat(response);
      }
    }
  } catch (e) {
    console.error('Erro ao obter chat:', e);
  }
}

onMounted(async () => {
  // Se não temos props, tentar obter do storage ou da aba ativa
  if (!chatId.value || !chatName.value) {
    try {
      const result = await browser.storage.local.get(['currentChat']);
      if (result.currentChat) {
        chatId.value = result.currentChat.chatId;
        chatName.value = result.currentChat.chatName;
      }
    } catch (e) {
      console.error('Erro ao buscar chat armazenado:', e);
    }

    getChat();
  }
})
</script>

<style scoped>
.whatsapp-crm {
  min-height: 400px;
}

.chat-header {
  border-bottom: 1px solid #e9ecef;
  padding-bottom: 1rem;
}

.no-chat {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 300px;
  background: #f8f9fa;
  border-radius: 8px;
  border: 2px dashed #dee2e6;
}

.crm-content .card {
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
}

.crm-content .card-header {
  background-color: #f8f9fa;
  border-bottom: 1px solid #dee2e6;
}
</style>