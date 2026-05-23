import type { FolderEntity, FolderWithChildFlag } from '../../src/domain/folder.entity';
import type { FolderRepository } from '../../src/domain/ports/folder.repository';
import type { FileEntity } from '../../src/domain/file.entity';
import type { FileRepository } from '../../src/domain/ports/file.repository';

export class InMemoryFolderRepo implements FolderRepository {
  constructor(public folders: FolderEntity[] = []) {}
  private flag(f: FolderEntity): FolderWithChildFlag {
    return { ...f, hasChildren: this.folders.some((c) => c.parentId === f.id) };
  }
  async findRoots() {
    return this.folders.filter((f) => f.parentId === null).map((f) => this.flag(f));
  }
  async findById(id: number) {
    return this.folders.find((f) => f.id === id) ?? null;
  }
  async findChildren(parentId: number) {
    return this.folders.filter((f) => f.parentId === parentId).map((f) => this.flag(f));
  }
  async findAncestors(id: number) {
    const self = await this.findById(id);
    if (!self) return [];
    const ids = self.path.split('/').filter(Boolean).map(Number).filter((n) => n !== id);
    return ids.map((aid) => this.folders.find((f) => f.id === aid)!).filter(Boolean);
  }
  async findSubtree(rootId: number | null, maxDepth: number) {
    if (rootId == null) {
      return this.folders.filter((f) => f.depth <= maxDepth).map((f) => this.flag(f));
    }
    const root = await this.findById(rootId);
    if (!root) return [];
    return this.folders
      .filter(
        (f) =>
          (f.id === rootId || f.path.startsWith(root.path)) &&
          f.depth <= root.depth + maxDepth,
      )
      .map((f) => this.flag(f));
  }
  async searchByName(query: string, limit: number) {
    const q = query.toLowerCase();
    return this.folders.filter((f) => f.name.toLowerCase().includes(q)).slice(0, limit);
  }
}

export class InMemoryFileRepo implements FileRepository {
  constructor(public files: FileEntity[] = []) {}
  async findByFolder(folderId: number, limit: number, cursor: number | null) {
    return this.files
      .filter((f) => f.folderId === folderId && (cursor == null || f.id > cursor))
      .sort((a, b) => a.id - b.id)
      .slice(0, limit);
  }
  async searchByName(query: string, limit: number) {
    const q = query.toLowerCase();
    return this.files.filter((f) => f.name.toLowerCase().includes(q)).slice(0, limit);
  }
}

export const makeFolder = (
  id: number,
  parentId: number | null,
  name: string,
  path: string,
  depth: number,
): FolderEntity => ({ id, parentId, name, path, depth, createdAt: new Date() });
