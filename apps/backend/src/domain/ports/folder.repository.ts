import type { FolderEntity, FolderWithChildFlag } from '../folder.entity';

export interface FolderRepository {
  findRoots(): Promise<FolderWithChildFlag[]>;
  findById(id: number): Promise<FolderEntity | null>;
  findChildren(parentId: number): Promise<FolderWithChildFlag[]>;
  findAncestors(id: number): Promise<FolderEntity[]>;
  findSubtree(rootId: number | null, maxDepth: number): Promise<FolderWithChildFlag[]>;
  searchByName(query: string, limit: number): Promise<FolderEntity[]>;
}
