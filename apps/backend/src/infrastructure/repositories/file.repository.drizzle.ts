import { and, asc, eq, gt, like, sql } from 'drizzle-orm';
import type { DB } from '../db/client';
import { files } from '../db/schema';
import type { FileEntity } from '../../domain/file.entity';
import type { FileRepository } from '../../domain/ports/file.repository';

const mapRow = (r: typeof files.$inferSelect): FileEntity => ({
  id: r.id,
  folderId: r.folderId,
  name: r.name,
  size: r.size,
  mimeType: r.mimeType,
  createdAt: r.createdAt,
});

export class DrizzleFileRepository implements FileRepository {
  constructor(private readonly db: DB) {}

  async findByFolder(folderId: number, limit: number, cursor: number | null): Promise<FileEntity[]> {
    const conditions = [eq(files.folderId, folderId)];
    if (cursor != null) conditions.push(gt(files.id, cursor));
    const rows = await this.db
      .select()
      .from(files)
      .where(and(...conditions))
      .orderBy(asc(files.id))
      .limit(limit);
    return rows.map(mapRow);
  }

  async searchByName(query: string, limit: number): Promise<FileEntity[]> {
    const q = `%${query.toLowerCase()}%`;
    const rows = await this.db
      .select()
      .from(files)
      .where(like(sql`lower(${files.name})`, q))
      .orderBy(asc(files.name))
      .limit(limit);
    return rows.map(mapRow);
  }
}
