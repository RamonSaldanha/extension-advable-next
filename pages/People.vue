<template>
  <Layout>
    <template #header>
      <DefaultHeader />
    </template>

    <div class="adbl-page">
      <Loader v-if="loading" />

      <div class="ad-page-head people-head">
        <h1 class="ad-page-title">Clientes</h1>
        <button class="adbl-btn adbl-btn--primary adbl-btn--sm" @click="showCreate = true">
          <i class="bi bi-plus-lg"></i>
          Novo cliente
        </button>
      </div>

      <p class="people-hint">
        <i class="bi bi-whatsapp"></i>
        Dica: ao abrir uma conversa no WhatsApp Web, o cliente é aberto automaticamente.
      </p>

      <div class="adbl-stack">
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
                  <div class="people-item__name">{{ titleCasePtBr(p.name) }}</div>
                  <div class="people-item__contact">
                    <i class="bi bi-whatsapp"></i> {{ p.whatsapp || 'sem WhatsApp' }}
                  </div>
                </div>
                <router-link :to="fichaRoute(p)" class="adbl-btn adbl-btn--outline adbl-btn--sm">
                  <i class="bi bi-person-lines-fill"></i> Abrir
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

      <NewPersonModal :show="showCreate" @close="showCreate = false" @created="onCreated" />
    </div>
  </Layout>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue';
import Layout from '@/components/Layout.vue';
import DefaultHeader from '@/components/DefaultHeader.vue';
import Loader from '@/components/Loader.vue';
import NewPersonModal from '@/components/NewPersonModal.vue';
import debounce from 'lodash.debounce';
import { searchPeople } from '@/api/people';
import { titleCasePtBr } from '@/utils/text';

const loading = ref(false);
const showCreate = ref(false);
const query = ref('');
const people = ref([]);

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

// Abre a ficha do cliente (mesma tela que o chat do WhatsApp abre). Passa a
// identidade de chat quando existir e um `personId` como fallback robusto para
// clientes sem telefone/vínculo.
function fichaRoute(p) {
  return {
    name: 'Person',
    params: {
      chatId: p.whatsapp_chat_id || p.whatsapp || String(p.id),
      chatName: p.name || 'Cliente',
    },
    query: {
      raw: p.whatsapp_chat_id || '',
      phone: p.whatsapp || '',
      personId: p.id,
    },
  };
}

function onCreated() {
  load(query.value);
}

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
