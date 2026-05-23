<script setup lang="ts">
import { computed } from 'vue';
import { ChevronRight, Home } from 'lucide-vue-next';
import { useExplorerStore } from '../stores/explorer.store';

const store = useExplorerStore();
const items = computed(() => store.breadcrumb);
</script>

<template>
  <nav class="flex items-center gap-1 text-explorer-muted text-sm overflow-x-auto">
    <button
      type="button"
      class="flex items-center gap-1 px-2 py-1 rounded hover:bg-explorer-hover hover:text-explorer-text"
      @click="store.selectedId = null; store.searchActive = false"
    >
      <Home class="w-3.5 h-3.5" />
      This PC
    </button>
    <template v-for="(item, idx) in items" :key="item.id">
      <ChevronRight class="w-3 h-3 flex-none" />
      <button
        type="button"
        class="px-2 py-1 rounded hover:bg-explorer-hover hover:text-explorer-text truncate max-w-[16rem]"
        :class="{ 'text-explorer-text': idx === items.length - 1 }"
        @click="store.openFolder(item.id)"
      >
        {{ item.name }}
      </button>
    </template>
  </nav>
</template>
