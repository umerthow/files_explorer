import type { FolderDto, FolderDetailDto, BreadcrumbItem } from '@we/shared';
import type { FolderRepository } from '../domain/ports/folder.repository';
import type { FolderEntity, FolderWithChildFlag } from '../domain/folder.entity';
import { NotFoundError, ValidationError } from '../domain/errors';

const toDto = (f: FolderWithChildFlag): FolderDto => ({
  id: f.id,
  parentId: f.parentId,
  name: f.name,
  path: f.path,
  depth: f.depth,
  hasChildren: f.hasChildren,
});

const toDtoNoFlag = (f: FolderEntity, hasChildren = false): FolderDto => ({
  id: f.id,
  parentId: f.parentId,
  name: f.name,
  path: f.path,
  depth: f.depth,
  hasChildren,
});

export class FolderService {
  constructor(private readonly repo: FolderRepository) {}

  listRoots(): Promise<FolderDto[]> {
    return this.repo.findRoots().then((rs) => rs.map(toDto));
  }

  async listChildren(parentId: number): Promise<FolderDto[]> {
    const parent = await this.repo.findById(parentId);
    if (!parent) throw new NotFoundError('Folder', parentId);
    const children = await this.repo.findChildren(parentId);
    return children.map(toDto);
  }

  async getDetail(id: number): Promise<FolderDetailDto> {
    const folder = await this.repo.findById(id);
    if (!folder) throw new NotFoundError('Folder', id);
    const ancestors = await this.repo.findAncestors(id);
    const breadcrumb: BreadcrumbItem[] = [
      ...ancestors.map((a) => ({ id: a.id, name: a.name })),
      { id: folder.id, name: folder.name },
    ];
    const children = await this.repo.findChildren(id);
    return { ...toDtoNoFlag(folder, children.length > 0), breadcrumb };
  }

  async getTree(rootId: number | null, maxDepth: number): Promise<FolderDto[]> {
    if (maxDepth < 0 || maxDepth > 20) throw new ValidationError('maxDepth must be between 0 and 20');
    const rows = await this.repo.findSubtree(rootId, maxDepth);
    return rows.map(toDto);
  }

  async search(query: string, limit: number): Promise<FolderDto[]> {
    const trimmed = query.trim();
    if (trimmed.length === 0) return [];
    const rows = await this.repo.searchByName(trimmed, limit);
    return rows.map((r) => toDtoNoFlag(r));
  }
}
