<!--
  ReceiptModal.vue — recibo/extrato de uma transação em texto (só caracteres),
  pronto para copiar e enviar no WhatsApp. Usado em Finance.vue e PersonFinance.vue.
  - finance: o lançamento (obrigatório).
  - person: { name, cpf, cnpj } opcional (na ficha vem do cliente; na visão geral
    vem de finance.person).
-->
<template>
  <teleport to="body">
    <div class="fin-modal__backdrop" @click.self="$emit('close')">
      <div class="fin-modal" role="dialog" aria-modal="true">
        <div class="fin-modal__head">
          <span class="fin-modal__title">
            <i class="bi bi-receipt"></i>
            Extrato
          </span>
          <button class="fin-modal__x" title="Fechar" @click="$emit('close')"><i class="bi bi-x-lg"></i></button>
        </div>

        <div class="fin-modal__body">
          <pre class="fin-receipt">{{ text }}</pre>
        </div>

        <div class="fin-modal__foot">
          <button class="adbl-btn adbl-btn--outline" @click="$emit('close')">Fechar</button>
          <button class="adbl-btn adbl-btn--primary" @click="copy">
            <i class="bi bi-clipboard-check"></i>
            Copiar
          </button>
        </div>
      </div>
    </div>
  </teleport>
</template>

<script setup>
import { computed } from 'vue';
import Swal from 'sweetalert2';
import { buildReceipt } from '@/utils/finance';

const props = defineProps({
  finance: { type: Object, required: true },
  person: { type: Object, default: null },
});
defineEmits(['close']);

const text = computed(() => buildReceipt(props.finance, props.person));

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

async function copy() {
  try {
    await navigator.clipboard.writeText(text.value);
    toast('success', 'Extrato copiado');
    return;
  } catch (error) {
    // Fallback p/ contextos sem permissão de clipboard.
  }
  try {
    const ta = document.createElement('textarea');
    ta.value = text.value;
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
</script>
