<template>
  <Layout>
    <template #header>
      <DefaultHeader />
    </template>

    <div class="container">
      <Loader v-if="loading" />
      <div v-if="!newCase.external_chat_id" class="select-chat">
        <div class="text-center fs-5">
          <p>Navegue até um chat do WhatsApp para visualizar as informações</p> 
          <i class="bi bi-chat-left-text fs-1 text-muted"></i>
        </div>
      </div>
      <div v-else-if="person && Object.keys(person).length > 0">
        <div class="text-center">
          <div class="fs-5 fw-semibold mb-0">{{ person.name }}</div>
          <div><i class="bi bi-whatsapp"></i> {{ person.whatsapp }}</div>
          <div><i class="bi bi-envelope"></i> {{ person.email || 'E-mail não cadastrado' }}</div>       
        </div>

        <div class="my-4 text-center">
          <button 
            class="btn btn-dark btn-sm me-2"
            data-bs-toggle="modal" 
            data-bs-target="#createCaseModal"
          >
            <i class='bx bxs-plus-circle'></i>
            Criar Nova Negociação
          </button>
          <router-link 
            :to="`/people/edit/${person.id}`"
            class="btn btn-outline-primary btn-sm me-2"
          >
            <i class="bi bi-pencil-square"></i>
            Edita pessoa
          </router-link>
          <a 
            :href="`${peopleEditUrl}${person.id}`" 
            target="_blank" 
            class="btn btn-outline-primary btn-sm"
          >
            <i class="bi bi-box-arrow-up-right"></i>
            Ver no Advable
          </a>
        </div>

        <CreateCaseModal
          :states="states"
          :chat-id="rawChatId"
          :person-id="person?.id"
          @case-created="handleCaseCreated"
        />

        <Card title="Negociaçãoes">
          <template #body>
            <ul class="list-group list-group-flush"> 
              <div
                v-for="caso in person.cases" 
                :key="caso.id"
                class="list-group-item list-group-item-action d-flex justify-content-between align-items-center"
              >
                <div>
                  <div class="mb-2 fw-semibold">
                    {{ caso.title }}
                  </div>

                  <!-- <div class="small" v-if="caso.stage.name"><i class="bi bi-funnel"></i> {{ caso.stage.name }}</div> -->
                  <div class=" d-flex align-items-center my-1">
                    <div class="rating small text-warning me-2">
                      <i v-for="star in 5" 
                         :key="star"
                         :class="[
                           'bi',
                           star <= (caso.rating || 0) ? 'bi-star-fill' : 'bi-star'
                         ]"
                      ></i>
                    </div>
                    <span class="fw-semibold text-success">{{ formatCasePrice(caso.price) }}</span>
                  </div>
                  <div v-if="caso.stage.name" class="small">
                    <i class="bi bi-funnel"></i> Etapa: {{ caso.stage.name }}
                  </div>
                </div>
                <div>
                  <router-link :to="`/case/edit/${caso.uuid}`" 
                     class="btn btn-outline-primary btn-sm"
                  >
                    <i class="bi bi-pencil-square"></i>
                    Editar
                  </router-link>
                </div>
              </div>
            </ul>
          </template>
        </Card>

      </div>
      <div v-else>
        <div class="mb-3 d-flex align-items-center">
          <i class="bi bi-person-fill-exclamation fs-3 me-3"></i> Essa pessoa ainda não foi cadastrada!
        </div>

        <!-- Vincular este chat a um cliente já existente no banco -->
        <Card title="Vincular a um cliente já cadastrado" class="mb-3">
          <template #body>
            <input
              class="form-control form-control-sm mb-2"
              type="text"
              placeholder="Buscar cliente por nome"
              v-model="linkQuery"
            />
            <ul v-if="linkResults.length" class="list-group list-group-flush">
              <li
                v-for="p in linkResults"
                :key="p.id"
                class="list-group-item list-group-item-action d-flex justify-content-between align-items-center"
              >
                <span>
                  {{ p.name }}
                  <small v-if="p.whatsapp" class="text-muted">· {{ p.whatsapp }}</small>
                </span>
                <button
                  class="btn btn-sm btn-outline-primary"
                  :disabled="linking"
                  @click="linkExisting(p)"
                >
                  Vincular
                </button>
              </li>
            </ul>
            <div v-else-if="linkQuery.length >= 2" class="text-muted small">
              Nenhum cliente encontrado.
            </div>
          </template>
        </Card>

        <Card title="Salvar pessoa">
          <template #body>
  
            <!-- Informações Básicas -->
            <div class="mb-2">
              <label class="fw-bold mb-1">Nome</label>
              <input 
                class="form-control form-control-sm" 
                type="text" 
                v-model="newPerson.name"
              />
            </div>
    
            <div class="mb-2">
              <label class="fw-bold mb-1">WhatsApp</label>
              <input 
                class="form-control form-control-sm" 
                type="text" 
                v-maska="'(##) 9 ####-####'"
                v-model="newPerson.whatsapp"
              />
            </div>
    
            <div class="mb-2">
              <label class="fw-bold mb-1">Email</label>
              <input
                class="form-control form-control-sm"
                type="email"
                v-model="newPerson.email"
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
                    v-model="newPerson.cpf"
                  />
                </div>
    
                <div class="mb-2">
                  <label class="fw-bold mb-1">RG</label>
                  <input
                    class="form-control form-control-sm"
                    type="text"
                    v-model="newPerson.rg"
                  />
                </div>
    
                <div class="mb-2">
                  <label class="fw-bold mb-1">CNPJ</label>
                  <input
                    class="form-control form-control-sm"
                    type="text"
                    v-maska="'##.###.###/####-##'"
                    v-model="newPerson.cnpj"
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
                    v-model="newPerson.nationality"
                  />
                </div>
    
                <div class="mb-2">
                  <label class="fw-bold mb-1">Profissão</label>
                  <input
                    class="form-control form-control-sm"
                    type="text"
                    v-model="newPerson.occupation"
                  />
                </div>
    
                <div class="mb-2">
                  <label class="fw-bold mb-1">Data de Nascimento</label>
                  <input
                    class="form-control form-control-sm"
                    type="text"
                    v-maska="'##/##/####'"
                    v-model="newPerson.birthday"
                  />
                </div>

                <div class="mb-2">
                  <label class="fw-bold mb-1">Estado Civil</label>
                  <select
                  class="form-select form-select-sm"
                  v-model="newPerson.civilStatus"
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
                    v-model="newPerson.address_zip"
                  />
                </div>
    
                <div class="mb-2">
                  <label class="fw-bold mb-1">Cidade</label>
                  <input
                    class="form-control form-control-sm"
                    type="text"
                    v-model="newPerson.address_city"
                  />
                </div>
    
                <div class="mb-2">
                  <label class="fw-bold mb-1">Estado</label>
                  <input
                    class="form-control form-control-sm"
                    type="text"
                    placeholder="UF (ex: SP)"
                    v-model="newPerson.address_state"
                  />
                </div>
    
                <div class="mb-2">
                  <label class="fw-bold mb-1">Logradouro</label>
                  <input
                    class="form-control form-control-sm"
                    type="text"
                    v-model="newPerson.address_name"
                  />
                </div>
    
                <div class="mb-2">
                  <label class="fw-bold mb-1">Número</label>
                  <input
                    class="form-control form-control-sm"
                    type="text"
                    v-model="newPerson.address_num"
                  />
                </div>
    
                <div class="mb-2">
                  <label class="fw-bold mb-1">Complemento</label>
                  <input
                    class="form-control form-control-sm"
                    type="text"
                    v-model="newPerson.address_extra"
                  />
                </div>
    
                <div class="mb-2">
                  <label class="fw-bold mb-1">Bairro</label>
                  <input
                    class="form-control form-control-sm"
                    type="text"
                    v-model="newPerson.district"
                  />
                </div>
              </div>
            </details>
            <button 
              class="btn btn-primary mt-3"
              @click="savePerson"
            >
              Salvar
            </button>
          </template>
        </Card>
      </div>
    </div>
  </Layout>
</template>

<script setup>
import { ref, onMounted, watch, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import Layout from '@/components/Layout.vue';
import DefaultHeader from '@/components/DefaultHeader.vue';
import CreateCaseModal from '@/components/CreateCaseModal.vue';
import Swal from 'sweetalert2';
import Card from '@/components/Card.vue';
import debounce from 'lodash.debounce';
import { getPerson, addPeople, getAllStates, addCase, linkChat, searchPeople } from '@/api/people';
import { displayBR } from '@/utils/phone';
const route = useRoute();
const router = useRouter();
const chatId = ref(route.params.chatId); // chave de busca (telefone @c.us ou id @lid)
const chatName = ref(route.params.chatName);
const rawChatId = ref(''); // id estável do WhatsApp (@lid/@c.us) p/ vínculo
const searchPhone = ref(''); // telefone (@c.us) p/ busca, quando houver
const person = ref(null);

// Vínculo manual (quando o chat não casa com nenhum cliente automaticamente)
const linkQuery = ref('');
const linkResults = ref([]);
const linking = ref(false);
import Loader from '@/components/Loader.vue';
import axios from 'axios';
const loading = ref(false);

const newCase = ref({
  title: '',
  rating: 0,
  state_id: '',
  price: '',
  external_chat_id: null,
  person_id: null,
});

const handleCaseCreated = (newCase) => {
  person.value.cases.push(newCase);
};

// Dados da nova pessoa
const newPerson = ref({
  name: '',
  whatsapp: '',
  email: '',
  cpf: '',
  rg: '',
  cnpj: '',
  nationality: '',
  occupation: '',
  birthday: '',
  civilStatus: '',
  address_zip: '',
  address_city: '',
  address_state: '',
  address_name: '',
  address_num: '',
  address_extra: '',
  district: ''
});

const fetchAddressByZip = async (zip) => {
  try {
    const cleanedZip = zip.replace(/\D/g, '');
    if (cleanedZip.length === 8) {
      const response = await axios.get(`https://viacep.com.br/ws/${cleanedZip}/json/`);
      if (!response.data.erro) {
        newPerson.value.address_city = response.data.localidade;
        newPerson.value.address_state = response.data.uf;
        newPerson.value.address_name = response.data.logradouro;
        newPerson.value.district = response.data.bairro;
      }
    }
  } catch (error) {
    console.error('Erro ao buscar CEP:', error);
  }
};

watch(() => newPerson.value.address_zip, debounce((newZip) => {
  fetchAddressByZip(newZip);
}, 500));

const states = ref([]);

const caseEditUrl = computed(() => `${import.meta.env.VITE_APP_BASE_URL}crm/case/`);
const peopleEditUrl = computed(() => `${import.meta.env.VITE_APP_BASE_URL}people/details/`);

const savePerson = async () => {
  loading.value = true;
  try {
    const response = await addPeople(newPerson.value);
    Swal.fire({
      toast: true,
      position: 'top-end',
      icon: 'success',
      title: 'Pessoa cadastrada com sucesso',
      showConfirmButton: false,
      timer: 3000,
      timerProgressBar: true
    });
    person.value = response.person;
  } catch ( error ) {
    const errors = error.response?.data?.errors;
    let errorMessage = '';
    
    if (errors && Object.keys(errors).length > 0) {
      // Monta mensagem com todos os campos com erro
      errorMessage = Object.entries(errors)
        .map(([field, messages]) => `${field}: ${messages.join(', ')}`)
        .join('\n');
    } else {
      // Mensagem genérica caso não seja erro de validação
      errorMessage = 'Ocorreu um erro ao salvar. Tente novamente mais tarde.';
    }
    
    Swal.fire({
      toast: true,
      position: 'top-end',
      icon: 'error', // Corrigido de 'danger' para 'error'
      title: 'Erro ao cadastrar pessoa',
      text: errorMessage,
      showConfirmButton: false,
      timer: 3000,
      timerProgressBar: true
    });

    console.error('Erro ao salvar pessoa:', error);
  } finally {
    loading.value = false;
  }
};

const formatCasePrice = (price) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(price || 0);
};

// Busca a pessoa pelo telefone (E.164 canônico no backend, tolerante ao 9º
// dígito) e/ou pelo id estável do chat (resolve @lid via vínculo manual).
const fetchPerson = async () => {
  loading.value = true;
  try {
    const response = await getPerson({
      phone: searchPhone.value, // só telefone real (@c.us); @lid resolve por chatId
      chatId: rawChatId.value,
    });
    person.value = response && Object.keys(response).length > 0 ? response : null;
    if (person.value) {
      newCase.value.person_id = person.value.id;
    }
  } catch (error) {
    person.value = null;
    console.error('Erro ao buscar pessoa:', error);
  } finally {
    loading.value = false;
  }
};

// Observar mudanças no chatId (o listener reatribui chatId.value ao trocar chat)
watch(chatId, async (newChatId) => {
  if (newChatId) {
    linkQuery.value = '';
    linkResults.value = [];
    await fetchPerson();
  }
});

// Busca de clientes existentes para vínculo manual.
const searchExisting = debounce(async (q) => {
  if (!q || q.length < 2) {
    linkResults.value = [];
    return;
  }
  try {
    linkResults.value = await searchPeople(q);
  } catch (error) {
    linkResults.value = [];
  }
}, 400);

watch(linkQuery, (q) => searchExisting(q));

// Vincula o chat atual a um cliente já cadastrado.
const linkExisting = async (p) => {
  linking.value = true;
  try {
    const res = await linkChat(p.id, {
      chat_id: rawChatId.value || chatId.value,
      phone: searchPhone.value || '',
    });
    person.value = res.person;
    newCase.value.person_id = res.person?.id;
    Swal.fire({
      toast: true,
      position: 'top-end',
      icon: 'success',
      title: 'Cliente vinculado a esta conversa',
      showConfirmButton: false,
      timer: 2500,
      timerProgressBar: true,
    });
  } catch (error) {
    Swal.fire({
      toast: true,
      position: 'top-end',
      icon: 'error',
      title: 'Erro ao vincular cliente',
      showConfirmButton: false,
      timer: 2500,
      timerProgressBar: true,
    });
    console.error('Erro ao vincular:', error);
  } finally {
    linking.value = false;
  }
};

const fetchStates = async () => {
  loading.value = true;
  try {
    const response = await getAllStates();
    states.value = response;
  } catch (error) {
    console.error('Erro ao buscar estados:', error);
  } finally {
    loading.value = false;
  }
};

// Preenche os refs de identidade (telefone e id do chat) a partir de um chat.
const applyChat = ({ chatId: rawId, phone, chatName: name }) => {
  rawChatId.value = rawId || '';
  searchPhone.value = phone || (String(rawId || '').endsWith('@c.us') ? rawId : '');
  newPerson.value.whatsapp = searchPhone.value ? displayBR(searchPhone.value) : '';
  newPerson.value.name = name || '';
  newCase.value.external_chat_id = rawId || '';
};

onMounted(async () => {
  const lastChat = JSON.parse(localStorage.getItem('last_chat') || 'null');
  if (lastChat?.chatId) {
    applyChat(lastChat);
  } else if (chatId.value) {
    // Sem last_chat: usa o parâmetro de rota como identidade.
    applyChat({ chatId: chatId.value, phone: '', chatName: chatName.value });
  }

  if (chatId.value) {
    await fetchPerson();
    await fetchStates();
  }
});

// Listener para mensagens do content script (troca de conversa)
browser.runtime.onMessage.addListener((message) => {
  if (message.type !== 'WHATSAPP_CHAT_CHANGED' || !message.chatId) return;

  const searchKey = message.phone || message.chatId;
  if (searchKey === chatId.value) return;

  loading.value = true;
  try {
    chatName.value = message.chatName;
    applyChat(message);

    localStorage.setItem(
      'last_chat',
      JSON.stringify({
        chatId: message.chatId,
        phone: message.phone || '',
        chatName: message.chatName,
        timestamp: new Date().toISOString(),
      })
    );

    // Reatribuir chatId.value dispara o watch(chatId) -> fetchPerson().
    chatId.value = searchKey;

    router.push({
      name: 'Person',
      params: {
        chatId: searchKey,
        chatName: message.chatName,
      },
    });
  } finally {
    loading.value = false;
  }
});
</script>

<style scoped>

</style>
