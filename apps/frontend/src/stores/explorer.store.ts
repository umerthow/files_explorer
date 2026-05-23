import { defineStore } from 'pinia';
import { ref, computed, shallowRef } from 'vue';
import type { FileDto, FolderDto, BreadcrumbItem } from '@we/shared';
import { foldersApi } from '../api/folders.api';

export const useExplorerStore = defineStore('explorer', () => {
  // Normalized state
  const nodes = shallowRef(new Map<number, FolderDto>());
  const childrenOf = shallowRef(new Map<number, number[]>()); // -1 = roots
  const expanded = ref(new Set<number>());
  const selectedId = ref<number | null>(null);
  const loadingNodeIds = ref(new Set<number>());

  const rightChildren = ref<FolderDto[]>([]);
  const rightFiles = ref<FileDto[]>([]);
  const rightLoading = ref(false);
  const breadcrumb = ref<BreadcrumbItem[]>([]);

  const error = ref<string | null>(null);
  const searchActive = ref(false);
  const searchQuery = ref('');
  const searchResults = ref<{ folders: FolderDto[]; files: FileDto[] }>({
    folders: [],
    files: [],
  });

  // --- helpers
  function mergeNodes(list: FolderDto[]) {
    const next = new Map(nodes.value);
    for (const n of list) next.set(n.id, n);
    nodes.value = next;
  }
  function setChildren(parentKey: number, ids: number[]) {
    const next = new Map(childrenOf.value);
    next.set(parentKey, ids);
    childrenOf.value = next;
  }

  // --- getters
  const rootIds = computed(() => childrenOf.value.get(-1) ?? []);
  const isExpanded = (id: number) => expanded.value.has(id);
  const isSelected = (id: number) => selectedId.value === id;
  const isLoading = (id: number) => loadingNodeIds.value.has(id);
  const getChildren = (id: number) => childrenOf.value.get(id);
  const getNode = (id: number) => nodes.value.get(id);

  // --- actions
  async function loadRoots() {
    error.value = null;
    try {
      const list = await foldersApi.roots();
      mergeNodes(list);
      setChildren(-1, list.map((f) => f.id));
    } catch (e) {
      error.value = (e as Error).message;
    }
  }

  async function loadChildren(parentId: number, force = false) {
    if (!force && childrenOf.value.has(parentId)) return;
    const next = new Set(loadingNodeIds.value);
    next.add(parentId);
    loadingNodeIds.value = next;
    try {
      const list = await foldersApi.children(parentId);
      mergeNodes(list);
      setChildren(parentId, list.map((f) => f.id));
    } catch (e) {
      error.value = (e as Error).message;
    } finally {
      const drop = new Set(loadingNodeIds.value);
      drop.delete(parentId);
      loadingNodeIds.value = drop;
    }
  }

  async function toggleExpand(id: number) {
    const next = new Set(expanded.value);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
      await loadChildren(id);
    }
    expanded.value = next;
  }

  async function expandPath(ids: number[]) {
    // ensure ancestors are loaded + expanded
    const next = new Set(expanded.value);
    for (const id of ids) {
      await loadChildren(id);
      next.add(id);
    }
    expanded.value = next;
  }

  async function select(id: number) {
    selectedId.value = id;
    searchActive.value = false;
    rightLoading.value = true;
    rightChildren.value = [];
    rightFiles.value = [];
    try {
      const [detail, kids, fls] = await Promise.all([
        foldersApi.detail(id),
        foldersApi.children(id),
        foldersApi.files(id),
      ]);
      breadcrumb.value = detail.breadcrumb;
      rightChildren.value = kids;
      rightFiles.value = fls;
      mergeNodes(kids);
      setChildren(id, kids.map((k) => k.id));
    } catch (e) {
      error.value = (e as Error).message;
    } finally {
      rightLoading.value = false;
    }
  }

  async function openFolder(id: number) {
    // expand ancestors so the tree reveals the folder
    const node = nodes.value.get(id);
    if (node) {
      const ancestorIds = node.path.split('/').filter(Boolean).map(Number).filter((n) => n !== id);
      await expandPath(ancestorIds);
    }
    await select(id);
  }

  async function runSearch(q: string) {
    searchQuery.value = q;
    if (q.trim().length === 0) {
      searchActive.value = false;
      searchResults.value = { folders: [], files: [] };
      return;
    }
    searchActive.value = true;
    rightLoading.value = true;
    try {
      const res = await foldersApi.search(q, 50);
      searchResults.value = res;
      mergeNodes(res.folders);
    } catch (e) {
      error.value = (e as Error).message;
    } finally {
      rightLoading.value = false;
    }
  }

  return {
    // state
    nodes,
    childrenOf,
    expanded,
    selectedId,
    rightChildren,
    rightFiles,
    rightLoading,
    breadcrumb,
    error,
    searchActive,
    searchQuery,
    searchResults,
    // getters
    rootIds,
    isExpanded,
    isSelected,
    isLoading,
    getChildren,
    getNode,
    // actions
    loadRoots,
    loadChildren,
    toggleExpand,
    select,
    openFolder,
    runSearch,
  };
});
