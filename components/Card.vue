<template>
  <!-- using example
  <Card title="Dados do processo/caso" icon="bx-briefcase-alt-2" :collapse="true">
    <template #body></template>
    <template #footer></template>
  </Card> 
  -->
  <div class="card">
    <div class="card-header d-flex justify-content-between" v-if="title" @click="collapse && (visible = !visible)">
      <div class="fw-bold my-auto">
        {{ title }}
      </div>
      <div class="my-auto">
        <i :class="icon" class="fs-4 me-1" v-if="icon" />
        <i class="bi bi-caret-down-fill" v-if="collapse"></i>
      </div>
    </div>

    <div class="card-body" v-if="$slots.body && (collapse ? visible : true)">
      <slot name="body"></slot>
    </div>
    
    <div  v-if="$slots.listGroup">
      <slot name="listGroup"></slot>
    </div>

    <div class="card-footer" v-if="$slots.footer">
      <slot name="footer"></slot>
    </div>
  </div>
</template>

<style scoped>
  .card {
    border: 1px solid var(--ad-line, #e6e8ee);
    border-radius: 14px;
    box-shadow: none;
    overflow: hidden;
    background: #fff;
  }

  .card-header {
    border-bottom: 1px solid var(--ad-line, #e6e8ee);
    background-color: #fff;
    padding: 13px 16px;
    color: var(--ad-ink, #1a2233);
  }

  .card-header :deep(.fw-bold) {
    font-size: 12px;
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: var(--ad-ink, #1a2233);
  }

  .card-header i {
    color: var(--ad-navy, #16223f);
  }

  :deep(.card-body) {
    padding: 16px;
  }
</style>

<script>
import { defineComponent, ref } from 'vue'
export default defineComponent({
  name: 'Card',
  props: {
    title: {
      type: String,
      required: false,
    },
    icon: {
      type: String,
      required: false,
    },
    collapse: {
      type: Boolean,
      required: false,
    },
  },
  setup(props) {
    const visible = ref(true);

    return {
      visible,
    }
  }
});
</script>