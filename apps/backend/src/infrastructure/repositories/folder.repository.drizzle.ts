import { and, asc, eq, inArray, isNull, like, sql } from 'drizzle-orm';
import type { DB } from '../db/client';
import { folders } from '../db/schema';
import type { FolderEntity, FolderWithChildFlag } from '../../domain/folder.entity';
import type { FolderRepository } from '../../domain/ports/folder.repository';

const mapRow = (r: typeof folders.$inferSelect): FolderEntity => ({
  id: r.id,
  parentId: r.parentId,
  name: r.name,
  path: r.path,
  depth: r.depth,
  createdAt: r.createdAt,
});

export class DrizzleFolderRepository implements FolderRepository {
  constructor(private readonly db: DB) {}

  async findRoots(): Promise<FolderWithChildFlag[]> {
    const rows = await this.db
      .select({
        id: folders.id,
        parentId: folders.parentId,
        name: folders.name,
        path: folders.path,
        depth: folders.depth,
        createdAt: folders.createdAt,
        hasChildren: sql<boolean>`EXISTS (SELECT 1 FROM ${folders} c WHERE c.parent_id = folders.id)`.as('has_children'),
      })
      .from(folders)
      .where(isNull(folders.parentId))
      .orderBy(asc(folders.name));
    return rows.map((r) => ({ ...mapRow(r), hasChildren: r.hasChildren === true || r.hasChildren === ('t' as unknown as boolean) }));
  }

  async findById(id: number): Promise<FolderEntity | null> {
    const [row] = await this.db.select().from(folders).where(eq(folders.id, id)).limit(1);
    return row ? mapRow(row) : null;
  }

  async findChildren(parentId: number): Promise<FolderWithChildFlag[]> {
    const rows = await this.db
      .select({
        id: folders.id,
        parentId: folders.parentId,
        name: folders.name,
        path: folders.path,
        depth: folders.depth,
        createdAt: folders.createdAt,
        hasChildren: sql<boolean>`EXISTS (SELECT 1 FROM ${folders} c WHERE c.parent_id = folders.id)`.as('has_children'),
      })
      .from(folders)
      .where(eq(folders.parentId, parentId))
      .orderBy(asc(folders.name));
    return rows.map((r) => ({ ...mapRow(r), hasChildren: r.hasChildren === true || r.hasChildren === ('t' as unknown as boolean) }));
  }

  async findAncestors(id: number): Promise<FolderEntity[]> {
    // path looks like "/1/4/9/" → ancestor ids are 1,4 (excluding self id 9)
    const self = await this.findById(id);
    if (!self) return [];
    const ids = self.path
      .split('/')
      .map((s) => s.trim())
      .filter((s) => s.length > 0)
      .map(Number)
      .filter((n) => Number.isFinite(n) && n !== id);
    if (ids.length === 0) return [];
    const rows = await this.db.select().from(folders).where(inArray(folders.id, ids));
    const byId = new Map(rows.map((r) => [r.id, mapRow(r)]));
    return ids.map((aid) => byId.get(aid)).filter((x): x is FolderEntity => Boolean(x));
  }

  async findSubtree(rootId: number | null, maxDepth: number): Promise<FolderWithChildFlag[]> {
    const rootDepth = rootId == null ? 0 : (await this.findById(rootId))?.depth ?? 0;
    const conditions = [sql`${folders.depth} <= ${rootDepth + maxDepth}`];
    if (rootId == null) {
      // all
    } else {
      const self = await this.findById(rootId);
      if (!self) return [];
      conditions.push(sql`(${folders.id} = ${rootId} OR ${folders.path} LIKE ${self.path + '%'})`);
    }
    const rows = await this.db
      .select({
        id: folders.id,
        parentId: folders.parentId,
        name: folders.name,
        path: folders.path,
        depth: folders.depth,
        createdAt: folders.createdAt,
        hasChildren: sql<boolean>`EXISTS (SELECT 1 FROM ${folders} c WHERE c.parent_id = folders.id)`.as('has_children'),
      })
      .from(folders)
      .where(and(...conditions))
      .orderBy(asc(folders.depth), asc(folders.name));
    return rows.map((r) => ({ ...mapRow(r), hasChildren: r.hasChildren === true || r.hasChildren === ('t' as unknown as boolean) }));
  }

  async searchByName(query: string, limit: number): Promise<FolderEntity[]> {
    const q = `%${query.toLowerCase()}%`;
    const rows = await this.db
      .select()
      .from(folders)
      .where(like(sql`lower(${folders.name})`, q))
      .orderBy(asc(folders.name))
      .limit(limit);
    return rows.map(mapRow);
  }
}
