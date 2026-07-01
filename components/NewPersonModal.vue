<!--
  NewPersonModal.vue — cadastro de cliente em modal, com todos os campos (iguais
  aos de editar) e busca de endereço por CEP (ViaCEP). Controlado por `show`;
  emite `created` (com a pessoa criada) e `close`.
-->
<template>
  <teleport to="body">
    <div v-if="show" class="fin-modal__backdrop" @click.self="$emit('close')">
      <div class="fin-modal" role="dialog" aria-modal="true">
        <div class="fin-modal__head">
          <span class="fin-modal__title">
            <i class="bi bi-person-plus"></i>
            Novo cliente
          </span>
          <button class="fin-modal__x" title="Fechar" @click="$emit('close')"><i class="bi bi-x-lg"></i></button>
        </div>

        <div class="fin-modal__body">
          <div class="adbl-field">
            <label class="adbl-label">Nome</label>
            <input class="adbl-input" type="text" v-model="form.name" />
          </div>

          <div class="adbl-field">
            <label class="adbl-label">WhatsApp</label>
            <input class="adbl-input" type="text" v-maska="'(##) #####-####'" v-model="form.whatsapp" />
          </div>

          <div class="adbl-field">
            <label class="adbl-label">Email</label>
            <input class="adbl-input" type="email" v-model="form.email" />
          </div>

          <details class="adbl-accordion" style="margin-top: 8px">
            <summary>Documentos</summary>
            <div class="adbl-accordion__body">
              <div class="adbl-field">
                <label class="adbl-label">CPF</label>
                <input class="adbl-input" type="text" v-maska="'###.###.###-##'" v-model="form.cpf" />
              </div>
              <div class="adbl-field">
                <label class="adbl-label">RG</label>
                <input class="adbl-input" type="text" v-model="form.rg" />
              </div>
              <div class="adbl-field">
                <label class="adbl-label">CNPJ</label>
                <input class="adbl-input" type="text" v-maska="'##.###.###/####-##'" v-model="form.cnpj" />
              </div>
            </div>
          </details>

          <details class="adbl-accordion">
            <summary>Informações Pessoais</summary>
            <div class="adbl-accordion__body">
              <div class="adbl-field">
                <label class="adbl-label">Nacionalidade</label>
                <input class="adbl-input" type="text" v-model="form.nationality" />
              </div>
              <div class="adbl-field">
                <label class="adbl-label">Profissão</label>
                <input class="adbl-input" type="text" v-model="form.occupation" />
              </div>
              <div class="adbl-field">
                <label class="adbl-label">Data de Nascimento</label>
                <input class="adbl-input" type="text" v-maska="'##/##/####'" v-model="form.birthday" />
              </div>
              <div class="adbl-field">
                <label class="adbl-label">Estado Civil</label>
                <select class="adbl-select" v-model="form.civil_status">
                  <option value="">Selecione</option>
                  <option value="solteiro">Solteiro(a)</option>
                  <option value="casado">Casado(a)</option>
                  <option value="união estável">União Estável</option>
                  <option value="divorciado">Divorciado(a)</option>
                  <option value="viúvo">Viúvo(a)</option>
                </select>
              </div>
            </div>
          </details>

          <details class="adbl-accordion">
            <summary>Endereço</summary>
            <div class="adbl-accordion__body">
              <div class="adbl-field">
                <label class="adbl-label">CEP</label>
                <input class="adbl-input" type="text" v-maska="'#####-###'" v-model="form.address_zip" />
              </div>
              <div class="adbl-field">
                <label class="adbl-label">Cidade</label>
                <input class="adbl-input" type="text" v-model="form.address_city" />
              </div>
              <div class="adbl-field">
                <label class="adbl-label">Estado</label>
                <input class="adbl-input" type="text" placeholder="UF (ex: SP)" v-maska="'##'" v-model="form.address_state" />
              </div>
              <div class="adbl-field">
                <label class="adbl-label">Logradouro</label>
                <input class="adbl-input" type="text" v-model="form.address_name" />
              </div>
              <div class="adbl-field">
                <label class="adbl-label">Número</label>
                <input class="adbl-input" type="text" v-model="form.address_num" />
              </div>
              <div class="adbl-field">
                <label class="adbl-label">Complemento</label>
                <input class="adbl-input" type="text" v-model="form.address_extra" />
              </div>
              <div class="adbl-field">
                <label class="adbl-label">Bairro</label>
                <input class="adbl-input" type="text" v-model="form.district" />
              </div>
            </div>
          </details>
        </div>

        <div class="fin-modal__foot">
          <button class="adbl-btn adbl-btn--outline" @click="$emit('close')">Cancelar</button>
          <button class="adbl-btn adbl-btn--primary" :disabled="saving" @click="save">
            <span v-if="saving" class="spinner-border spinner-border-sm me-1"></span>
            <i v-else class="bi bi-check2"></i>
            Salvar
          </button>
        </div>
      </div>
    </div>
  </teleport>
</template>

<script setup>
import { reactive, ref, watch } from 'vue';
import axios from 'axios';
import debounce from 'lodash.debounce';
import Swal from 'sweetalert2';
import { addPeople } from '@/api/people';

const props = defineProps({
  show: { type: Boolean, default: false },
});
const emit = defineEmits(['close', 'created']);

const saving = ref(false);

function blankForm() {
  return {
    name: '',
    whatsapp: '',
    email: '',
    cpf: '',
    rg: '',
    cnpj: '',
    nationality: '',
    occupation: '',
    birthday: '',
    civil_status: '',
    address_zip: '',
    address_city: '',
    address_state: '',
    address_name: '',
    address_num: '',
    address_extra: '',
    district: '',
  };
}

const form = reactive(blankForm());

function resetForm() {
  Object.assign(form, blankForm());
}

// Reabre sempre limpo.
watch(
  () => props.show,
  (open) => {
    if (open) resetForm();
  }
);

function toast(icon, title, text) {
  Swal.fire({
    toast: true,
    position: 'top-end',
    icon,
    title,
    text,
    showConfirmButton: false,
    timer: 2800,
    timerProgressBar: true,
  });
}

// Preenche o endereço a partir do CEP (ViaCEP) — mesmo padrão de EditPerson.vue.
async function fetchAddressByZip(zip) {
  const cleaned = String(zip || '').replace(/\D/g, '');
  if (cleaned.length !== 8) return;
  try {
    const { data } = await axios.get(`https://viacep.com.br/ws/${cleaned}/json/`);
    if (!data.erro) {
      form.address_city = data.localidade;
      form.address_state = data.uf;
      form.address_name = data.logradouro;
      form.district = data.bairro;
    }
  } catch (error) {
    console.error('Erro ao buscar CEP:', error);
  }
}

watch(
  () => form.address_zip,
  debounce((zip) => fetchAddressByZip(zip), 500)
);

async function save() {
  if (!form.name) {
    toast('warning', 'Informe o nome');
    return;
  }
  saving.value = true;
  try {
    const response = await addPeople({ ...form });
    toast('success', 'Cliente cadastrado');
    emit('created', response?.person || null);
    emit('close');
  } catch (error) {
    const errors = error.response?.data?.errors;
    const msg = errors
      ? Object.entries(errors)
          .map(([field, messages]) => `${field}: ${messages.join(', ')}`)
          .join('\n')
      : 'Tente novamente mais tarde.';
    toast('error', 'Erro ao cadastrar', msg);
    console.error('Erro ao salvar pessoa:', error);
  } finally {
    saving.value = false;
  }
}
</script>
