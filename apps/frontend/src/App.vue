<script setup lang="ts">
import { onMounted } from 'vue';
import { useExplorerStore } from './stores/explorer.store';
import ExplorerLayout from './components/ExplorerLayout.vue';

const store = useExplorerStore();
onMounted(() => store.loadRoots());
</script>

<template>
  <ExplorerLayout />
</template>
