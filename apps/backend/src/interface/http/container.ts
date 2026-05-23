import { db } from '../../infrastructure/db/client';
import { DrizzleFolderRepository } from '../../infrastructure/repositories/folder.repository.drizzle';
import { DrizzleFileRepository } from '../../infrastructure/repositories/file.repository.drizzle';
import { FolderService } from '../../application/folder.service';
import { FileService } from '../../application/file.service';

export interface Container {
  folderService: FolderService;
  fileService: FileService;
}

export function createContainer(): Container {
  const folderRepo = new DrizzleFolderRepository(db);
  const fileRepo = new DrizzleFileRepository(db);
  const folderService = new FolderService(folderRepo);
  const fileService = new FileService(fileRepo, folderRepo);
  return { folderService, fileService };
}
