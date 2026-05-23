import { describe, expect, it } from 'bun:test';
import { FolderService } from '../../src/application/folder.service';
import { FileService } from '../../src/application/file.service';
import { NotFoundError } from '../../src/domain/errors';
import { InMemoryFileRepo, InMemoryFolderRepo, makeFolder } from '../helpers/in-memory';

const seedTree = () =>
  new InMemoryFolderRepo([
    makeFolder(1, null, 'Documents', '/1/', 0),
    makeFolder(2, null, 'Pictures', '/2/', 0),
    makeFolder(3, 1, 'Work', '/1/3/', 1),
    makeFolder(4, 1, 'Personal', '/1/4/', 1),
    makeFolder(5, 3, 'Reports', '/1/3/5/', 2),
    makeFolder(6, 5, 'Q1', '/1/3/5/6/', 3),
  ]);

describe('FolderService', () => {
  it('lists roots with hasChildren flag', async () => {
    const svc = new FolderService(seedTree());
    const roots = await svc.listRoots();
    expect(roots).toHaveLength(2);
    expect(roots.find((r) => r.name === 'Documents')!.hasChildren).toBe(true);
    expect(roots.find((r) => r.name === 'Pictures')!.hasChildren).toBe(false);
  });

  it('lists direct children only', async () => {
    const svc = new FolderService(seedTree());
    const children = await svc.listChildren(1);
    expect(children.map((c) => c.name).sort()).toEqual(['Personal', 'Work']);
  });

  it('throws NotFoundError for missing parent', async () => {
    const svc = new FolderService(seedTree());
    await expect(svc.listChildren(999)).rejects.toBeInstanceOf(NotFoundError);
  });

  it('builds breadcrumb in correct order', async () => {
    const svc = new FolderService(seedTree());
    const detail = await svc.getDetail(6);
    expect(detail.breadcrumb.map((b) => b.name)).toEqual(['Documents', 'Work', 'Reports', 'Q1']);
  });

  it('subtree respects maxDepth', async () => {
    const svc = new FolderService(seedTree());
    const tree = await svc.getTree(1, 1);
    expect(tree.map((t) => t.name).sort()).toEqual(['Documents', 'Personal', 'Work']);
  });

  it('search is case-insensitive substring', async () => {
    const svc = new FolderService(seedTree());
    const res = await svc.search('rep', 10);
    expect(res.map((r) => r.name)).toEqual(['Reports']);
  });

  it('search trims and ignores empty', async () => {
    const svc = new FolderService(seedTree());
    expect(await svc.search('   ', 10)).toEqual([]);
  });
});

describe('FileService', () => {
  it('lists files in folder with pagination cursor', async () => {
    const folders = seedTree();
    const files = new InMemoryFileRepo([
      { id: 1, folderId: 1, name: 'a.txt', size: 10, mimeType: 'text/plain', createdAt: new Date() },
      { id: 2, folderId: 1, name: 'b.txt', size: 20, mimeType: 'text/plain', createdAt: new Date() },
      { id: 3, folderId: 1, name: 'c.txt', size: 30, mimeType: 'text/plain', createdAt: new Date() },
    ]);
    const svc = new FileService(files, folders);
    const first = await svc.listInFolder(1, 2, null);
    expect(first.map((f) => f.name)).toEqual(['a.txt', 'b.txt']);
    const next = await svc.listInFolder(1, 2, 2);
    expect(next.map((f) => f.name)).toEqual(['c.txt']);
  });

  it('throws NotFoundError on missing folder', async () => {
    const svc = new FileService(new InMemoryFileRepo(), seedTree());
    await expect(svc.listInFolder(999, 10, null)).rejects.toBeInstanceOf(NotFoundError);
  });
});
