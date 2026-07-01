<template>
  <Layout>
    <template #header>
      <DefaultHeader />
    </template>

    <div class="adbl-page fin-page">
      <Loader v-if="loading" />

      <!-- Sem chat selecionado -->
      <div v-if="!rawChatId && !searchPhone" class="adbl-empty" style="padding-top: 48px">
        <i class="bi bi-cash-coin"></i>
        <p>Navegue até um chat do WhatsApp para gerenciar as finanças.</p>
      </div>

      <!-- Pessoa cadastrada -->
      <div v-else-if="person" class="adbl-stack">
        <!-- Voltar + contexto -->
        <div class="adbl-subhead">
          <router-link :to="personFichaRoute" class="adbl-back">
            <i class="bi bi-arrow-left"></i>
            Ver ficha
          </router-link>
          <span class="adbl-subhead__ctx">{{ person.name }}</span>
        </div>

        <!-- Adicionar lançamento (dropdown + modal) -->
        <div class="fin-toolbar">
          <FinanceAdder :locked-person="person" @saved="loadFinances" />
        </div>

        <!-- Abas por situação -->
        <div class="ad-tabs">
          <button class="ad-tab" :class="{ active: activeTab === 'pendente' }" @click="activeTab = 'pendente'">
            Pendentes <span v-if="counts.pendente" class="ad-tab__badge ad-tab__badge--pending">{{ counts.pendente }}</span>
          </button>
          <button class="ad-tab" :class="{ active: activeTab === 'atrasado' }" @click="activeTab = 'atrasado'">
            Atrasados <span v-if="counts.atrasado" class="ad-tab__badge ad-tab__badge--late">{{ counts.atrasado }}</span>
          </button>
          <button class="ad-tab" :class="{ active: activeTab === 'pago' }" @click="activeTab = 'pago'">
            Pagos <span v-if="counts.pago" class="ad-tab__badge ad-tab__badge--paid">{{ counts.pago }}</span>
          </button>
        </div>

        <!-- Lista de pagamentos -->
        <div class="adbl-card">
          <div class="adbl-card__body">
            <div class="fin-listhead">
              <span class="fin-listhead__total">Em aberto: <strong>{{ formatBRL(openTotal) }}</strong></span>
              <button
                class="adbl-btn adbl-btn--outline adbl-btn--sm"
                :disabled="!finances.length"
                @click="copyExtrato"
              >
                <i class="bi bi-clipboard-check"></i>
                Extrato
              </button>
            </div>

            <ul v-if="visibleFinances.length" class="fin-list">
              <li v-for="f in visibleFinances" :key="f.id" class="fin-row">
                <div class="fin-row__info">
                  <div class="fin-row__desc">{{ f.description || 'Pagamento' }}</div>
                  <div class="fin-row__meta">
                    <input
                      type="date"
                      class="fin-due__input"
                      :class="{ 'fin-due__input--late': financeStatus(f) === 'atrasado' }"
                      :value="f.date"
                      title="Mudar vencimento"
                      @change="onChangeDate(f, $event)"
                    />
                  </div>
                </div>
                <div class="fin-row__side">
                  <div class="fin-amount" :class="{ 'fin-amount--expense': f.type === 'despesa' }">
                    {{ formatBRL(f.amount) }}
                  </div>
                  <div class="fin-row__actions">
                    <PaidSwitch :paid="f.paid" :show-label="false" @change="markPaid(f, $event)" />
                    <span class="fin-status-label" :class="`fin-status-label--${financeStatus(f)}`">
                      {{ (STATUS_META[financeStatus(f)] || STATUS_META.pendente).label }}
                    </span>
                    <button
                      class="adbl-btn adbl-btn--danger-soft adbl-btn--sm"
                      title="Excluir"
                      @click="removeFinance(f)"
                    >
                      <i class="bi bi-trash"></i>
                    </button>
                  </div>
                  <button class="adbl-btn adbl-btn--outline adbl-btn--sm" title="Extrato" @click="receiptFinance = f">
                    <i class="bi bi-receipt"></i>
                  </button>
                </div>
              </li>
            </ul>

            <div v-else class="adbl-empty" style="padding: 22px 0 10px">
              <i class="bi bi-inbox"></i>
              <p>Nenhum pagamento {{ tabEmptyLabel }}.</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Chat sem cliente cadastrado -->
      <div v-else class="adbl-empty">
        <i class="bi bi-person-fill-exclamation"></i>
        <p>Cadastre o cliente antes de gerenciar finanças.</p>
        <router-link :to="personFichaRoute" class="adbl-btn adbl-btn--primary adbl-btn--sm">
          <i class="bi bi-person-plus"></i>
          Cadastrar / vincular cliente
        </router-link>
      </div>

      <ReceiptModal
        v-if="receiptFinance"
        :finance="receiptFinance"
        :person="person"
        @close="receiptFinance = null"
      />
    </div>
  </Layout>
</template>

<script setup>
import { ref, onMounted, onUnmounted, computed } from 'vue';
import { useRoute } from 'vue-router';
import Layout from '@/components/Layout.vue';
import DefaultHeader from '@/components/DefaultHeader.vue';
import Loader from '@/components/Loader.vue';
import PaidSwitch from '@/components/PaidSwitch.vue';
import FinanceAdder from '@/components/FinanceAdder.vue';
import ReceiptModal from '@/components/ReceiptModal.vue';
import Swal from 'sweetalert2';
import { getPerson } from '@/api/people';
import { getPersonFinances, setFinancePaid, updateFinance, deleteFinance } from '@/api/finance';
import { financeStatus, formatBRL, formatDateBR, STATUS_META } from '@/utils/finance';

const route = useRoute();

const chatName = ref(route.params.chatName || 'Chat');
const rawChatId = ref(''); // id estável do WhatsApp (@lid/@c.us)
const searchPhone = ref(''); // telefone (@c.us) p/ busca
const person = ref(null);
const finances = ref([]);
const loading = ref(false);
const activeTab = ref('pendente');
const receiptFinance = ref(null);

const counts = computed(() => {
  const c = { pendente: 0, atrasado: 0, pago: 0 };
  for (const f of finances.value) {
    const status = financeStatus(f);
    c[status] = (c[status] || 0) + 1;
  }
  return c;
});

const visibleFinances = computed(() => finances.value.filter((f) => financeStatus(f) === activeTab.value));

const tabEmptyLabel = computed(
  () => ({ pendente: 'pendente', atrasado: 'atrasado', pago: 'pago' }[activeTab.value] || '')
);

// Total em aberto = pendentes + atrasados (apenas receitas).
const openTotal = computed(() =>
  finances.value
    .filter((f) => financeStatus(f) !== 'pago' && f.type !== 'despesa')
    .reduce((sum, f) => sum + Number(f.amount || 0), 0)
);

const personFichaRoute = computed(() => ({
  name: 'Person',
  params: { chatId: searchPhone.value || rawChatId.value, chatName: chatName.value },
  query: { raw: rawChatId.value, phone: searchPhone.value },
}));

function toast(icon, title) {
  Swal.fire({
    toast: true,
    position: 'top-end',
    icon,
    title,
    showConfirmButton: false,
    timer: 2200,
    timerProgressBar: true,
  });
}

function applyChat({ chatId: rawId, phone, chatName: name }) {
  rawChatId.value = rawId || '';
  searchPhone.value = phone || (String(rawId || '').endsWith('@c.us') ? rawId : '');
  if (name) chatName.value = name;
}

function pickDefaultTab() {
  if (counts.value.atrasado) activeTab.value = 'atrasado';
  else if (counts.value.pendente) activeTab.value = 'pendente';
  else if (counts.value.pago) activeTab.value = 'pago';
}

async function loadFinances() {
  if (!person.value) return;
  try {
    const res = await getPersonFinances(person.value.id);
    finances.value = res.finances || [];
    pickDefaultTab();
  } catch (error) {
    finances.value = [];
    console.error('Erro ao carregar finanças:', error);
  }
}

async function fetchPerson() {
  if (!rawChatId.value && !searchPhone.value) return;
  loading.value = true;
  try {
    const response = await getPerson({ phone: searchPhone.value, chatId: rawChatId.value });
    person.value = response && Object.keys(response).length > 0 ? response : null;
    if (person.value) await loadFinances();
  } catch (error) {
    person.value = null;
    console.error('Erro ao buscar pessoa:', error);
  } finally {
    loading.value = false;
  }
}

function updateLocal(updated) {
  if (!updated) return;
  const i = finances.value.findIndex((x) => x.id === updated.id);
  if (i !== -1) finances.value.splice(i, 1, { ...finances.value[i], ...updated });
}

async function markPaid(f, paid) {
  try {
    const res = await setFinancePaid(f.id, paid);
    updateLocal(res.finance);
  } catch (error) {
    toast('error', 'Erro ao atualizar');
    console.error('Erro ao marcar pago:', error);
  }
}

async function onChangeDate(f, event) {
  const date = event.target.value;
  if (!date) return;
  try {
    const res = await updateFinance(f.id, { date });
    updateLocal(res.finance);
    toast('success', 'Vencimento atualizado');
  } catch (error) {
    toast('error', 'Erro ao mudar vencimento');
    console.error('Erro ao mudar vencimento:', error);
  }
}

async function removeFinance(f) {
  const confirm = await Swal.fire({
    title: 'Excluir pagamento?',
    text: f.description || 'Pagamento',
    icon: 'warning',
    showCancelButton: true,
    confirmButtonText: 'Excluir',
    cancelButtonText: 'Cancelar',
    confirmButtonColor: '#c2333f',
  });
  if (!confirm.isConfirmed) return;
  try {
    await deleteFinance(f.id);
    finances.value = finances.value.filter((x) => x.id !== f.id);
  } catch (error) {
    toast('error', 'Erro ao excluir');
    console.error('Erro ao excluir:', error);
  }
}

function buildExtrato() {
  const lines = [];
  lines.push('*Extrato financeiro*');
  if (person.value?.name) lines.push(person.value.name);
  lines.push('');
  const ordered = [...finances.value].sort((a, b) => String(a.date || '').localeCompare(String(b.date || '')));
  for (const f of ordered) {
    const meta = STATUS_META[financeStatus(f)] || STATUS_META.pendente;
    const desc = f.description || 'Pagamento';
    lines.push(`• ${desc} — ${formatBRL(f.amount)} — venc. ${formatDateBR(f.date)} — ${meta.label}`);
  }
  lines.push('');
  lines.push(`Total em aberto: ${formatBRL(openTotal.value)}`);
  return lines.join('\n');
}

async function copyExtrato() {
  const text = buildExtrato();
  try {
    await navigator.clipboard.writeText(text);
    toast('success', 'Extrato copiado');
    return;
  } catch (error) {
    // Fallback p/ contextos sem permissão de clipboard.
  }
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    toast('success', 'Extrato copiado');
  } catch (error) {
    toast('error', 'Não foi possível copiar');
  }
}

function onChatChanged(message) {
  if (!message || message.type !== 'WHATSAPP_CHAT_CHANGED' || !message.chatId) return;
  applyChat(message);
  fetchPerson();
}

onMounted(() => {
  const q = route.query;
  if (q.raw || q.phone) {
    applyChat({ chatId: q.raw || route.params.chatId, phone: q.phone || '', chatName: chatName.value });
  } else {
    const lastChat = JSON.parse(localStorage.getItem('last_chat') || 'null');
    if (lastChat?.chatId) applyChat(lastChat);
    else if (route.params.chatId) applyChat({ chatId: route.params.chatId, phone: '', chatName: chatName.value });
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

<!-- Estilos de finanças (chips, lista, linhas, formulário) ficam no style.scss global, reaproveitados por Finance.vue. -->
