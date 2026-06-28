<template>
  <Layout>
    <template #header>
      <DefaultHeader />
    </template>

    <div class="adbl-page">
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

        <!-- Adicionar pagamento -->
        <div class="adbl-card">
          <div class="adbl-card__head">
            <span class="adbl-card__head-icon"><i class="bi bi-plus-circle"></i></span>
            <span class="adbl-card__title">Adicionar pagamento</span>
            <button class="adbl-btn adbl-btn--outline adbl-btn--sm" style="margin-left: auto" @click="showAdd = !showAdd">
              <i class="bi" :class="showAdd ? 'bi-chevron-up' : 'bi-plus-lg'"></i>
              {{ showAdd ? 'Fechar' : 'Novo' }}
            </button>
          </div>

          <div v-if="showAdd" class="adbl-card__body">
            <div class="adbl-field">
              <label class="adbl-label">Descrição</label>
              <input class="adbl-input" type="text" v-model="form.description" placeholder="Ex.: Honorários" />
            </div>

            <div class="fin-form-grid">
              <div class="adbl-field">
                <label class="adbl-label">Valor (R$)</label>
                <input class="adbl-input" type="number" min="0" step="0.01" v-model="form.amount" placeholder="0,00" />
              </div>
              <div class="adbl-field">
                <label class="adbl-label">Vencimento</label>
                <input class="adbl-input" type="date" v-model="form.date" />
              </div>
              <div class="adbl-field">
                <label class="adbl-label">Parcelas</label>
                <input class="adbl-input" type="number" min="1" max="120" v-model="form.installments" />
              </div>
              <div class="adbl-field">
                <label class="adbl-label">Tipo</label>
                <select class="adbl-select" v-model="form.type">
                  <option value="receita">Receita</option>
                  <option value="despesa">Despesa</option>
                </select>
              </div>
            </div>

            <div v-if="wallets.length" class="adbl-field">
              <label class="adbl-label">Carteira</label>
              <select class="adbl-select" v-model="form.wallet_id">
                <option :value="null">Sem carteira</option>
                <option v-for="w in wallets" :key="w.id" :value="w.id">{{ w.title }}</option>
              </select>
            </div>

            <div v-if="installmentsPreview" class="adbl-muted-note">{{ installmentsPreview }}</div>

            <button
              class="adbl-btn adbl-btn--primary adbl-btn--block"
              style="margin-top: 12px"
              :disabled="saving"
              @click="savePayment"
            >
              <span v-if="saving" class="spinner-border spinner-border-sm me-1"></span>
              <i v-else class="bi bi-check2"></i>
              Adicionar
            </button>
          </div>
        </div>

        <!-- Abas por situação -->
        <div class="ad-tabs">
          <button class="ad-tab" :class="{ active: activeTab === 'pendente' }" @click="activeTab = 'pendente'">
            Pendentes <span v-if="counts.pendente" class="ad-tab__badge">{{ counts.pendente }}</span>
          </button>
          <button class="ad-tab" :class="{ active: activeTab === 'atrasado' }" @click="activeTab = 'atrasado'">
            Atrasados <span v-if="counts.atrasado" class="ad-tab__badge">{{ counts.atrasado }}</span>
          </button>
          <button class="ad-tab" :class="{ active: activeTab === 'pago' }" @click="activeTab = 'pago'">
            Pagos <span v-if="counts.pago" class="ad-tab__badge">{{ counts.pago }}</span>
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
                    <span class="fin-chip" :class="statusMeta(f.status).cls">
                      <i class="bi" :class="statusMeta(f.status).icon"></i>{{ statusMeta(f.status).label }}
                    </span>
                    <label class="fin-due" title="Mudar vencimento">
                      <i class="bi bi-calendar-event"></i>
                      <input type="date" class="fin-due__input" :value="f.date" @change="onChangeDate(f, $event)" />
                    </label>
                  </div>
                </div>
                <div class="fin-row__side">
                  <div class="fin-amount" :class="{ 'fin-amount--expense': f.type === 'despesa' }">
                    {{ formatBRL(f.amount) }}
                  </div>
                  <div class="fin-row__actions">
                    <button
                      v-if="!f.paid"
                      class="adbl-btn adbl-btn--success adbl-btn--sm"
                      title="Marcar como pago"
                      @click="markPaid(f, true)"
                    >
                      <i class="bi bi-check2"></i>
                    </button>
                    <button
                      v-else
                      class="adbl-btn adbl-btn--outline adbl-btn--sm"
                      title="Marcar como não pago"
                      @click="markPaid(f, false)"
                    >
                      <i class="bi bi-arrow-counterclockwise"></i>
                    </button>
                    <button
                      class="adbl-btn adbl-btn--danger-soft adbl-btn--sm"
                      title="Excluir"
                      @click="removeFinance(f)"
                    >
                      <i class="bi bi-trash"></i>
                    </button>
                  </div>
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
import { getPerson } from '@/api/people';
import {
  getPersonFinances,
  addPersonFinance,
  setFinancePaid,
  updateFinance,
  deleteFinance,
  getWallets,
} from '@/api/finance';
import { formatBRL, formatDateBR, STATUS_META } from '@/utils/finance';

const route = useRoute();

const chatName = ref(route.params.chatName || 'Chat');
const rawChatId = ref(''); // id estável do WhatsApp (@lid/@c.us)
const searchPhone = ref(''); // telefone (@c.us) p/ busca
const person = ref(null);
const finances = ref([]);
const wallets = ref([]);
const loading = ref(false);
const saving = ref(false);
const activeTab = ref('pendente');
const showAdd = ref(false);

const todayISO = new Date().toISOString().slice(0, 10);
const form = ref({ description: '', amount: '', date: todayISO, installments: 1, type: 'receita', wallet_id: null });

function statusMeta(status) {
  return STATUS_META[status] || STATUS_META.pendente;
}

const counts = computed(() => {
  const c = { pendente: 0, atrasado: 0, pago: 0 };
  for (const f of finances.value) c[f.status] = (c[f.status] || 0) + 1;
  return c;
});

const visibleFinances = computed(() => finances.value.filter((f) => f.status === activeTab.value));

const tabEmptyLabel = computed(
  () => ({ pendente: 'pendente', atrasado: 'atrasado', pago: 'pago' }[activeTab.value] || '')
);

// Total em aberto = pendentes + atrasados (apenas receitas).
const openTotal = computed(() =>
  finances.value
    .filter((f) => f.status !== 'pago' && f.type !== 'despesa')
    .reduce((sum, f) => sum + Number(f.amount || 0), 0)
);

const installmentsPreview = computed(() => {
  const n = parseInt(form.value.installments, 10) || 1;
  const amount = Number(form.value.amount || 0);
  if (n > 1 && amount > 0) {
    return `${n}× de ${formatBRL(amount)} = ${formatBRL(amount * n)} (vencimentos mensais)`;
  }
  return '';
});

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

async function loadWallets() {
  try {
    wallets.value = await getWallets();
  } catch (error) {
    wallets.value = [];
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
  if (i !== -1) finances.value.splice(i, 1, updated);
}

async function savePayment() {
  if (!person.value) return;
  const amount = Number(form.value.amount);
  if (!amount || amount <= 0) {
    toast('warning', 'Informe um valor válido');
    return;
  }
  if (!form.value.date) {
    toast('warning', 'Informe o vencimento');
    return;
  }
  saving.value = true;
  try {
    await addPersonFinance(person.value.id, {
      description: form.value.description || '',
      amount,
      date: form.value.date,
      type: form.value.type || 'receita',
      installments: parseInt(form.value.installments, 10) || 1,
      wallet_id: form.value.wallet_id || null,
    });
    toast('success', 'Pagamento adicionado');
    form.value = { description: '', amount: '', date: todayISO, installments: 1, type: 'receita', wallet_id: null };
    showAdd.value = false;
    await loadFinances();
  } catch (error) {
    toast('error', 'Erro ao adicionar pagamento');
    console.error('Erro ao adicionar pagamento:', error);
  } finally {
    saving.value = false;
  }
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
    const meta = STATUS_META[f.status] || STATUS_META.pendente;
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
  loadWallets();

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
