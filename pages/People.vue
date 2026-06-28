<template>
  <Layout>
    <template #header>
      <DefaultHeader />
    </template>

    <div class="adbl-page">
      <Loader v-if="loading" />

      <div class="ad-page-head people-head">
        <h1 class="ad-page-title">Clientes</h1>
        <button class="adbl-btn adbl-btn--primary adbl-btn--sm" @click="toggleCreate">
          <i class="bi" :class="creating ? 'bi-x-lg' : 'bi-plus-lg'"></i>
          {{ creating ? 'Cancelar' : 'Novo cliente' }}
        </button>
      </div>

      <p class="people-hint">
        <i class="bi bi-whatsapp"></i>
        Dica: ao abrir uma conversa no WhatsApp Web, o cliente é aberto automaticamente.
      </p>

      <div class="adbl-stack">
        <!-- Cadastro do zero (sem precisar de chat ativo) -->
        <div v-if="creating" class="adbl-card">
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
              <input
                class="adbl-input"
                type="text"
                v-maska="'(##) #####-####'"
                placeholder="(84) 98732-9303 — estrangeiro: +DDI..."
                v-model="newPerson.whatsapp"
              />
            </div>
            <div class="adbl-field">
              <label class="adbl-label">Email</label>
              <input class="adbl-input" type="email" v-model="newPerson.email" />
            </div>

            <details class="adbl-accordion">
              <summary>Documentos</summary>
              <div class="adbl-accordion__body">
                <div class="adbl-field">
                  <label class="adbl-label">CPF</label>
                  <input class="adbl-input" type="text" v-maska="'###.###.###-##'" v-model="newPerson.cpf" />
                </div>
                <div class="adbl-field">
                  <label class="adbl-label">CNPJ</label>
                  <input class="adbl-input" type="text" v-maska="'##.###.###/####-##'" v-model="newPerson.cnpj" />
                </div>
              </div>
            </details>

            <button class="adbl-btn adbl-btn--primary adbl-btn--block save-btn" :disabled="saving" @click="savePerson">
              Salvar
            </button>
          </div>
        </div>

        <!-- Busca / listagem -->
        <div class="adbl-card">
          <div class="adbl-card__head">
            <span class="adbl-card__head-icon"><i class="bi bi-people"></i></span>
            <span class="adbl-card__title">Buscar clientes</span>
          </div>
          <div class="adbl-card__body">
            <div class="ad-search people-search">
              <span class="ad-search__icon"><i class="bi bi-search"></i></span>
              <input class="ad-search__input" type="text" placeholder="Buscar por nome" v-model="query" />
            </div>

            <ul class="people-list" v-if="people.length">
              <li v-for="p in people" :key="p.id" class="people-item">
                <div class="people-item__info">
                  <div class="people-item__name">{{ p.name }}</div>
                  <div class="people-item__contact">
                    <i class="bi bi-whatsapp"></i> {{ p.whatsapp || 'sem WhatsApp' }}
                  </div>
                </div>
                <router-link :to="`/people/edit/${p.id}`" class="adbl-btn adbl-btn--outline adbl-btn--sm">
                  <i class="bi bi-pencil-square"></i> Abrir
                </router-link>
              </li>
            </ul>
            <div v-else class="adbl-empty">
              <i class="bi bi-people"></i>
              <p>Nenhum cliente para mostrar.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </Layout>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue';
import Layout from '@/components/Layout.vue';
import DefaultHeader from '@/components/DefaultHeader.vue';
import Loader from '@/components/Loader.vue';
import Swal from 'sweetalert2';
import debounce from 'lodash.debounce';
import { searchPeople, addPeople } from '@/api/people';

const loading = ref(false);
const saving = ref(false);
const creating = ref(false);
const query = ref('');
const people = ref([]);

const newPerson = ref({ name: '', whatsapp: '', email: '', cpf: '', cnpj: '' });

const load = async (name = '') => {
  loading.value = true;
  try {
    people.value = await searchPeople(name);
  } catch (error) {
    people.value = [];
    console.error('Erro ao buscar clientes:', error);
  } finally {
    loading.value = false;
  }
};

const debouncedLoad = debounce((q) => load(q), 400);
watch(query, (q) => debouncedLoad(q));

const toggleCreate = () => {
  creating.value = !creating.value;
};

const savePerson = async () => {
  if (!newPerson.value.name) {
    Swal.fire({ toast: true, position: 'top-end', icon: 'warning', title: 'Informe o nome', showConfirmButton: false, timer: 2500 });
    return;
  }
  saving.value = true;
  try {
    await addPeople(newPerson.value);
    Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Cliente cadastrado', showConfirmButton: false, timer: 2500, timerProgressBar: true });
    newPerson.value = { name: '', whatsapp: '', email: '', cpf: '', cnpj: '' };
    creating.value = false;
    await load(query.value);
  } catch (error) {
    Swal.fire({ toast: true, position: 'top-end', icon: 'error', title: 'Erro ao cadastrar', showConfirmButton: false, timer: 3000 });
    console.error('Erro ao salvar pessoa:', error);
  } finally {
    saving.value = false;
  }
};

onMounted(() => load());
</script>

<style scoped>
.people-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.people-hint {
  display: flex;
  align-items: center;
  gap: 7px;
  margin: 2px 0 14px;
  font-size: 12.5px;
  line-height: 1.35;
  color: var(--ad-muted, #8b93a3);
}

.people-hint i {
  color: #25d366;
  font-size: 14px;
  flex: 0 0 auto;
}

.people-search {
  margin-bottom: 12px;
}

.save-btn {
  margin-top: 14px;
}

.people-list {
  list-style: none;
  margin: 0;
  padding: 0;
}

.people-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 11px 0;
  border-top: 1px solid var(--ad-line, #e6e8ee);
}

.people-item:first-child {
  border-top: none;
}

.people-item__name {
  font-size: 14px;
  font-weight: 600;
  color: var(--ad-ink, #1a2233);
}

.people-item__contact {
  font-size: 12.5px;
  color: var(--ad-muted, #8b93a3);
  margin-top: 2px;
  display: flex;
  align-items: center;
  gap: 5px;
}
</style>
