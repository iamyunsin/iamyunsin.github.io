<template>
  <div class="compile-visual-layout">
    <div class="editor-pane">
      <div class="pane-header">Vue SFC 模板输入</div>
      <CodeMirror 
        v-model="code" 
        placeholder="Code goes here..."
        :style="{ height: '420px' }"
        :autofocus="true"
        :indent-with-tab="true"
        :tab-size="2"
        :extensions="extensions"
        @ready="handleReady"
        @change="log('change', $event)"
        @focus="log('focus', $event)"
        @blur="log('blur', $event)"/>
    </div>
    <div class="preview-pane">
      <div class="pane-header">编译产物 / AST 视图区</div>
      <div class="pane-body">视图区</div>
    </div>
  </div>
</template>
<script setup name="V3CompileVisual" lang="tsx">
import { ref, shallowRef } from 'vue';
import { Codemirror as CodeMirror } from 'vue-codemirror';
import { vue as langVue} from '@codemirror/lang-vue';

const code = ref(`<template>
  <div class="flex gap-10">
    <div class="w-400">
      <CodeMirror 
        v-model="code" 
        placeholder="Code goes here..."
        :style="{ height: '400px' }"
        :autofocus="true"
        :indent-with-tab="true"
        :tab-size="2"
        :extensions="extensions"
        @ready="handleReady"
        @change="log('change', $event)"
        @focus="log('focus', $event)"
        @blur="log('blur', $event)"/>
    </div>
    <div class="flex-1">视图区</div>
  </div>
</template>
`)

const log = (type: string, event: unknown) => {
  console.log(type, event)
}

  const extensions = [langVue()]

  // Codemirror EditorView instance ref
  const view = shallowRef()
  const handleReady = (payload: any) => {
    view.value = payload.view
  }
</script>
<style lang="less" scoped>
  .compile-visual-layout {
    display: grid;
    grid-template-columns: minmax(320px, 460px) 1fr;
    gap: 16px;
  }

  .editor-pane,
  .preview-pane {
    background-color: var(--bg-surface);
    border: 1px solid var(--border-color);
    border-radius: 14px;
    overflow: hidden;
    box-shadow: var(--shadow-sm);
  }

  .pane-header {
    padding: 12px 16px;
    font-size: 14px;
    font-weight: 600;
    color: var(--text-primary);
    background-color: var(--bg-muted);
    border-bottom: 1px solid var(--border-color);
  }

  .pane-body {
    padding: 20px;
    font-size: 14px;
    color: var(--text-secondary);
    min-height: 420px;
  }

  @media (max-width: 900px) {
    .compile-visual-layout {
      grid-template-columns: 1fr;
    }
  }
</style>
