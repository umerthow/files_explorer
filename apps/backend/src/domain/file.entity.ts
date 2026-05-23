export interface FileEntity {
  id: number;
  folderId: number;
  name: string;
  size: number;
  mimeType: string | null;
  createdAt: Date;
}
