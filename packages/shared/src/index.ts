export type FolderId = number;
export type FileId = number;

export interface FolderDto {
  id: FolderId;
  parentId: FolderId | null;
  name: string;
  path: string;
  depth: number;
  hasChildren: boolean;
}

export interface FileDto {
  id: FileId;
  folderId: FolderId;
  name: string;
  size: number;
  mimeType: string | null;
}

export interface BreadcrumbItem {
  id: FolderId;
  name: string;
}

export interface FolderDetailDto extends FolderDto {
  breadcrumb: BreadcrumbItem[];
}

export interface ListMeta {
  total?: number;
  limit?: number;
  cursor?: string | null;
  nextCursor?: string | null;
}

export interface ApiEnvelope<T> {
  data: T;
  meta?: ListMeta;
}

export interface ApiError {
  error: { code: string; message: string; details?: unknown };
}

export interface SearchResultDto {
  folders: FolderDto[];
  files: FileDto[];
}
