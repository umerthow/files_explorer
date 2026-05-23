import { beforeEach, describe, expect, it, vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useExplorerStore } from '../../src/stores/explorer.store';
import { foldersApi } from '../../src/api/folders.api';

vi.mock('../../src/api/folders.api', () => ({
  foldersApi: {
    roots: vi.fn(),
    children: vi.fn(),
    detail: vi.fn(),
    files: vi.fn(),
    search: vi.fn(),
  },
}));

const mocked = foldersApi as unknown as {
  roots: ReturnType<typeof vi.fn>;
  children: ReturnType<typeof vi.fn>;
  detail: ReturnType<typeof vi.fn>;
  files: ReturnType<typeof vi.fn>;
  search: ReturnType<typeof vi.fn>;
};

const f = (id: number, parentId: number | null, name: string, hasChildren = false) => ({
  id,
  parentId,
  name,
  path: `/${[parentId, id].filter(Boolean).join('/')}/`,
  depth: parentId == null ? 0 : 1,
  hasChildren,
});

describe('explorer store', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
  });

  it('loads roots into nodes + rootIds', async () => {
    mocked.roots.mockResolvedValueOnce([f(1, null, 'A', true), f(2, null, 'B')]);
    const store = useExplorerStore();
    await store.loadRoots();
    expect(store.rootIds).toEqual([1, 2]);
    expect(store.getNode(1)?.name).toBe('A');
  });

  it('toggleExpand loads children on first open and caches', async () => {
    mocked.roots.mockResolvedValueOnce([f(1, null, 'A', true)]);
    mocked.children.mockResolvedValueOnce([f(10, 1, 'A1'), f(11, 1, 'A2')]);
    const store = useExplorerStore();
    await store.loadRoots();
    await store.toggleExpand(1);
    expect(store.isExpanded(1)).toBe(true);
    expect(store.getChildren(1)).toEqual([10, 11]);
    // second toggle collapses without refetch
    await store.toggleExpand(1);
    expect(store.isExpanded(1)).toBe(false);
    expect(mocked.children).toHaveBeenCalledTimes(1);
  });

  it('select populates right panel + breadcrumb', async () => {
    mocked.detail.mockResolvedValueOnce({
      ...f(5, 1, 'Reports'),
      breadcrumb: [{ id: 1, name: 'Docs' }, { id: 5, name: 'Reports' }],
    });
    mocked.children.mockResolvedValueOnce([]);
    mocked.files.mockResolvedValueOnce([
      { id: 1, folderId: 5, name: 'a.pdf', size: 100, mimeType: 'application/pdf' },
    ]);
    const store = useExplorerStore();
    await store.select(5);
    expect(store.selectedId).toBe(5);
    expect(store.breadcrumb.map((b) => b.name)).toEqual(['Docs', 'Reports']);
    expect(store.rightFiles.length).toBe(1);
  });

  it('runSearch toggles searchActive and stores results', async () => {
    mocked.search.mockResolvedValueOnce({
      folders: [f(99, null, 'matches', false)],
      files: [],
    });
    const store = useExplorerStore();
    await store.runSearch('match');
    expect(store.searchActive).toBe(true);
    expect(store.searchResults.folders[0]!.name).toBe('matches');
    await store.runSearch('   ');
    expect(store.searchActive).toBe(false);
  });
});
