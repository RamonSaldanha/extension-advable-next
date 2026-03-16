<template>
  <Layout>
    <template #header>
      <DefaultHeader />
    </template>

    <div class="container">
      <Loader v-if="loading" />
      <div class="d-flex justify-content-between align-items-center">
        <button 
          class="btn btn-sm btn-outline-secondary my-3" 
          @click="handleBack"
        >
          <i class="bi bi-arrow-left-short"></i>
          Voltar
        </button>
        <div class="fw-semibold fs-6 text-muted">
          {{ person.name }}
        </div>
      </div>
      <Card title="Editar Pessoa" icon="bi-person">
        <template #body>
          <!-- Informações Básicas -->
          <div class="mb-2">
            <label class="fw-bold mb-1">Nome</label>
            <input 
              class="form-control form-control-sm" 
              type="text" 
              v-model="person.name"
            />
          </div>
  
          <div class="mb-2">
            <label class="fw-bold mb-1">WhatsApp</label>
            <input 
              class="form-control form-control-sm" 
              type="text" 
              v-maska="'(##) 9 ####-####'"
              v-model="person.whatsapp"
            />
          </div>
  
          <div class="mb-2">
            <label class="fw-bold mb-1">Email</label>
            <input
              class="form-control form-control-sm"
              type="email"
              v-model="person.email"
            />
          </div>
  
          <!-- Documentos -->
          <details class="mt-3">
            <summary class="fw-bold">Documentos</summary>
            <div class="mt-2">
              <div class="mb-2">
                <label class="fw-bold mb-1">CPF</label>
                <input
                  class="form-control form-control-sm"
                  type="text"
                  v-maska="'###.###.###-##'"
                  v-model="person.cpf"
                />
              </div>
  
              <div class="mb-2">
                <label class="fw-bold mb-1">RG</label>
                <input
                  class="form-control form-control-sm"
                  type="text"
                  v-model="person.rg"
                />
              </div>
  
              <div class="mb-2">
                <label class="fw-bold mb-1">CNPJ</label>
                <input
                  class="form-control form-control-sm"
                  type="text"
                  v-maska="'##.###.###/####-##'"
                  v-model="person.cnpj"
                />
              </div>
            </div>
          </details>
  
          <!-- Informações Pessoais -->
          <details class="mt-3">
            <summary class="fw-bold">Informações Pessoais</summary>
            <div class="mt-2">
              <div class="mb-2">
                <label class="fw-bold mb-1">Nacionalidade</label>
                <input
                  class="form-control form-control-sm"
                  type="text"
                  v-model="person.nationality"
                />
              </div>
  
              <div class="mb-2">
                <label class="fw-bold mb-1">Profissão</label>
                <input
                  class="form-control form-control-sm"
                  type="text"
                  v-model="person.occupation"
                />
              </div>
  
              <div class="mb-2">
                <label class="fw-bold mb-1">Data de Nascimento</label>
                <input
                  class="form-control form-control-sm"
                  type="text"
                  v-maska="'##/##/####'"
                  v-model="person.birthday"
                />
              </div>
              <div class="mb-2">
                <label class="fw-bold mb-1">Estado Civil</label>
                <select
                class="form-select form-select-sm"
                v-model="person.civil_status"
                >
                <option value="solteiro">Solteiro(a)</option>
                <option value="casado">Casado(a)</option>
                <option value="união estável">União Estável</option>
                <option value="divorciado">Divorciado(a)</option>
                <option value="viúvo">Viúvo(a)</option>
              </select>
              </div>
            </div>
          </details>
  
          <!-- Endereço -->
          <details class="mt-3">
            <summary class="fw-bold">Endereço</summary>
            <div class="mt-2">
              <div class="mb-2">
                <label class="fw-bold mb-1">CEP</label>
                <input
                  class="form-control form-control-sm"
                  type="text"
                  v-maska="'#####-###'"
                  v-model="person.address_zip"
                />
              </div>
  
              <div class="mb-2">
                <label class="fw-bold mb-1">Cidade</label>
                <input
                  class="form-control form-control-sm"
                  type="text"
                  v-model="person.address_city"
                />
              </div>
  
              <div class="mb-2">
                <label class="fw-bold mb-1">Estado</label>
                <input
                  class="form-control form-control-sm"
                  type="text"
                  v-maska="'##'"
                  v-model="person.address_state"
                />
              </div>
  
              <div class="mb-2">
                <label class="fw-bold mb-1">Logradouro</label>
                <input
                  class="form-control form-control-sm"
                  type="text"
                  v-model="person.address_name"
                />
              </div>
  
              <div class="mb-2">
                <label class="fw-bold mb-1">Número</label>
                <input
                  class="form-control form-control-sm"
                  type="text"
                  v-model="person.address_num"
                />
              </div>
  
              <div class="mb-2">
                <label class="fw-bold mb-1">Complemento</label>
                <input
                  class="form-control form-control-sm"
                  type="text"
                  v-model="person.address_extra"
                />
              </div>
  
              <div class="mb-2">
                <label class="fw-bold mb-1">Bairro</label>
                <input
                  class="form-control form-control-sm"
                  type="text"
                  v-model="person.district"
                />
              </div>
            </div>
          </details>
          <button 
            class="btn btn-primary mt-3"
            @click="updatePerson"
          >
            Salvar Alterações
          </button>
        </template>
      </Card>
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

<style scoped>
/* Estilos específicos se necessário */
</style>
