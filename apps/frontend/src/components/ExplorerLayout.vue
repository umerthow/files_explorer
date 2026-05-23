<script setup lang="ts">
import { computed } from 'vue';
import { useExplorerStore } from '../stores/explorer.store';
import FolderTree from './FolderTree.vue';
import RightPanel from './RightPanel.vue';
import SearchBar from './SearchBar.vue';
import Breadcrumb from './Breadcrumb.vue';

const store = useExplorerStore();
const title = computed(() => {
  if (store.searchActive) return `Search: "${store.searchQuery}"`;
  if (store.selectedId == null) return 'This PC';
  const node = store.getNode(store.selectedId);
  return node?.name ?? 'Folder';
});
</script>

<template>
  <div class="h-full flex flex-col bg-explorer-bg">
    <!-- Top toolbar -->
    <header
      class="flex-none flex items-center gap-3 px-4 h-12 border-b border-explorer-border bg-explorer-panel"
    >
      <div class="font-semibold text-explorer-text">Windows Explorer</div>
      <Breadcrumb class="flex-1" />
      <SearchBar />
    </header>

    <!-- Body -->
    <div class="flex-1 min-h-0 flex">
      <!-- Left panel: full folder tree -->
      <aside
        class="flex-none w-72 border-r border-explorer-border bg-explorer-panel overflow-auto"
        data-testid="left-panel"
      >
        <div
          class="px-3 py-2 text-xs uppercase tracking-wide text-explorer-muted border-b border-explorer-border"
        >
          Folders
        </div>
        <FolderTree />
      </aside>

      <!-- Right panel -->
      <main class="flex-1 min-w-0 overflow-auto" data-testid="right-panel">
        <div
          class="sticky top-0 z-10 bg-explorer-bg px-4 py-2 border-b border-explorer-border text-explorer-muted"
        >
          {{ title }}
        </div>
        <RightPanel />
      </main>
    </div>

    <!-- Error toast -->
    <div
      v-if="store.error"
      class="absolute bottom-4 right-4 bg-red-600/90 text-white px-3 py-2 rounded shadow"
    >
      {{ store.error }}
    </div>
  </div>
</template>
