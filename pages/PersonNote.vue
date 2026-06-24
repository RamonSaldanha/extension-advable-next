<template>
  <Layout>
    <template #header>
      <DefaultHeader />
    </template>

    <div class="adbl-page">
      <Loader v-if="loading" />

      <!-- Sem chat selecionado -->
      <div v-if="!rawChatId && !searchPhone" class="adbl-empty" style="padding-top: 48px">
        <i class="bi bi-journal-text"></i>
        <p>Navegue até um chat do WhatsApp para ver as anotações.</p>
      </div>

      <!-- Pessoa cadastrada: editor de anotações -->
      <div v-else-if="person" class="adbl-card">
        <div class="adbl-card__head">
          <span class="adbl-card__head-icon"><i class="bi bi-journal-text"></i></span>
          <span class="adbl-card__title">Anotações</span>
          <router-link :to="personFichaRoute" class="adbl-btn adbl-btn--outline adbl-btn--sm" style="margin-left: auto">
            <i class="bi bi-person"></i>
            Ver ficha
          </router-link>
        </div>

        <div class="adbl-card__body">
          <div class="note-person">{{ person.name }}</div>

          <div class="editor-shell">
            <QuillEditor
              v-model:content="noteContent"
              content-type="html"
              :options="quillOptions"
            />
          </div>

          <div class="note-footer">
            <button class="adbl-btn adbl-btn--primary" :disabled="saving" @click="saveNote">
              <span v-if="saving" class="spinner-border spinner-border-sm me-1"></span>
              <i v-else class="bi bi-check2"></i>
              Salvar anotação
            </button>
          </div>
        </div>
      </div>

      <!-- Chat sem cliente cadastrado -->
      <div v-else class="adbl-empty">
        <i class="bi bi-person-fill-exclamation"></i>
        <p>Cadastre o cliente antes de criar anotações.</p>
        <router-link :to="personFichaRoute" class="adbl-btn adbl-btn--primary adbl-btn--sm">
          <i class="bi bi-person-plus"></i>
          Cadastrar / vincular cliente
        </router-link>
      </div>
    </div>
  </Layout>
</template>

<script setup>
import { ref, onMounted, onUnmounted, computed } from 'vue';
import { useRoute } from 'vue-router';
import Layout from '@/components/Layout.vue';
import DefaultHeader from '@/components/DefaultHeader.vue';
import Loader from '@/components/Loader.vue';
import Swal from 'sweetalert2';
import { QuillEditor } from '@vueup/vue-quill';
import '@vueup/vue-quill/dist/vue-quill.snow.css';
import { getPerson, savePersonNote } from '@/api/people';

const route = useRoute();

const chatName = ref(route.params.chatName || 'Chat');
const rawChatId = ref(''); // id estável do WhatsApp (@lid/@c.us) p/ vínculo
const searchPhone = ref(''); // telefone (@c.us) p/ busca, quando houver
const person = ref(null);
const noteContent = ref('');
const loading = ref(false);
const saving = ref(false);

// Editor snow: barra de ferramentas fixa e estável (sem o tooltip flutuante do
// bubble, que se posiciona errado dentro do iframe/modal). Inclui tamanho da fonte.
const quillOptions = {
  theme: 'snow',
  placeholder: 'Escreva aqui as anotações sobre o cliente...',
  modules: {
    toolbar: [['bold', 'italic', 'underline'], [{ size: ['small', false, 'large', 'huge'] }]],
  },
};

// Volta para a ficha completa do mesmo chat, preservando os identificadores.
const personFichaRoute = computed(() => ({
  name: 'Person',
  params: { chatId: searchPhone.value || rawChatId.value, chatName: chatName.value },
  query: { raw: rawChatId.value, phone: searchPhone.value },
}));

// Preenche os refs de identidade (telefone e id do chat) a partir de um chat.
function applyChat({ chatId: rawId, phone, chatName: name }) {
  rawChatId.value = rawId || '';
  searchPhone.value = phone || (String(rawId || '').endsWith('@c.us') ? rawId : '');
  if (name) chatName.value = name;
}

async function fetchPerson() {
  if (!rawChatId.value && !searchPhone.value) return;
  loading.value = true;
  try {
    const response = await getPerson({ phone: searchPhone.value, chatId: rawChatId.value });
    const found = response && Object.keys(response).length > 0 ? response : null;
    // Define o conteúdo ANTES da pessoa para que o editor (v-if person) já monte preenchido.
    noteContent.value = found?.latest_note?.content || '';
    person.value = found;
  } catch (error) {
    person.value = null;
    console.error('Erro ao buscar pessoa:', error);
  } finally {
    loading.value = false;
  }
}

async function saveNote() {
  if (!person.value) return;
  saving.value = true;
  try {
    await savePersonNote(person.value.id, { content: noteContent.value || '' });
    Swal.fire({
      toast: true,
      position: 'top-end',
      icon: 'success',
      title: 'Anotação salva',
      showConfirmButton: false,
      timer: 2500,
      timerProgressBar: true,
    });
  } catch (error) {
    Swal.fire({
      toast: true,
      position: 'top-end',
      icon: 'error',
      title: 'Erro ao salvar anotação',
      showConfirmButton: false,
      timer: 2500,
      timerProgressBar: true,
    });
    console.error('Erro ao salvar anotação:', error);
  } finally {
    saving.value = false;
  }
}

// Mantém o painel em sincronia quando o usuário troca de conversa no WhatsApp.
function onChatChanged(message) {
  if (!message || message.type !== 'WHATSAPP_CHAT_CHANGED' || !message.chatId) return;
  applyChat(message);
  fetchPerson();
}

onMounted(() => {
  // 1) Deep-link explícito do ícone (query raw/phone). 2) Fallback last_chat. 3) Params.
  const q = route.query;
  if (q.raw || q.phone) {
    applyChat({ chatId: q.raw || route.params.chatId, phone: q.phone || '', chatName: chatName.value });
  } else {
    const lastChat = JSON.parse(localStorage.getItem('last_chat') || 'null');
    if (lastChat?.chatId) {
      applyChat(lastChat);
    } else if (route.params.chatId) {
      applyChat({ chatId: route.params.chatId, phone: '', chatName: chatName.value });
    }
  }

  fetchPerson();

  if (typeof browser !== 'undefined' && browser.runtime) {
    browser.runtime.onMessage.addListener(onChatChanged);
  }
});

onUnmounted(() => {
  if (typeof browser !== 'undefined' && browser.runtime) {
    browser.runtime.onMessage.removeListener(onChatChanged);
  }
});
</script>

<style scoped>
.note-person {
  font-size: 13px;
  color: var(--adbl-muted);
  margin-bottom: 12px;
}

.note-footer {
  display: flex;
  justify-content: flex-end;
  margin-top: 14px;
}

/* ---- Moldura do editor (integra a barra do Quill na moldura) ---- */
.editor-shell {
  border: 1px solid #e6e6f0;
  border-radius: 12px;
  background: #fff;
  overflow: hidden;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}

.editor-shell:focus-within {
  border-color: #16223f;
  box-shadow: 0 0 0 3px rgba(22, 34, 63, 0.12);
}

/* Quill (snow) — integra a barra de ferramentas e o editor na moldura */
.editor-shell :deep(.ql-toolbar.ql-snow) {
  border: none;
  border-bottom: 1px solid #e6e6f0;
  padding: 8px 10px;
  background: #fafafd;
  border-radius: 12px 12px 0 0;
}

.editor-shell :deep(.ql-container.ql-snow) {
  border: none;
  font-family: inherit;
  font-size: 14px;
}

.editor-shell :deep(.ql-editor) {
  min-height: 220px;
  padding: 16px;
  line-height: 1.65;
  color: #2b2b3a;
}

.editor-shell :deep(.ql-editor.ql-blank::before) {
  left: 16px;
  right: 16px;
  color: #9aa0b2;
  font-style: normal;
}

/* Acento roxo da marca nos botões ativos/hover da barra */
.editor-shell :deep(.ql-snow.ql-toolbar button:hover),
.editor-shell :deep(.ql-snow .ql-toolbar button:hover),
.editor-shell :deep(.ql-snow.ql-toolbar button.ql-active),
.editor-shell :deep(.ql-snow .ql-picker-label:hover),
.editor-shell :deep(.ql-snow .ql-picker-label.ql-active),
.editor-shell :deep(.ql-snow .ql-picker-item:hover),
.editor-shell :deep(.ql-snow .ql-picker-item.ql-selected) {
  color: #16223f;
}

.editor-shell :deep(.ql-snow.ql-toolbar button:hover .ql-stroke),
.editor-shell :deep(.ql-snow.ql-toolbar button.ql-active .ql-stroke),
.editor-shell :deep(.ql-snow .ql-picker-label:hover .ql-stroke) {
  stroke: #16223f;
}

/* Rótulos do seletor de tamanho em português (o Quill traz em inglês) */
.editor-shell :deep(.ql-snow .ql-picker.ql-size .ql-picker-label:not([data-value])::before),
.editor-shell :deep(.ql-snow .ql-picker.ql-size .ql-picker-item:not([data-value])::before) {
  content: 'Normal';
}
.editor-shell :deep(.ql-snow .ql-picker.ql-size .ql-picker-label[data-value='small']::before),
.editor-shell :deep(.ql-snow .ql-picker.ql-size .ql-picker-item[data-value='small']::before) {
  content: 'Pequena';
}
.editor-shell :deep(.ql-snow .ql-picker.ql-size .ql-picker-label[data-value='large']::before),
.editor-shell :deep(.ql-snow .ql-picker.ql-size .ql-picker-item[data-value='large']::before) {
  content: 'Grande';
}
.editor-shell :deep(.ql-snow .ql-picker.ql-size .ql-picker-label[data-value='huge']::before),
.editor-shell :deep(.ql-snow .ql-picker.ql-size .ql-picker-item[data-value='huge']::before) {
  content: 'Enorme';
}
</style>
