<template>
  <Layout>
    <template #header>
      <DefaultHeader />
    </template>

    <div class="adbl-page">
      <Loader v-if="loading" />

      <!-- Sem chat selecionado e sem cliente carregado (ex.: aberto por id) -->
      <div v-if="!newCase.external_chat_id && !person" class="adbl-empty" style="padding-top: 56px">
        <i class="bi bi-chat-left-text"></i>
        <p>Navegue até um chat do WhatsApp para visualizar as informações.</p>
      </div>

      <!-- Cliente cadastrado -->
      <div v-else-if="person && Object.keys(person).length > 0" class="adbl-stack">
        <div class="adbl-card">
          <div class="adbl-profile">
            <div class="adbl-profile__name">{{ person.name }}</div>
            <div class="adbl-profile__contacts">
              <span class="adbl-contact">
                <i class="bi bi-whatsapp"></i>{{ person.whatsapp || 'WhatsApp não informado' }}
              </span>
              <span class="adbl-contact" :class="{ 'adbl-contact--muted': !person.email }">
                <i class="bi bi-envelope"></i>{{ person.email || 'E-mail não cadastrado' }}
              </span>
            </div>
          </div>
          <div class="adbl-actions">
            <button
              class="adbl-btn adbl-btn--primary adbl-btn--grow"
              data-bs-toggle="modal"
              data-bs-target="#createCaseModal"
            >
              <i class="bi bi-plus-circle"></i>
              Nova Negociação
            </button>
            <router-link :to="`/people/edit/${person.id}`" class="adbl-btn adbl-btn--outline adbl-btn--grow">
              <i class="bi bi-pencil-square"></i>
              Editar pessoa
            </router-link>
            <router-link :to="notesRoute" class="adbl-btn adbl-btn--outline adbl-btn--grow">
              <i class="bi bi-journal-text"></i>
              Anotações
            </router-link>
            <router-link :to="financeRoute" class="adbl-btn adbl-btn--outline adbl-btn--grow">
              <i class="bi bi-cash-coin"></i>
              Finanças
            </router-link>
            <a
              :href="`${peopleEditUrl}${person.id}`"
              target="_blank"
              class="adbl-btn adbl-btn--outline adbl-btn--grow"
            >
              <i class="bi bi-box-arrow-up-right"></i>
              Ver no Advable
            </a>
          </div>
        </div>

        <CreateCaseModal
          :states="states"
          :chat-id="rawChatId"
          :person-id="person?.id"
          @case-created="handleCaseCreated"
        />

        <div class="adbl-card">
          <div class="adbl-card__head">
            <span class="adbl-card__head-icon"><i class="bi bi-briefcase"></i></span>
            <span class="adbl-card__title">Negociações</span>
            <span class="adbl-card__count">{{ person.cases ? person.cases.length : 0 }}</span>
          </div>

          <div v-if="person.cases && person.cases.length">
            <div v-for="caso in person.cases" :key="caso.id" class="adbl-deal">
              <div>
                <div class="adbl-deal__title">{{ caso.title }}</div>
                <div class="adbl-deal__meta">
                  <span class="adbl-stars">
                    <i
                      v-for="star in 5"
                      :key="star"
                      class="bi"
                      :class="star <= (caso.rating || 0) ? 'bi-star-fill' : 'bi-star'"
                    ></i>
                  </span>
                  <span class="adbl-price">{{ formatCasePrice(caso.price) }}</span>
                </div>
                <div v-if="caso.stage && caso.stage.name" class="adbl-deal__meta" style="margin-top: 8px">
                  <span class="adbl-chip"><i class="bi bi-funnel"></i>{{ caso.stage.name }}</span>
                </div>
              </div>
              <router-link :to="`/case/edit/${caso.uuid}`" class="adbl-btn adbl-btn--outline adbl-btn--sm">
                <i class="bi bi-pencil-square"></i>
                Editar
              </router-link>
            </div>
          </div>
          <div v-else class="adbl-empty">
            <i class="bi bi-briefcase"></i>
            <p>Nenhuma negociação ainda.</p>
          </div>
        </div>
      </div>

      <!-- Cliente não cadastrado -->
      <div v-else class="adbl-stack">
        <div class="adbl-empty" style="padding: 24px 16px 4px">
          <i class="bi bi-person-fill-exclamation"></i>
          <p>Essa pessoa ainda não foi cadastrada.</p>
        </div>

        <!-- Vincular este chat a um cliente já existente no banco -->
        <div class="adbl-card">
          <div class="adbl-card__head">
            <span class="adbl-card__head-icon"><i class="bi bi-link-45deg"></i></span>
            <span class="adbl-card__title">Vincular a um cliente existente</span>
          </div>
          <div class="adbl-card__body">
            <input
              class="adbl-input"
              type="text"
              placeholder="Buscar cliente por nome"
              v-model="linkQuery"
            />
            <ul v-if="linkResults.length" class="adbl-link-list">
              <li v-for="p in linkResults" :key="p.id" class="adbl-link-item">
                <span>
                  {{ p.name }}
                  <small v-if="p.whatsapp">· {{ p.whatsapp }}</small>
                </span>
                <button class="adbl-btn adbl-btn--outline adbl-btn--sm" :disabled="linking" @click="linkExisting(p)">
                  Vincular
                </button>
              </li>
            </ul>
            <div v-else-if="linkQuery.length >= 2" class="adbl-muted-note">Nenhum cliente encontrado.</div>
          </div>
        </div>

        <div class="adbl-card">
          <div class="adbl-card__head">
            <span class="adbl-card__head-icon"><i class="bi bi-person-plus"></i></span>
            <span class="adbl-card__title">Cadastrar pessoa</span>
          </div>
          <div class="adbl-card__body">
            <div class="adbl-field">
              <label class="adbl-label">Nome</label>
              <input class="adbl-input" type="text" v-model="newPerson.name" />
            </div>

            <div class="adbl-field">
              <label class="adbl-label">WhatsApp</label>
              <input class="adbl-input" type="text" v-maska="'(##) 9 ####-####'" v-model="newPerson.whatsapp" />
            </div>

            <div class="adbl-field">
              <label class="adbl-label">Email</label>
              <input class="adbl-input" type="email" v-model="newPerson.email" />
            </div>

            <details class="adbl-accordion" style="margin-top: 16px">
              <summary>Documentos</summary>
              <div class="adbl-accordion__body">
                <div class="adbl-field">
                  <label class="adbl-label">CPF</label>
                  <input class="adbl-input" type="text" v-maska="'###.###.###-##'" v-model="newPerson.cpf" />
                </div>
                <div class="adbl-field">
                  <label class="adbl-label">RG</label>
                  <input class="adbl-input" type="text" v-model="newPerson.rg" />
                </div>
                <div class="adbl-field">
                  <label class="adbl-label">CNPJ</label>
                  <input class="adbl-input" type="text" v-maska="'##.###.###/####-##'" v-model="newPerson.cnpj" />
                </div>
              </div>
            </details>

            <details class="adbl-accordion">
              <summary>Informações Pessoais</summary>
              <div class="adbl-accordion__body">
                <div class="adbl-field">
                  <label class="adbl-label">Nacionalidade</label>
                  <input class="adbl-input" type="text" v-model="newPerson.nationality" />
                </div>
                <div class="adbl-field">
                  <label class="adbl-label">Profissão</label>
                  <input class="adbl-input" type="text" v-model="newPerson.occupation" />
                </div>
                <div class="adbl-field">
                  <label class="adbl-label">Data de Nascimento</label>
                  <input class="adbl-input" type="text" v-maska="'##/##/####'" v-model="newPerson.birthday" />
                </div>
                <div class="adbl-field">
                  <label class="adbl-label">Estado Civil</label>
                  <select class="adbl-select" v-model="newPerson.civilStatus">
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
                  <input class="adbl-input" type="text" v-maska="'#####-###'" v-model="newPerson.address_zip" />
                </div>
                <div class="adbl-field">
                  <label class="adbl-label">Cidade</label>
                  <input class="adbl-input" type="text" v-model="newPerson.address_city" />
                </div>
                <div class="adbl-field">
                  <label class="adbl-label">Estado</label>
                  <input class="adbl-input" type="text" placeholder="UF (ex: SP)" v-model="newPerson.address_state" />
                </div>
                <div class="adbl-field">
                  <label class="adbl-label">Logradouro</label>
                  <input class="adbl-input" type="text" v-model="newPerson.address_name" />
                </div>
                <div class="adbl-field">
                  <label class="adbl-label">Número</label>
                  <input class="adbl-input" type="text" v-model="newPerson.address_num" />
                </div>
                <div class="adbl-field">
                  <label class="adbl-label">Complemento</label>
                  <input class="adbl-input" type="text" v-model="newPerson.address_extra" />
                </div>
                <div class="adbl-field">
                  <label class="adbl-label">Bairro</label>
                  <input class="adbl-input" type="text" v-model="newPerson.district" />
                </div>
              </div>
            </details>

            <button class="adbl-btn adbl-btn--primary adbl-btn--block" style="margin-top: 6px" @click="savePerson">
              <i class="bi bi-check2"></i>
              Salvar
            </button>
          </div>
        </div>
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
import { getPerson, getPersonById, addPeople, getAllStates, addCase, linkChat, searchPeople } from '@/api/people';
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

// Rota da view de anotações deste mesmo chat, preservando os identificadores.
const notesRoute = computed(() => ({
  name: 'PersonNote',
  params: {
    chatId: searchPhone.value || rawChatId.value || chatId.value,
    chatName: chatName.value || 'Chat',
  },
  query: { raw: rawChatId.value, phone: searchPhone.value },
}));

// Rota das finanças deste mesmo cliente (mesma identidade de chat).
const financeRoute = computed(() => ({
  name: 'PersonFinance',
  params: {
    chatId: searchPhone.value || rawChatId.value || chatId.value,
    chatName: chatName.value || 'Chat',
  },
  query: { raw: rawChatId.value, phone: searchPhone.value },
}));

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

// Fallback: abre a ficha diretamente por id (a partir de "Clientes"), quando o
// cliente não tem telefone/vínculo de chat que resolva por getPerson.
const fetchPersonById = async (id) => {
  loading.value = true;
  try {
    const response = await getPersonById(id);
    person.value = response && Object.keys(response).length > 0 ? response : null;
    if (person.value) newCase.value.person_id = person.value.id;
  } catch (error) {
    console.error('Erro ao buscar pessoa por id:', error);
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
  const q = route.query;
  if (q.raw || q.phone) {
    // Deep-link explícito do cluster de ícones (identidade exata do chat).
    applyChat({ chatId: q.raw || chatId.value, phone: q.phone || '', chatName: chatName.value });
  } else if (!q.personId) {
    // Só recorre ao último chat quando NÃO é uma abertura direta por cliente
    // (senão um last_chat antigo carregaria a pessoa errada).
    const lastChat = JSON.parse(localStorage.getItem('last_chat') || 'null');
    if (lastChat?.chatId) {
      applyChat(lastChat);
    } else if (chatId.value) {
      // Sem last_chat: usa o parâmetro de rota como identidade.
      applyChat({ chatId: chatId.value, phone: '', chatName: chatName.value });
    }
  }

  if (rawChatId.value || searchPhone.value) {
    await fetchPerson();
  }

  // Abertura direta a partir de "Clientes": carrega a ficha completa por id.
  if (!person.value && q.personId) {
    await fetchPersonById(q.personId);
  }

  await fetchStates();
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

<style scoped></style>
