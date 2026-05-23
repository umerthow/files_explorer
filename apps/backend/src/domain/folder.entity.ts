export interface FolderEntity {
  id: number;
  parentId: number | null;
  name: string;
  path: string;
  depth: number;
  createdAt: Date;
}

export interface FolderWithChildFlag extends FolderEntity {
  hasChildren: boolean;
}
