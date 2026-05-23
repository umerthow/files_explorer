<script setup lang="ts">
import { computed } from 'vue';
import { ChevronRight, ChevronDown, Folder, FolderOpen, Loader2 } from 'lucide-vue-next';
import { useExplorerStore } from '../stores/explorer.store';

const props = defineProps<{ folderId: number; depth: number }>();
const store = useExplorerStore();

const node = computed(() => store.getNode(props.folderId));
const expanded = computed(() => store.isExpanded(props.folderId));
const selected = computed(() => store.isSelected(props.folderId));
const loading = computed(() => store.isLoading(props.folderId));
const children = computed(() => store.getChildren(props.folderId));

function onChevronClick(e: MouseEvent) {
  e.stopPropagation();
  if (!node.value?.hasChildren) return;
  store.toggleExpand(props.folderId);
}

function onSelect() {
  store.select(props.folderId);
}

function onKey(e: KeyboardEvent) {
  if (e.key === 'ArrowRight') {
    if (!expanded.value && node.value?.hasChildren) store.toggleExpand(props.folderId);
  } else if (e.key === 'ArrowLeft') {
    if (expanded.value) store.toggleExpand(props.folderId);
  } else if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault();
    onSelect();
  }
}
</script>

<template>
  <li role="treeitem" :aria-expanded="expanded" :aria-selected="selected">
    <div
      class="group flex items-center gap-1 py-0.5 pr-2 cursor-pointer select-none rounded-sm"
      :class="[selected ? 'bg-explorer-selected text-white' : 'hover:bg-explorer-hover']"
      :style="{ paddingLeft: `${4 + depth * 14}px` }"
      tabindex="0"
      @click="onSelect"
      @dblclick="store.toggleExpand(folderId)"
      @keydown="onKey"
    >
      <button
        type="button"
        class="flex-none w-4 h-4 grid place-items-center rounded-sm hover:bg-white/10"
        :class="{ invisible: !node?.hasChildren }"
        :aria-label="expanded ? 'Collapse' : 'Expand'"
        @click="onChevronClick"
      >
        <Loader2 v-if="loading" class="w-3 h-3 animate-spin" />
        <ChevronDown v-else-if="expanded" class="w-3 h-3" />
        <ChevronRight v-else class="w-3 h-3" />
      </button>
      <component
        :is="expanded ? FolderOpen : Folder"
        class="flex-none w-4 h-4"
        :class="selected ? 'text-yellow-300' : 'text-yellow-400/80'"
      />
      <span class="truncate">{{ node?.name }}</span>
    </div>
    <ul v-if="expanded && children" role="group" class="ml-0">
      <FolderNode
        v-for="childId in children"
        :key="childId"
        :folder-id="childId"
        :depth="depth + 1"
      />
    </ul>
  </li>
</template>
