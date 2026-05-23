import { describe, expect, it, beforeEach, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import FolderNode from '../../src/components/FolderNode.vue';
import { useExplorerStore } from '../../src/stores/explorer.store';

vi.mock('../../src/api/folders.api', () => ({
  foldersApi: {
    roots: vi.fn(),
    children: vi.fn().mockResolvedValue([]),
    detail: vi.fn(),
    files: vi.fn().mockResolvedValue([]),
    search: vi.fn(),
  },
}));

beforeEach(() => setActivePinia(createPinia()));

const seedNode = (id: number, hasChildren = false) => {
  const store = useExplorerStore();
  const map = new Map(store.nodes);
  map.set(id, {
    id,
    parentId: null,
    name: `Folder ${id}`,
    path: `/${id}/`,
    depth: 0,
    hasChildren,
  });
  store.nodes = map as never;
  return store;
};

describe('FolderNode', () => {
  it('renders folder name', () => {
    seedNode(1);
    const wrapper = mount(FolderNode, { props: { folderId: 1, depth: 0 } });
    expect(wrapper.text()).toContain('Folder 1');
  });

  it('hides chevron when no children', () => {
    seedNode(1, false);
    const wrapper = mount(FolderNode, { props: { folderId: 1, depth: 0 } });
    const btn = wrapper.find('button[aria-label]');
    expect(btn.classes()).toContain('invisible');
  });

  it('clicking row selects the folder', async () => {
    seedNode(2, false);
    const wrapper = mount(FolderNode, { props: { folderId: 2, depth: 0 } });
    await wrapper.find('[role="treeitem"] > div').trigger('click');
    const store = useExplorerStore();
    expect(store.selectedId).toBe(2);
  });

  it('clicking chevron toggles expand without selecting', async () => {
    seedNode(3, true);
    const wrapper = mount(FolderNode, { props: { folderId: 3, depth: 0 } });
    await wrapper.find('button[aria-label]').trigger('click');
    const store = useExplorerStore();
    expect(store.isExpanded(3)).toBe(true);
    expect(store.selectedId).toBeNull();
  });

  it('applies indent by depth', () => {
    seedNode(4);
    const wrapper = mount(FolderNode, { props: { folderId: 4, depth: 3 } });
    const row = wrapper.find('[role="treeitem"] > div');
    expect(row.attributes('style')).toContain('padding-left: 46px');
  });
});
