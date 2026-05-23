import type { FileEntity } from '../file.entity';

export interface FileRepository {
  findByFolder(folderId: number, limit: number, cursor: number | null): Promise<FileEntity[]>;
  searchByName(query: string, limit: number): Promise<FileEntity[]>;
}
