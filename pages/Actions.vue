<template>
  <Layout>
    <template #header>
      <DefaultHeader />
    </template>

    <!-- Vista de Resultados -->
    <div v-if="currentView === 'results'" class="results-view">
      <div class="results-topbar">
        <button class="back-btn" @click="currentView = 'list'">
          <i class="bi bi-arrow-left"></i>
          <span>Voltar</span>
        </button>
        <div class="results-topbar-right">
          <button
            v-if="expedientes.length > 0"
            class="icon-btn icon-btn--primary"
            title="Criar Tarefas no Kanban"
            @click="openCreateTasksModal"
          >
            <i class="bi bi-kanban"></i>
          </button>
          <button class="icon-btn" title="Exportar Excel" @click="exportToExcel">
            <i class="bi bi-file-earmark-spreadsheet"></i>
          </button>
          <button class="icon-btn" title="Copiar JSON" @click="copyJSON">
            <i class="bi bi-clipboard"></i>
          </button>
        </div>
      </div>

      <div class="results-title-bar">
        <div class="results-title-left">
          <i class="bi bi-inbox-fill results-title-icon"></i>
          <div>
            <h6 class="results-title">Expedientes PJE</h6>
            <span class="results-subtitle">
              <strong>{{ expedientes.length }}</strong> expediente{{ expedientes.length !== 1 ? 's' : '' }}
            </span>
            <div v-if="teamName" class="results-team-name">
              <i class="bi bi-people-fill"></i> {{ teamName }}
            </div>
          </div>
        </div>
      </div>

      <div class="results-body">
        <!-- Grupo: Cadastrados no Advable -->
        <div class="comarca-group">
          <button class="comarca-header comarca-header--success" @click="toggleGroup('cadastrados')">
            <div class="comarca-header-left">
              <i class="bi" :class="expandedGroups.cadastrados ? 'bi-chevron-down' : 'bi-chevron-right'"></i>
              <i class="bi bi-check-circle-fill" style="color: #16a34a;"></i>
              <span class="comarca-name">Processos cadastrados no Advable</span>
            </div>
            <span class="comarca-count comarca-count--success">{{ groupedByStatus.cadastrados.length }}</span>
          </button>

          <div v-if="expandedGroups.cadastrados" class="expediente-list">
            <div
              v-for="exp in groupedByStatus.cadastrados"
              :key="exp.idExpediente || exp.processo + exp.destinatario"
              class="expediente-card"
            >
              <div class="exp-top">
                <span class="exp-tipo" v-if="exp.tipoDocumento">{{ exp.tipoDocumento }}</span>
                <span class="exp-id" v-if="exp.idExpediente">#{{ exp.idExpediente }}</span>
              </div>

              <div class="exp-processo">
                <i class="bi bi-folder2-open"></i>
                <span>{{ exp.processo }}</span>
              </div>

              <div class="exp-assunto" v-if="exp.assunto">{{ exp.assunto }}</div>

              <div class="exp-destinatario" v-if="exp.destinatario">
                <i class="bi bi-person-fill"></i>
                {{ exp.destinatario }}
              </div>

              <div class="exp-meta">
                <span v-if="exp.prazo" class="exp-chip" :class="{ 'exp-chip--warn': exp.prazo !== 'Sem prazo' }">
                  <i class="bi bi-clock"></i>
                  {{ exp.prazo }}
                </span>
                <span v-if="exp.dataLimite" class="exp-chip exp-chip--danger">
                  <i class="bi bi-calendar-event"></i>
                  {{ exp.dataLimite }}
                </span>
                <span v-if="exp.dataCiencia" class="exp-chip exp-chip--success">
                  <i class="bi bi-check-circle"></i>
                  {{ exp.dataCiencia }}
                </span>
              </div>

              <div class="exp-partes" v-if="exp.partes">
                <i class="bi bi-people-fill"></i>
                <span>{{ exp.partes }}</span>
              </div>

              <div class="exp-vara" v-if="exp.vara">
                <i class="bi bi-building"></i>
                <span>{{ exp.vara }}</span>
              </div>
            </div>

            <div v-if="groupedByStatus.cadastrados.length === 0" class="empty-group">
              Nenhum expediente de processo cadastrado encontrado.
            </div>
          </div>
        </div>

        <!-- Grupo: Não Cadastrados -->
        <div class="comarca-group">
          <button class="comarca-header comarca-header--warning" @click="toggleGroup('naoCadastrados')">
            <div class="comarca-header-left">
              <i class="bi" :class="expandedGroups.naoCadastrados ? 'bi-chevron-down' : 'bi-chevron-right'"></i>
              <i class="bi bi-exclamation-circle-fill" style="color: #d97706;"></i>
              <span class="comarca-name">Processos não cadastrados</span>
            </div>
            <span class="comarca-count comarca-count--warning">{{ groupedByStatus.naoCadastrados.length }}</span>
          </button>

          <div v-if="expandedGroups.naoCadastrados" class="expediente-list">
            <div
              v-for="exp in groupedByStatus.naoCadastrados"
              :key="exp.idExpediente || exp.processo + exp.destinatario"
              class="expediente-card"
            >
              <div class="exp-top">
                <span class="exp-tipo" v-if="exp.tipoDocumento">{{ exp.tipoDocumento }}</span>
                <span class="exp-id" v-if="exp.idExpediente">#{{ exp.idExpediente }}</span>
              </div>

              <div class="exp-processo">
                <i class="bi bi-folder2-open"></i>
                <span>{{ exp.processo }}</span>
              </div>

              <div class="exp-assunto" v-if="exp.assunto">{{ exp.assunto }}</div>

              <div class="exp-destinatario" v-if="exp.destinatario">
                <i class="bi bi-person-fill"></i>
                {{ exp.destinatario }}
              </div>

              <div class="exp-meta">
                <span v-if="exp.prazo" class="exp-chip" :class="{ 'exp-chip--warn': exp.prazo !== 'Sem prazo' }">
                  <i class="bi bi-clock"></i>
                  {{ exp.prazo }}
                </span>
                <span v-if="exp.dataLimite" class="exp-chip exp-chip--danger">
                  <i class="bi bi-calendar-event"></i>
                  {{ exp.dataLimite }}
                </span>
                <span v-if="exp.dataCiencia" class="exp-chip exp-chip--success">
                  <i class="bi bi-check-circle"></i>
                  {{ exp.dataCiencia }}
                </span>
              </div>

              <div class="exp-partes" v-if="exp.partes">
                <i class="bi bi-people-fill"></i>
                <span>{{ exp.partes }}</span>
              </div>

              <div class="exp-vara" v-if="exp.vara">
                <i class="bi bi-building"></i>
                <span>{{ exp.vara }}</span>
              </div>
            </div>

            <div v-if="groupedByStatus.naoCadastrados.length === 0" class="empty-group">
              Nenhum expediente de processo não cadastrado encontrado.
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Vista de Lista de Ações -->
    <div v-else class="actions-page">
      <div class="actions-list">
        <!-- Ação: Coletar Expedientes -->
        <div class="action-card">
          <div class="action-card-left">
            <div class="action-icon-wrap action-icon--blue">
              <i class="bi bi-inbox-fill"></i>
            </div>
            <div class="action-info">
              <h6 class="action-name">Coletar Expedientes</h6>
              <p class="action-desc">Extrai expedientes pendentes do painel PJE</p>
              <span v-if="collecting" class="action-loading-hint">
                <div class="spinner-small spinner-small--blue"></div>
                Coletando expedientes...
              </span>
              <span v-else-if="checking" class="action-loading-hint">
                <div class="spinner-small spinner-small--blue"></div>
                Verificando cadastros...
              </span>
              <span v-else-if="expedientes.length > 0 && !error" class="action-result-hint" @click="currentView = 'results'">
                <i class="bi bi-check-circle-fill"></i>
                {{ expedientes.length }} coletados - ver resultados
              </span>
              <span v-if="error" class="action-error-hint">
                <i class="bi bi-exclamation-circle-fill"></i>
                {{ error }}
              </span>
            </div>
          </div>
          <div class="action-card-right">
            <button
              class="play-btn"
              :class="{ 'play-btn--loading': collecting || checking }"
              :disabled="collecting || checking"
              @click="collectExpedientes"
              :title="collecting ? 'Coletando...' : checking ? 'Verificando...' : 'Iniciar coleta'"
            >
              <div v-if="collecting || checking" class="spinner-small"></div>
              <i v-else class="bi bi-play-fill"></i>
            </button>
          </div>
        </div>

      </div>
    </div>

    <!-- Modal: Criar Tarefas -->
    <div v-if="showCreateTasksModal" class="modal-overlay" @click.self="showCreateTasksModal = false">
      <div class="modal-card">
        <div class="modal-header">
          <i class="bi bi-kanban modal-header-icon"></i>
          <h6 class="modal-title">Criar Tarefas no Kanban</h6>
        </div>

        <div class="modal-body">
          <div class="modal-summary">
            <i class="bi bi-info-circle"></i>
            <span><strong>{{ modalExpedientesCount }}</strong> expediente{{ modalExpedientesCount !== 1 ? 's' : '' }} {{ modalExpedientesCount !== 1 ? 'serão criados' : 'será criado' }} como tarefa{{ modalExpedientesCount !== 1 ? 's' : '' }}.</span>
          </div>

          <label v-if="groupedByStatus.naoCadastrados.length > 0" class="modal-checkbox-label">
            <input type="checkbox" v-model="includeNaoCadastrados" class="modal-checkbox" />
            <span>Incluir {{ groupedByStatus.naoCadastrados.length }} expediente{{ groupedByStatus.naoCadastrados.length !== 1 ? 's' : '' }} não cadastrado{{ groupedByStatus.naoCadastrados.length !== 1 ? 's' : '' }} (sem vínculo ao processo)</span>
          </label>

          <label class="modal-label">Coluna do Kanban</label>
          <select v-model="selectedTaskStateId" class="modal-select" :disabled="loadingTaskStates">
            <option :value="null" disabled>{{ loadingTaskStates ? 'Carregando...' : 'Selecione uma coluna' }}</option>
            <option v-for="state in taskStates" :key="state.id" :value="state.id">
              {{ state.title }}
            </option>
          </select>

          <div v-if="createTasksResult" class="modal-result" :class="createTasksResult.success ? 'modal-result--success' : 'modal-result--error'">
            <i class="bi" :class="createTasksResult.success ? 'bi-check-circle-fill' : 'bi-exclamation-circle-fill'"></i>
            <span>{{ createTasksResult.message }}</span>
          </div>
        </div>

        <div class="modal-footer">
          <button class="modal-btn modal-btn--cancel" @click="showCreateTasksModal = false" :disabled="creatingTasks">
            Cancelar
          </button>
          <button
            class="modal-btn modal-btn--primary"
            @click="handleCreateTasks"
            :disabled="!selectedTaskStateId || creatingTasks"
          >
            <div v-if="creatingTasks" class="spinner-small spinner-small--white"></div>
            <template v-else>Criar Tarefas</template>
          </button>
        </div>
      </div>
    </div>
  </Layout>
</template>

<script setup>
import { ref, computed } from 'vue';
import Layout from '@/components/Layout.vue';
import DefaultHeader from '@/components/DefaultHeader.vue';
import { checkExistingProcesses } from '@/api/process';
import { getTaskStates, createTasksFromExpedientes } from '@/api/tasks';
import * as XLSX from 'xlsx';

const currentView = ref('list');
const collecting = ref(false);
const checking = ref(false);
const error = ref('');
const expedientes = ref([]);
const teamName = ref('');
const expandedGroups = ref({ cadastrados: true, naoCadastrados: true });
const existingProcessNumbers = ref(new Set());

// Task creation state
const showCreateTasksModal = ref(false);
const taskStates = ref([]);
const selectedTaskStateId = ref(null);
const loadingTaskStates = ref(false);
const creatingTasks = ref(false);
const createTasksResult = ref(null);
const includeNaoCadastrados = ref(false);

const modalExpedientesCount = computed(() => {
  const base = groupedByStatus.value.cadastrados.length;
  return includeNaoCadastrados.value ? base + groupedByStatus.value.naoCadastrados.length : base;
});

function extractCNJ(texto) {
  const match = texto.match(/\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4}/);
  return match ? match[0] : '';
}

const groupedByStatus = computed(() => {
  const cadastrados = [];
  const naoCadastrados = [];

  for (const exp of expedientes.value) {
    const numCNJ = extractCNJ(exp.processo);
    if (numCNJ && existingProcessNumbers.value.has(numCNJ)) {
      cadastrados.push(exp);
    } else {
      naoCadastrados.push(exp);
    }
  }

  return { cadastrados, naoCadastrados };
});

const toggleGroup = (group) => {
  expandedGroups.value[group] = !expandedGroups.value[group];
};

const collectExpedientes = async () => {
  collecting.value = true;
  checking.value = false;
  error.value = '';
  expedientes.value = [];
  teamName.value = '';
  existingProcessNumbers.value = new Set();

  try {
    const response = await browser.runtime.sendMessage({ type: 'COLLECT_EXPEDIENTES' });

    if (response && response.success) {
      expedientes.value = response.dados || [];

      if (expedientes.value.length === 0) {
        error.value = 'Nenhum expediente encontrado';
        collecting.value = false;
        return;
      }

      // Fase 2: verificar quais processos existem no backend
      collecting.value = false;
      checking.value = true;

      const processNumbers = expedientes.value
        .map(exp => extractCNJ(exp.processo))
        .filter(num => num.length > 0);

      const uniqueNumbers = [...new Set(processNumbers)];

      try {
        const checkResult = await checkExistingProcesses(uniqueNumbers);
        existingProcessNumbers.value = new Set(checkResult.existing || []);
        teamName.value = checkResult.team_name || '';
      } catch (apiError) {
        console.error('Erro ao verificar processos:', apiError);
        error.value = 'Coleta OK, mas não foi possível verificar cadastros';
      }

      currentView.value = 'results';
    } else {
      error.value = response?.error || 'Erro desconhecido';
    }
  } catch (e) {
    error.value = e.message;
  } finally {
    collecting.value = false;
    checking.value = false;
  }
};

const copyJSON = async () => {
  try {
    await navigator.clipboard.writeText(JSON.stringify(expedientes.value, null, 2));
  } catch {
    const textarea = document.createElement('textarea');
    textarea.value = JSON.stringify(expedientes.value, null, 2);
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
  }
};

const openCreateTasksModal = async () => {
  showCreateTasksModal.value = true;
  createTasksResult.value = null;
  selectedTaskStateId.value = null;
  includeNaoCadastrados.value = false;

  if (taskStates.value.length === 0) {
    loadingTaskStates.value = true;
    try {
      taskStates.value = await getTaskStates();
    } catch (e) {
      console.error('Erro ao carregar colunas:', e);
    } finally {
      loadingTaskStates.value = false;
    }
  }
};

const handleCreateTasks = async () => {
  if (!selectedTaskStateId.value) return;

  creatingTasks.value = true;
  createTasksResult.value = null;

  try {
    const toSend = includeNaoCadastrados.value
      ? [...groupedByStatus.value.cadastrados, ...groupedByStatus.value.naoCadastrados]
      : groupedByStatus.value.cadastrados;
    const result = await createTasksFromExpedientes(selectedTaskStateId.value, toSend);

    let message = `${result.created} tarefa${result.created !== 1 ? 's' : ''} criada${result.created !== 1 ? 's' : ''} com sucesso!`;
    if (result.skipped > 0) {
      message += ` ${result.skipped} já existia${result.skipped !== 1 ? 'm' : ''}.`;
    }

    createTasksResult.value = {
      success: true,
      message,
    };
  } catch (e) {
    createTasksResult.value = {
      success: false,
      message: e.response?.data?.message || 'Erro ao criar tarefas.',
    };
  } finally {
    creatingTasks.value = false;
  }
};

const exportToExcel = () => {
  const { cadastrados, naoCadastrados } = groupedByStatus.value;
  const rows = [];

  const addSection = (items, cadastrado) => {
    for (const exp of items) {
      rows.push({
        'Cadastrado?': cadastrado ? 'Sim' : 'Não',
        'Processo': exp.processo || '',
        'ID Expediente': exp.idExpediente || '',
        'Data de Expedição': exp.dataExpedicao || '',
        'Prazo': exp.prazo || '',
        'Data Limite': exp.dataLimite || '',
        'Data Ciência': exp.dataCiencia || '',
        'Partes': exp.partes || '',
        'Vara': exp.vara || '',
      });
    }
  };

  addSection(cadastrados, true);
  addSection(naoCadastrados, false);

  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();

  const sheetName = teamName.value
    ? ('Expedientes - ' + teamName.value).substring(0, 31)
    : 'Expedientes';

  XLSX.utils.book_append_sheet(wb, ws, sheetName);

  const today = new Date().toISOString().split('T')[0];
  const fileName = teamName.value
    ? 'expedientes_' + teamName.value.replace(/\s+/g, '_') + '_' + today + '.xlsx'
    : 'expedientes_' + today + '.xlsx';

  XLSX.writeFile(wb, fileName);
};
</script>

<style scoped>
/* ── Actions List View ── */
.actions-page {
  padding: 12px 16px 20px;
  background: #ffffff;
  min-height: 100%;
}

.actions-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

/* ── Action Card ── */
.action-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 14px;
  border: 1px solid #e8eaed;
  border-radius: 12px;
  gap: 12px;
  transition: all 0.2s ease;
}

.action-card:hover {
  border-color: #d0d5dd;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
}

.action-card-left {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
  min-width: 0;
}

.action-icon-wrap {
  width: 38px;
  height: 38px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.action-icon-wrap i {
  font-size: 17px;
}

.action-icon--blue {
  background: #eef3ff;
  color: #3b6fea;
}

.action-icon--blue i { color: #3b6fea; }

.action-info {
  flex: 1;
  min-width: 0;
}

.action-name {
  font-size: 14px;
  font-weight: 600;
  color: #1a1d23;
  margin: 0;
  line-height: 1.3;
}

.action-desc {
  font-size: 11.5px;
  color: #8b95a5;
  margin: 2px 0 0;
  line-height: 1.3;
}

.action-result-hint {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  color: #16a34a;
  font-weight: 600;
  margin-top: 4px;
  cursor: pointer;
  transition: color 0.15s;
}

.action-result-hint:hover {
  color: #15803d;
  text-decoration: underline;
}

.action-result-hint i {
  font-size: 11px;
}

.action-loading-hint {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  color: #3b6fea;
  font-weight: 500;
  margin-top: 4px;
}

.action-error-hint {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  color: #dc2626;
  font-weight: 500;
  margin-top: 4px;
}

.action-error-hint i {
  font-size: 11px;
}

/* ── Play Button ── */
.action-card-right {
  flex-shrink: 0;
}

.play-btn {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border: none;
  background: #3b6fea;
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  font-size: 20px;
  transition: all 0.2s ease;
}

.play-btn:hover:not(:disabled) {
  background: #2d5bd0;
  transform: scale(1.08);
  box-shadow: 0 4px 14px rgba(59, 111, 234, 0.35);
}

.play-btn:active:not(:disabled) {
  transform: scale(0.95);
}

.play-btn--loading {
  background: #5a85ed;
  cursor: not-allowed;
}

.play-btn i {
  margin-left: 2px;
}

.spinner-small {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  border: 2.5px solid rgba(255, 255, 255, 0.3);
  border-top-color: #fff;
  animation: spin 0.7s linear infinite;
}

.spinner-small--blue {
  width: 14px;
  height: 14px;
  border: 2px solid rgba(59, 111, 234, 0.2);
  border-top-color: #3b6fea;
  display: inline-block;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* ── Results View ── */
.results-view {
  display: flex;
  flex-direction: column;
  background: #ffffff;
}

.results-topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  border-bottom: 1px solid #e8eaed;
  background: #f8f9fb;
}

.back-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border: none;
  background: none;
  color: #3b6fea;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  border-radius: 6px;
  transition: background 0.15s;
}

.back-btn:hover {
  background: #eef3ff;
}

.back-btn i {
  font-size: 14px;
}

.results-topbar-right {
  display: flex;
  gap: 4px;
}

.icon-btn {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid #e8eaed;
  border-radius: 6px;
  background: #fff;
  color: #5f6878;
  cursor: pointer;
  font-size: 13px;
  transition: all 0.15s ease;
}

.icon-btn:hover {
  border-color: #3b6fea;
  color: #3b6fea;
  background: #eef3ff;
}

.results-title-bar {
  padding: 12px 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid #f1f3f5;
}

.results-title-left {
  display: flex;
  align-items: center;
  gap: 10px;
}

.results-title-icon {
  font-size: 20px;
  color: #3b6fea;
}

.results-title {
  font-size: 15px;
  font-weight: 700;
  color: #1a1d23;
  margin: 0;
  line-height: 1.2;
}

.results-subtitle {
  font-size: 12px;
  color: #8b95a5;
}

.results-subtitle strong {
  color: #3b6fea;
}

.results-team-name {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  color: #5f6878;
  font-weight: 500;
  margin-top: 2px;
}

.results-team-name i {
  font-size: 10px;
  color: #3b6fea;
}

.results-body {
  padding: 12px 16px 20px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

/* ── Status Group ── */
.comarca-group {
  border: 1px solid #e8eaed;
  border-radius: 10px;
  overflow: hidden;
}

.comarca-header {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 12px;
  background: #f8f9fb;
  border: none;
  cursor: pointer;
  transition: background 0.15s ease;
  font-size: 13px;
}

.comarca-header--success:hover {
  background: #ecfdf3;
}

.comarca-header--warning:hover {
  background: #fffbeb;
}

.comarca-header-left {
  display: flex;
  align-items: center;
  gap: 6px;
}

.comarca-header-left > i:first-child {
  font-size: 11px;
  color: #8b95a5;
}

.comarca-name {
  font-weight: 600;
  color: #1a1d23;
}

.comarca-count {
  font-size: 11px;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 10px;
}

.comarca-count--success {
  color: #16a34a;
  background: #ecfdf3;
}

.comarca-count--warning {
  color: #d97706;
  background: #fffbeb;
}

/* ── Expediente List ── */
.expediente-list {
  display: flex;
  flex-direction: column;
}

.expediente-card {
  padding: 10px 12px;
  border-top: 1px solid #f1f3f5;
  display: flex;
  flex-direction: column;
  gap: 4px;
  transition: background 0.15s ease;
}

.expediente-card:hover {
  background: #fafbfc;
}

.exp-top {
  display: flex;
  align-items: center;
  gap: 6px;
}

.exp-tipo {
  font-size: 11px;
  font-weight: 600;
  color: #6d28d9;
  background: #f5f3ff;
  padding: 2px 8px;
  border-radius: 4px;
  text-transform: uppercase;
  letter-spacing: 0.3px;
}

.exp-id {
  font-size: 11px;
  color: #8b95a5;
  font-weight: 500;
}

.exp-processo {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  font-weight: 600;
  color: #1d6fb5;
}

.exp-processo i {
  font-size: 11px;
  opacity: 0.7;
}

.exp-assunto {
  font-size: 11px;
  color: #5f6878;
  line-height: 1.3;
}

.exp-destinatario {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  color: #1a1d23;
  font-weight: 500;
}

.exp-destinatario i {
  font-size: 10px;
  color: #6d28d9;
}

.exp-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.exp-chip {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  font-size: 10px;
  font-weight: 500;
  padding: 2px 7px;
  border-radius: 4px;
  color: #5f6878;
  background: #f1f3f5;
}

.exp-chip i {
  font-size: 9px;
}

.exp-chip--warn {
  color: #d97706;
  background: #fffbeb;
}

.exp-chip--danger {
  color: #dc2626;
  background: #fef2f2;
}

.exp-chip--success {
  color: #16a34a;
  background: #ecfdf3;
}

.exp-partes {
  display: flex;
  align-items: flex-start;
  gap: 4px;
  font-size: 11px;
  color: #5f6878;
  line-height: 1.3;
}

.exp-partes i {
  font-size: 10px;
  margin-top: 2px;
  flex-shrink: 0;
}

.exp-vara {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  color: #8b95a5;
}

.exp-vara i {
  font-size: 10px;
}

.empty-group {
  padding: 16px 12px;
  text-align: center;
  font-size: 12px;
  color: #8b95a5;
  font-style: italic;
}

/* ── Kanban Button ── */
.icon-btn--primary {
  border-color: #3b6fea;
  color: #3b6fea;
  background: #eef3ff;
}

.icon-btn--primary:hover {
  background: #3b6fea;
  color: #fff;
}

/* ── Modal Overlay ── */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 16px;
}

.modal-card {
  background: #fff;
  border-radius: 14px;
  width: 100%;
  max-width: 340px;
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.15);
  overflow: hidden;
}

.modal-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 16px 18px;
  border-bottom: 1px solid #f1f3f5;
}

.modal-header-icon {
  font-size: 18px;
  color: #3b6fea;
}

.modal-title {
  font-size: 15px;
  font-weight: 700;
  color: #1a1d23;
  margin: 0;
}

.modal-body {
  padding: 16px 18px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.modal-summary {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  font-size: 12px;
  color: #5f6878;
  background: #f8f9fb;
  padding: 10px 12px;
  border-radius: 8px;
  line-height: 1.4;
}

.modal-summary i {
  color: #3b6fea;
  margin-top: 1px;
  flex-shrink: 0;
}

.modal-summary strong {
  color: #3b6fea;
}

.modal-checkbox-label {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  font-size: 12px;
  color: #5f6878;
  cursor: pointer;
  line-height: 1.4;
}

.modal-checkbox {
  margin-top: 2px;
  accent-color: #3b6fea;
  flex-shrink: 0;
}

.modal-label {
  font-size: 12px;
  font-weight: 600;
  color: #1a1d23;
  margin: 0;
}

.modal-select {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #e8eaed;
  border-radius: 8px;
  font-size: 13px;
  color: #1a1d23;
  background: #fff;
  cursor: pointer;
  outline: none;
  transition: border-color 0.15s;
}

.modal-select:focus {
  border-color: #3b6fea;
}

.modal-result {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  font-weight: 600;
  padding: 8px 12px;
  border-radius: 8px;
}

.modal-result--success {
  color: #16a34a;
  background: #ecfdf3;
}

.modal-result--error {
  color: #dc2626;
  background: #fef2f2;
}

.modal-result i {
  font-size: 13px;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 12px 18px;
  border-top: 1px solid #f1f3f5;
}

.modal-btn {
  padding: 8px 18px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  min-width: 80px;
  transition: all 0.15s ease;
}

.modal-btn--cancel {
  background: #f1f3f5;
  color: #5f6878;
}

.modal-btn--cancel:hover:not(:disabled) {
  background: #e8eaed;
}

.modal-btn--primary {
  background: #3b6fea;
  color: #fff;
}

.modal-btn--primary:hover:not(:disabled) {
  background: #2d5bd0;
}

.modal-btn--primary:disabled {
  background: #a3bef5;
  cursor: not-allowed;
}

.spinner-small--white {
  width: 14px;
  height: 14px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: #fff;
  display: inline-block;
}
</style>
