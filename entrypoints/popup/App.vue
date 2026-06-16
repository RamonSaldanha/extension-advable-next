<!-- App.vue -->
<template>
  <div class="adbl-container">
    <div v-if="processNumber && !isViewingProcessInternally" class="process-found">
      Acessando o processo n.º
      <router-link :to="{ name: 'ProcessIndex' }">
        {{ processNumber }}
      </router-link>
    </div>
    <router-view></router-view>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';

const route = useRoute();
const router = useRouter();
const processNumber = ref('');

// Listener GLOBAL de redirecionamento do WhatsApp.
// Fica no App.vue (sempre montado) para que a troca de conversa redirecione
// para a ficha do cliente independentemente da rota em que o iframe abriu.
let whatsappListener = null;

// Computed para verificar se estamos visualizando um processo internamente na extensão
const isViewingProcessInternally = computed(() => {
  return route.name === 'ProcessView';
});

function findProcessNumber(html) {
  const processPattern = /\s*(\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4})[A-Za-z]?\s*/;
  const matches = html.match(processPattern);
  return matches ? matches[0] : null;
}

async function getCurrentTabHtml() {
  try {
    const response = await browser.runtime.sendMessage({ type: 'GET_CURRENT_TAB_HTML' });
    return response?.html || '';
  } catch {
    return '';
  }
}

onMounted(async () => {
  // Redirecionamento automático ao trocar de conversa no WhatsApp.
  if (typeof browser !== 'undefined' && browser.runtime) {
    whatsappListener = (message) => {
      if (message && message.type === 'WHATSAPP_CHAT_CHANGED' && message.chatId) {
        // Chave de identificação: o telefone (@c.us) quando houver; senão o id
        // estável do chat (@lid). O telefone é usado na busca; o chatId no vínculo.
        const searchKey = message.phone || message.chatId;
        console.log('[Advable] redirect ->', searchKey, message.chatId, message.chatName);

        // Guarda o chat para que Person.vue preencha o formulário no onMounted
        // (no primeiro redirect o listener do Person ainda não está montado).
        try {
          localStorage.setItem(
            'last_chat',
            JSON.stringify({
              chatId: message.chatId, // id estável (@lid/@c.us) p/ vínculo
              phone: message.phone || '', // telefone (@c.us) p/ busca, quando houver
              chatName: message.chatName,
              timestamp: new Date().toISOString(),
            })
          );
        } catch (e) {
          /* */
        }

        // Evita re-navegar para a mesma ficha já aberta.
        if (route.name === 'Person' && route.params.chatId === searchKey) return;

        router.push({
          name: 'Person',
          params: {
            chatId: searchKey,
            chatName: message.chatName,
          },
        });
      }
    };
    browser.runtime.onMessage.addListener(whatsappListener);
  }

  if (typeof browser !== 'undefined' && browser.tabs) {
    try {
      const tabs = await browser.tabs.query({ active: true, currentWindow: true });
      if (tabs && tabs.length > 0) {
        const html = await getCurrentTabHtml();
        processNumber.value = findProcessNumber(html);
      }
    } catch (error) {
      console.error('Erro ao obter HTML:', error);
    }
  }
});

onUnmounted(() => {
  if (whatsappListener && typeof browser !== 'undefined' && browser.runtime) {
    browser.runtime.onMessage.removeListener(whatsappListener);
    whatsappListener = null;
  }
});
</script>

<style scoped>

</style>
