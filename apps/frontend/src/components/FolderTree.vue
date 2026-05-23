<script setup lang="ts">
import { useExplorerStore } from '../stores/explorer.store';
import FolderNode from './FolderNode.vue';

const store = useExplorerStore();
</script>

<template>
  <ul class="py-1" role="tree">
    <FolderNode v-for="id in store.rootIds" :key="id" :folder-id="id" :depth="0" />
    <li v-if="store.rootIds.length === 0" class="px-3 py-2 text-explorer-muted text-xs">
      Loading…
    </li>
  </ul>
</template>
