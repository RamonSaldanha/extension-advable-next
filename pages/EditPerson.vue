<template>
  <Layout>
    <template #header>
      <DefaultHeader />
    </template>

    <div class="adbl-page">
      <Loader v-if="loading" />

      <div class="adbl-subhead">
        <button class="adbl-back" @click="handleBack">
          <i class="bi bi-arrow-left-short"></i>
          Voltar
        </button>
        <div class="adbl-subhead__ctx">{{ person.name }}</div>
      </div>

      <div class="adbl-card">
        <div class="adbl-card__head">
          <span class="adbl-card__head-icon"><i class="bi bi-person"></i></span>
          <span class="adbl-card__title">Editar Pessoa</span>
        </div>
        <div class="adbl-card__body">
          <div class="adbl-field">
            <label class="adbl-label">Nome</label>
            <input class="adbl-input" type="text" v-model="person.name" />
          </div>

          <div class="adbl-field">
            <label class="adbl-label">WhatsApp</label>
            <input class="adbl-input" type="text" v-maska="'(##) 9 ####-####'" v-model="person.whatsapp" />
          </div>

          <div class="adbl-field">
            <label class="adbl-label">Email</label>
            <input class="adbl-input" type="email" v-model="person.email" />
          </div>

          <details class="adbl-accordion" style="margin-top: 16px">
            <summary>Documentos</summary>
            <div class="adbl-accordion__body">
              <div class="adbl-field">
                <label class="adbl-label">CPF</label>
                <input class="adbl-input" type="text" v-maska="'###.###.###-##'" v-model="person.cpf" />
              </div>
              <div class="adbl-field">
                <label class="adbl-label">RG</label>
                <input class="adbl-input" type="text" v-model="person.rg" />
              </div>
              <div class="adbl-field">
                <label class="adbl-label">CNPJ</label>
                <input class="adbl-input" type="text" v-maska="'##.###.###/####-##'" v-model="person.cnpj" />
              </div>
            </div>
          </details>

          <details class="adbl-accordion">
            <summary>Informações Pessoais</summary>
            <div class="adbl-accordion__body">
              <div class="adbl-field">
                <label class="adbl-label">Nacionalidade</label>
                <input class="adbl-input" type="text" v-model="person.nationality" />
              </div>
              <div class="adbl-field">
                <label class="adbl-label">Profissão</label>
                <input class="adbl-input" type="text" v-model="person.occupation" />
              </div>
              <div class="adbl-field">
                <label class="adbl-label">Data de Nascimento</label>
                <input class="adbl-input" type="text" v-maska="'##/##/####'" v-model="person.birthday" />
              </div>
              <div class="adbl-field">
                <label class="adbl-label">Estado Civil</label>
                <select class="adbl-select" v-model="person.civil_status">
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
                <input class="adbl-input" type="text" v-maska="'#####-###'" v-model="person.address_zip" />
              </div>
              <div class="adbl-field">
                <label class="adbl-label">Cidade</label>
                <input class="adbl-input" type="text" v-model="person.address_city" />
              </div>
              <div class="adbl-field">
                <label class="adbl-label">Estado</label>
                <input class="adbl-input" type="text" v-maska="'##'" v-model="person.address_state" />
              </div>
              <div class="adbl-field">
                <label class="adbl-label">Logradouro</label>
                <input class="adbl-input" type="text" v-model="person.address_name" />
              </div>
              <div class="adbl-field">
                <label class="adbl-label">Número</label>
                <input class="adbl-input" type="text" v-model="person.address_num" />
              </div>
              <div class="adbl-field">
                <label class="adbl-label">Complemento</label>
                <input class="adbl-input" type="text" v-model="person.address_extra" />
              </div>
              <div class="adbl-field">
                <label class="adbl-label">Bairro</label>
                <input class="adbl-input" type="text" v-model="person.district" />
              </div>
            </div>
          </details>

          <button class="adbl-btn adbl-btn--primary adbl-btn--block" style="margin-top: 6px" @click="updatePerson">
            <i class="bi bi-check2"></i>
            Salvar Alterações
          </button>
        </div>
      </div>
    </div>
  </Layout>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import axios from 'axios'
import Swal from 'sweetalert2'
import Layout from '@/components/Layout.vue'
import DefaultHeader from '@/components/DefaultHeader.vue'
import Card from '@/components/Card.vue'
import Loader from '@/components/Loader.vue'
import { getPersonById, updateApiPerson } from '@/api/people'
import debounce from 'lodash.debounce';

const route = useRoute()
const router = useRouter()
const loading = ref(false)
const isInitialLoad = ref(true)

const person = ref({
  name: '',
  whatsapp: '',
  email: '',
  cpf: '',
  rg: '',
  cnpj: '',
  nationality: '',
  occupation: '',
  birthday: '',
  address_zip: '',
  address_city: '',
  address_state: '',
  address_name: '',
  address_num: '',
  address_extra: '',
  district: '',
  civil_status: ''
});

const fetchAddressByZip = async (zip) => {
  if (!zip) return; // Retorna se o CEP for nulo

  try {
    const cleanedZip = zip.replace(/\D/g, '');
    if (cleanedZip.length === 8) {
      const response = await axios.get(`https://viacep.com.br/ws/${cleanedZip}/json/`);
      if (!response.data.erro) {
        person.value.address_city = response.data.localidade;
        person.value.address_state = response.data.uf;
        person.value.address_name = response.data.logradouro;
        person.value.district = response.data.bairro;
      }
    }
  } catch (error) {
    console.error('Erro ao buscar CEP:', error);
  }
};

// Watch com verificação de carregamento inicial
watch(() => person.value.address_zip,
  debounce((newZip) => {
    if (!isInitialLoad.value) {
      fetchAddressByZip(newZip);
    }
  }, 500)
);

const formatDateToDisplay = (date) => {
  if (!date) return ''
  const [year, month, day] = date.split('-')
  return `${day}/${month}/${year}`
}

const formatDateToApi = (date) => {
  if (!date) return ''
  const [day, month, year] = date.split('/')
  return `${year}-${month}-${day}`
}

const fetchPerson = async (id) => {
  loading.value = true
  try {
    const response = await getPersonById(id)
    // Formata a data antes de exibir
    response.birthday = formatDateToDisplay(response.birthday)
    person.value = response
  } catch (error) {
    console.error('Erro ao buscar pessoa:', error)
  } finally {
    loading.value = false
    isInitialLoad.value = false
  }
}

const updatePerson = async () => {
  loading.value = true
  try {
    const personToUpdate = { ...person.value }
    // Converte a data de volta para o formato da API
    personToUpdate.birthday = formatDateToApi(personToUpdate.birthday)
    await updateApiPerson(route.params.id, personToUpdate)
    Swal.fire({
      toast: true,
      position: 'top-end',
      icon: 'success',
      title: 'Pessoa atualizada com sucesso',
      showConfirmButton: false,
      timer: 3000,
      timerProgressBar: true
    });
  } catch (error) {
    console.error('Erro ao atualizar pessoa:', error)
    Swal.fire({
      toast: true,
      position: 'top-end',
      icon: 'error',
      title: 'Erro ao atualizar pessoa',
      showConfirmButton: false,
      timer: 3000,
      timerProgressBar: true
    });
  } finally {
    loading.value = false
  }
}

const handleBack = () => {
  const lastChat = JSON.parse(localStorage.getItem('last_chat'))
  if (lastChat?.chatId && lastChat?.chatName) {
    console.log('Last chat encontrado:', lastChat)
    router.push({
      path: `/person/search/${lastChat.chatId}/${encodeURIComponent(lastChat.chatName)}`
    })
  } else {
    console.log('Last chat não encontrado, voltando...')
    router.go(-1)
  }
}

onMounted(() => {
  fetchPerson(route.params.id)
})
</script>

<style scoped></style>
