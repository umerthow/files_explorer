<script setup lang="ts">
import { computed } from 'vue';
import { Folder, FileText, FileImage, Music, Video, Archive, FileJson, File } from 'lucide-vue-next';
import { useExplorerStore } from '../stores/explorer.store';
import type { FileDto } from '@we/shared';

const store = useExplorerStore();

const folders = computed(() =>
  store.searchActive ? store.searchResults.folders : store.rightChildren,
);
const files = computed(() =>
  store.searchActive ? store.searchResults.files : store.rightFiles,
);
const empty = computed(() => !store.rightLoading && folders.value.length === 0 && files.value.length === 0);

function iconFor(f: FileDto) {
  const mt = f.mimeType ?? '';
  if (mt.startsWith('image/')) return FileImage;
  if (mt.startsWith('audio/')) return Music;
  if (mt.startsWith('video/')) return Video;
  if (mt === 'application/zip') return Archive;
  if (mt === 'application/json') return FileJson;
  if (mt.startsWith('text/')) return FileText;
  return File;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(1)} GB`;
}

function openFolder(id: number) {
  store.openFolder(id);
}
</script>

<template>
  <div class="px-2 py-2">
    <div v-if="store.rightLoading" class="text-explorer-muted px-3 py-2">Loading…</div>
    <div v-else-if="empty" class="text-explorer-muted px-3 py-6 text-center">
      <template v-if="store.searchActive">No results.</template>
      <template v-else-if="store.selectedId == null">Select a folder on the left to view its contents.</template>
      <template v-else>This folder is empty.</template>
    </div>

    <table v-else class="w-full text-left">
      <thead class="text-xs uppercase text-explorer-muted">
        <tr>
          <th class="font-normal px-3 py-1.5">Name</th>
          <th class="font-normal px-3 py-1.5 w-32">Type</th>
          <th class="font-normal px-3 py-1.5 w-28 text-right">Size</th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="f in folders"
          :key="`d-${f.id}`"
          class="hover:bg-explorer-hover cursor-pointer"
          @dblclick="openFolder(f.id)"
        >
          <td class="px-3 py-1 flex items-center gap-2">
            <Folder class="w-4 h-4 text-yellow-400/80" />
            <span class="truncate">{{ f.name }}</span>
          </td>
          <td class="px-3 py-1 text-explorer-muted">Folder</td>
          <td class="px-3 py-1 text-right text-explorer-muted">—</td>
        </tr>
        <tr v-for="f in files" :key="`f-${f.id}`" class="hover:bg-explorer-hover">
          <td class="px-3 py-1 flex items-center gap-2">
            <component :is="iconFor(f)" class="w-4 h-4 text-explorer-muted" />
            <span class="truncate">{{ f.name }}</span>
          </td>
          <td class="px-3 py-1 text-explorer-muted truncate">{{ f.mimeType ?? '—' }}</td>
          <td class="px-3 py-1 text-right text-explorer-muted">{{ formatSize(f.size) }}</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
