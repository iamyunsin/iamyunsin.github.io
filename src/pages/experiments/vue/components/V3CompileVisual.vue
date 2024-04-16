<template>
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

  // Status is available at all times via Codemirror EditorView
  // const getCodemirrorStates = () => {
  //   const state = view.value.state
  //   const ranges = state.selection.ranges
  //   const selected = ranges.reduce((r, range) => r + range.to - range.from, 0)
  //   const cursor = ranges[0].anchor
  //   const length = state.doc.length
  //   const lines = state.doc.lines
  //   // more state info ...
  //   // return ...
  // }
</script>
<style lang="less" scoped>
  
</style>