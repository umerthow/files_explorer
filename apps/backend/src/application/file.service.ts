import type { FileDto } from '@we/shared';
import type { FileRepository } from '../domain/ports/file.repository';
import type { FolderRepository } from '../domain/ports/folder.repository';
import type { FileEntity } from '../domain/file.entity';
import { NotFoundError } from '../domain/errors';

const toDto = (f: FileEntity): FileDto => ({
  id: f.id,
  folderId: f.folderId,
  name: f.name,
  size: f.size,
  mimeType: f.mimeType,
});

export class FileService {
  constructor(
    private readonly files: FileRepository,
    private readonly folders: FolderRepository,
  ) {}

  async listInFolder(folderId: number, limit: number, cursor: number | null): Promise<FileDto[]> {
    const folder = await this.folders.findById(folderId);
    if (!folder) throw new NotFoundError('Folder', folderId);
    const rows = await this.files.findByFolder(folderId, limit, cursor);
    return rows.map(toDto);
  }

  async search(query: string, limit: number): Promise<FileDto[]> {
    const trimmed = query.trim();
    if (trimmed.length === 0) return [];
    const rows = await this.files.searchByName(trimmed, limit);
    return rows.map(toDto);
  }
}
