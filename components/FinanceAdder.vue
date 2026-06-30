<!--
  FinanceAdder.vue — botão "Adicionar" (dropdown) + modal de novo lançamento.
  Três atalhos: Receita (hoje) e Despesa (hoje) abrem um modal enxuto e já lançam
  como PAGO; "Transação completa" abre o modal com todos os campos (vencimento,
  parcelas, tipo, situação). Usado na página geral e na de finanças do cliente.
  - lockedPerson: quando definido (ficha do cliente), o lançamento já vai para ele.
  - emit('saved'): a página recarrega a lista.
-->
<template>
  <div class="fin-adder" ref="rootRef">
    <button class="adbl-btn adbl-btn--primary adbl-btn--sm" @click="toggleMenu">
      <i class="bi bi-plus-lg"></i>
      Adicionar
      <i class="bi bi-chevron-up" style="font-size: 11px"></i>
    </button>

    <ul v-if="menuOpen" class="fin-adder__menu">
      <li>
        <button class="fin-adder__item" @click="openModal('receita')">
          <i class="bi bi-arrow-down-circle fin-adder__ico fin-adder__ico--in"></i>
          Receita (hoje)
        </button>
      </li>
      <li>
        <button class="fin-adder__item" @click="openModal('despesa')">
          <i class="bi bi-arrow-up-circle fin-adder__ico fin-adder__ico--out"></i>
          Despesa (hoje)
        </button>
      </li>
      <li>
        <button class="fin-adder__item" @click="openModal('full')">
          <i class="bi bi-sliders2 fin-adder__ico"></i>
          Transação completa
        </button>
      </li>
    </ul>

    <teleport to="body">
      <div v-if="modalMode" class="fin-modal__backdrop" @click.self="closeModal">
        <div class="fin-modal" role="dialog" aria-modal="true">
          <div class="fin-modal__head">
            <span class="fin-modal__title">
              <i class="bi" :class="headIcon"></i>
              {{ title }}
            </span>
            <button class="fin-modal__x" title="Fechar" @click="closeModal"><i class="bi bi-x-lg"></i></button>
          </div>

          <div class="fin-modal__body">
            <div class="adbl-field">
              <label class="adbl-label">Valor (R$)</label>
              <input
                ref="amountInputRef"
                class="adbl-input"
                type="text"
                inputmode="decimal"
                v-money="MONEY_MASK"
                v-model="form.amount"
                @keydown.enter.prevent="save"
              />
            </div>

            <div class="adbl-field">
              <label class="adbl-label">Descrição</label>
              <input class="adbl-input" type="text" v-model="form.description" placeholder="Ex.: Honorários" />
            </div>

            <template v-if="modalMode === 'full'">
              <div class="fin-form-grid">
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
                <div class="adbl-field">
                  <label class="adbl-label">Situação</label>
                  <div class="fin-modal__paid">
                    <PaidSwitch :paid="form.paid" @change="form.paid = $event" />
                  </div>
                </div>
              </div>
              <div v-if="installmentsPreview" class="adbl-muted-note">{{ installmentsPreview }}</div>
            </template>

            <div class="adbl-field">
              <label class="adbl-label">Cliente{{ lockedPerson ? '' : ' (opcional)' }}</label>
              <div v-if="lockedPerson" class="fin-client-picked">
                <span class="adbl-chip"><i class="bi bi-person"></i> {{ lockedPerson.name }}</span>
              </div>
              <div v-else-if="selectedPerson" class="fin-client-picked">
                <span class="adbl-chip"><i class="bi bi-person"></i> {{ selectedPerson.name }}</span>
                <button type="button" class="adbl-btn adbl-btn--outline adbl-btn--sm" @click="clearClient">
                  <i class="bi bi-x-lg"></i>
                  Remover
                </button>
              </div>
              <template v-else>
                <input
                  class="adbl-input"
                  type="text"
                  placeholder="Buscar por nome (ou deixe sem cliente)"
                  v-model="clientQuery"
                />
                <ul v-if="clientResults.length" class="adbl-link-list">
                  <li v-for="p in clientResults" :key="p.id" class="adbl-link-item">
                    <span>{{ p.name }} <small v-if="p.whatsapp">· {{ p.whatsapp }}</small></span>
                    <button class="adbl-btn adbl-btn--outline adbl-btn--sm" @click="selectClient(p)">Selecionar</button>
                  </li>
                </ul>
                <div v-else-if="clientQuery.length >= 2" class="adbl-muted-note">Nenhum cliente encontrado.</div>
              </template>
            </div>

            <div v-if="wallets.length" class="adbl-field">
              <label class="adbl-label">Carteira</label>
              <select class="adbl-select" v-model="form.wallet_id">
                <option :value="null">Sem carteira</option>
                <option v-for="w in wallets" :key="w.id" :value="w.id">{{ w.title }}</option>
              </select>
            </div>

            <p v-if="modalMode !== 'full'" class="adbl-muted-note">
              <i class="bi bi-check-circle-fill" style="color: var(--ad-success)"></i>
              Lançado como pago hoje.
            </p>
          </div>

          <div class="fin-modal__foot">
            <button class="adbl-btn adbl-btn--outline" @click="closeModal">Cancelar</button>
            <button class="adbl-btn adbl-btn--primary" :disabled="saving" @click="save">
              <span v-if="saving" class="spinner-border spinner-border-sm me-1"></span>
              <i v-else class="bi bi-check2"></i>
              Adicionar
            </button>
          </div>
        </div>
      </div>
    </teleport>
  </div>
</template>

<script setup>
import { ref, reactive, computed, nextTick, onMounted, onUnmounted, watch } from 'vue';
import PaidSwitch from '@/components/PaidSwitch.vue';
import Swal from 'sweetalert2';
import debounce from 'lodash.debounce';
import { addFinance, getWallets } from '@/api/finance';
import { searchPeople } from '@/api/people';
import { formatBRL, MONEY_MASK, parseBRLInput } from '@/utils/finance';

const props = defineProps({
  // Quando definido, o lançamento já vai para este cliente (ficha do cliente).
  lockedPerson: { type: Object, default: null },
});
const emit = defineEmits(['saved']);

const rootRef = ref(null);
const amountInputRef = ref(null);
const menuOpen = ref(false);
const modalMode = ref(null); // 'receita' | 'despesa' | 'full' | null
const saving = ref(false);
const wallets = ref([]);
const selectedPerson = ref(null);
const clientQuery = ref('');
const clientResults = ref([]);

const todayISO = () => new Date().toISOString().slice(0, 10);
const form = reactive({
  description: '',
  amount: '',
  date: todayISO(),
  installments: 1,
  type: 'receita',
  paid: false,
  wallet_id: null,
});

const title = computed(
  () => ({ receita: 'Nova receita', despesa: 'Nova despesa', full: 'Nova transação' }[modalMode.value] || '')
);
const headIcon = computed(
  () =>
    ({ receita: 'bi-arrow-down-circle', despesa: 'bi-arrow-up-circle', full: 'bi-sliders2' }[modalMode.value] ||
    'bi-plus-lg')
);

const installmentsPreview = computed(() => {
  const n = parseInt(form.installments, 10) || 1;
  const amount = parseBRLInput(form.amount);
  if (n > 1 && amount > 0) {
    return `${n}× de ${formatBRL(amount)} = ${formatBRL(amount * n)} (vencimentos mensais)`;
  }
  return '';
});

function toast(icon, t) {
  Swal.fire({
    toast: true,
    position: 'top-end',
    icon,
    title: t,
    showConfirmButton: false,
    timer: 2200,
    timerProgressBar: true,
  });
}

function toggleMenu() {
  menuOpen.value = !menuOpen.value;
}

function resetForm(mode) {
  form.description = '';
  form.amount = '';
  form.date = todayISO();
  form.installments = 1;
  form.type = mode === 'despesa' ? 'despesa' : 'receita';
  form.paid = mode !== 'full'; // receita/despesa "de hoje" já entram pagas
  form.wallet_id = null;
  selectedPerson.value = null;
  clientQuery.value = '';
  clientResults.value = [];
}

function openModal(mode) {
  menuOpen.value = false;
  resetForm(mode);
  modalMode.value = mode;
  nextTick(() => amountInputRef.value?.focus());
}

function closeModal() {
  modalMode.value = null;
}

const searchClients = debounce(async (q) => {
  if (!q || q.length < 2) {
    clientResults.value = [];
    return;
  }
  try {
    clientResults.value = await searchPeople(q);
  } catch (error) {
    clientResults.value = [];
  }
}, 400);
watch(clientQuery, (q) => searchClients(q));

function selectClient(p) {
  selectedPerson.value = { id: p.id, name: p.name };
  clientQuery.value = '';
  clientResults.value = [];
}

function clearClient() {
  selectedPerson.value = null;
}

async function save() {
  const amount = parseBRLInput(form.amount);
  if (!amount || amount <= 0) {
    toast('warning', 'Informe um valor válido');
    return;
  }
  const pessoaId = props.lockedPerson?.id || selectedPerson.value?.id || null;
  saving.value = true;
  try {
    await addFinance({
      description: form.description || '',
      amount,
      date: form.date || todayISO(),
      type: form.type || 'receita',
      paid: !!form.paid,
      installments: modalMode.value === 'full' ? parseInt(form.installments, 10) || 1 : 1,
      wallet_id: form.wallet_id || null,
      pessoa_id: pessoaId,
    });
    toast('success', 'Lançamento adicionado');
    closeModal();
    emit('saved');
  } catch (error) {
    toast('error', 'Erro ao adicionar');
    console.error('Erro ao adicionar lançamento:', error);
  } finally {
    saving.value = false;
  }
}

// Fecha o menu ao clicar fora do componente.
function onDocClick(e) {
  if (!menuOpen.value) return;
  if (rootRef.value && !rootRef.value.contains(e.target)) menuOpen.value = false;
}

onMounted(async () => {
  document.addEventListener('click', onDocClick);
  try {
    wallets.value = await getWallets();
  } catch (error) {
    wallets.value = [];
  }
});

onUnmounted(() => {
  document.removeEventListener('click', onDocClick);
});
</script>
