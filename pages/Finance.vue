<template>
  <Layout>
    <template #header>
      <DefaultHeader />
    </template>

    <div class="adbl-page fin-page">
      <Loader v-if="loading" />

      <div class="fin-head">
        <h1 class="ad-page-title">Finanças</h1>
        <div class="fin-monthnav">
          <button class="fin-navbtn" title="Mês anterior" @click="prevMonth">
            <i class="bi bi-chevron-left"></i>
          </button>
          <span class="fin-monthlabel">{{ monthLabel }}</span>
          <button class="fin-navbtn" title="Próximo mês" @click="nextMonth">
            <i class="bi bi-chevron-right"></i>
          </button>
        </div>
      </div>

      <div class="fin-summary">
        <div class="fin-summary__item">
          <span class="fin-summary__label">Recebido</span>
          <span class="fin-summary__value fin-summary__value--paid">{{ formatBRL(summarySum.pago) }}</span>
        </div>
        <div class="fin-summary__item">
          <span class="fin-summary__label">A receber</span>
          <span class="fin-summary__value">{{ formatBRL(summarySum.pendente) }}</span>
        </div>
        <div class="fin-summary__item">
          <span class="fin-summary__label">Atrasado</span>
          <span class="fin-summary__value fin-summary__value--late">{{ formatBRL(summarySum.atrasado) }}</span>
        </div>
      </div>

      <div class="fin-toolbar">
        <FinanceAdder @saved="load" />
      </div>

      <div class="ad-tabs">
        <button class="ad-tab" :class="{ active: activeTab === 'todos' }" @click="activeTab = 'todos'">
          Todos <span v-if="finances.length" class="ad-tab__badge ad-tab__badge--all">{{ finances.length }}</span>
        </button>
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

      <div class="adbl-card" style="margin-top: 12px">
        <div class="adbl-card__body">
          <ul v-if="visibleFinances.length" class="fin-list">
            <li v-for="f in visibleFinances" :key="f.id" class="fin-row">
              <div class="fin-row__info">
                <div class="fin-row__desc">{{ f.person ? titleCasePtBr(f.person.name) : 'Sem cliente' }}</div>
                <div class="fin-row__meta">
                  <span class="fin-sub">{{ f.description || 'Pagamento' }}</span>
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
                </div>
                <button class="adbl-btn adbl-btn--outline adbl-btn--sm" title="Extrato" @click="receiptFinance = f">
                  <i class="bi bi-receipt"></i>
                </button>
              </div>
            </li>
          </ul>

          <div v-else class="adbl-empty" style="padding: 24px 0 12px">
            <i class="bi bi-wallet2"></i>
            <p>Nenhum lançamento neste mês.</p>
          </div>
        </div>
      </div>

      <ReceiptModal
        v-if="receiptFinance"
        :finance="receiptFinance"
        :person="receiptFinance.person"
        @close="receiptFinance = null"
      />
    </div>
  </Layout>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue';
import Layout from '@/components/Layout.vue';
import DefaultHeader from '@/components/DefaultHeader.vue';
import Loader from '@/components/Loader.vue';
import PaidSwitch from '@/components/PaidSwitch.vue';
import FinanceAdder from '@/components/FinanceAdder.vue';
import ReceiptModal from '@/components/ReceiptModal.vue';
import Swal from 'sweetalert2';
import { getFinances, setFinancePaid, updateFinance } from '@/api/finance';
import { financeStatus, formatBRL, MONTH_NAMES, STATUS_META } from '@/utils/finance';
import { titleCasePtBr } from '@/utils/text';

const now = new Date();
const month = ref(now.getMonth() + 1);
const year = ref(now.getFullYear());
const finances = ref([]);
const summary = ref(null);
const loading = ref(false);
const activeTab = ref('todos');
const receiptFinance = ref(null);

const monthLabel = computed(() => `${MONTH_NAMES[month.value - 1]} ${year.value}`);

const summarySum = computed(() => (summary.value && summary.value.sum) || { pago: 0, pendente: 0, atrasado: 0 });

const counts = computed(() => {
  const c = { pendente: 0, atrasado: 0, pago: 0 };
  for (const f of finances.value) {
    const status = financeStatus(f);
    c[status] = (c[status] || 0) + 1;
  }
  return c;
});

const visibleFinances = computed(() => {
  if (activeTab.value === 'todos') return finances.value;
  return finances.value.filter((f) => financeStatus(f) === activeTab.value);
});

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

async function load() {
  loading.value = true;
  try {
    const res = await getFinances({ month: month.value, year: year.value });
    finances.value = res.finances || [];
    summary.value = res.summary || null;
  } catch (error) {
    finances.value = [];
    summary.value = null;
    console.error('Erro ao carregar finanças:', error);
  } finally {
    loading.value = false;
  }
}

function prevMonth() {
  if (month.value === 1) {
    month.value = 12;
    year.value -= 1;
  } else {
    month.value -= 1;
  }
  load();
}

function nextMonth() {
  if (month.value === 12) {
    month.value = 1;
    year.value += 1;
  } else {
    month.value += 1;
  }
  load();
}

async function markPaid(f, paid) {
  try {
    const res = await setFinancePaid(f.id, paid);
    const updated = res.finance;
    if (updated) {
      const i = finances.value.findIndex((x) => x.id === updated.id);
      if (i !== -1) finances.value.splice(i, 1, { ...finances.value[i], ...updated });
    }
    // Recalcula os totais a partir da própria lista (sem novo request).
    recomputeSummary();
  } catch (error) {
    toast('error', 'Erro ao atualizar');
    console.error('Erro ao marcar pago:', error);
  }
}

function recomputeSummary() {
  const sum = { pago: 0, pendente: 0, atrasado: 0 };
  for (const f of finances.value) {
    const signed = f.type === 'despesa' ? -1 : 1;
    sum[financeStatus(f)] += signed * Number(f.amount || 0);
  }
  summary.value = { ...(summary.value || {}), sum };
}

// Mudar o vencimento; recarrega o mês (a data pode sair do filtro / mudar a situação).
async function onChangeDate(f, event) {
  const date = event.target.value;
  if (!date) return;
  try {
    await updateFinance(f.id, { date });
    toast('success', 'Vencimento atualizado');
    await load();
  } catch (error) {
    toast('error', 'Erro ao mudar vencimento');
    console.error('Erro ao mudar vencimento:', error);
  }
}

onMounted(load);
</script>
