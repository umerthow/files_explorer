<script setup lang="ts">
import { ref, watch } from 'vue';
import { Search, X } from 'lucide-vue-next';
import { useExplorerStore } from '../stores/explorer.store';

const store = useExplorerStore();
const value = ref('');
let timer: ReturnType<typeof setTimeout> | null = null;

watch(value, (v) => {
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => store.runSearch(v), 300);
});

function clear() {
  value.value = '';
  store.runSearch('');
}
</script>

<template>
  <div
    class="relative flex items-center bg-explorer-bg border border-explorer-border rounded h-8 w-72"
  >
    <Search class="absolute left-2 w-4 h-4 text-explorer-muted" />
    <input
      v-model="value"
      type="search"
      placeholder="Search folders and files"
      data-testid="search-input"
      class="bg-transparent outline-none w-full pl-8 pr-8 text-sm placeholder:text-explorer-muted"
    />
    <button
      v-if="value"
      type="button"
      class="absolute right-1 w-6 h-6 grid place-items-center rounded hover:bg-white/10"
      aria-label="Clear search"
      @click="clear"
    >
      <X class="w-3 h-3" />
    </button>
  </div>
</template>
