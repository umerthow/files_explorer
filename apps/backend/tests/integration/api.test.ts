import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';
import { DrizzleFolderRepository } from '../../src/infrastructure/repositories/folder.repository.drizzle';
import { DrizzleFileRepository } from '../../src/infrastructure/repositories/file.repository.drizzle';
import { FolderService } from '../../src/application/folder.service';
import { FileService } from '../../src/application/file.service';
import { createContainer } from '../../src/interface/http/container';
import { createServer } from '../../src/interface/http/server';
import { files, folders } from '../../src/infrastructure/db/schema';
import { sql } from 'drizzle-orm';

const TEST_URL =
  process.env.TEST_DATABASE_URL ?? 'postgres://postgres:postgres@localhost:5432/explorer_test';

const client = postgres(TEST_URL, { max: 5 });
const db = drizzle(client);

async function seedFixture() {
  await client.unsafe('TRUNCATE TABLE files, folders RESTART IDENTITY CASCADE');
  // /Documents
  const [doc] = await db
    .insert(folders)
    .values({ parentId: null, name: 'Documents', path: '__', depth: 0 })
    .returning();
  await db.update(folders).set({ path: `/${doc!.id}/` }).where(sql`id = ${doc!.id}`);
  // /Documents/Work
  const [work] = await db
    .insert(folders)
    .values({ parentId: doc!.id, name: 'Work', path: '__', depth: 1 })
    .returning();
  await db.update(folders).set({ path: `/${doc!.id}/${work!.id}/` }).where(sql`id = ${work!.id}`);
  // /Documents/Personal
  const [personal] = await db
    .insert(folders)
    .values({ parentId: doc!.id, name: 'Personal', path: '__', depth: 1 })
    .returning();
  await db
    .update(folders)
    .set({ path: `/${doc!.id}/${personal!.id}/` })
    .where(sql`id = ${personal!.id}`);
  // /Pictures (empty)
  const [pics] = await db
    .insert(folders)
    .values({ parentId: null, name: 'Pictures', path: '__', depth: 0 })
    .returning();
  await db.update(folders).set({ path: `/${pics!.id}/` }).where(sql`id = ${pics!.id}`);

  await db.insert(files).values([
    { folderId: work!.id, name: 'report.pdf', size: 1234, mimeType: 'application/pdf' },
    { folderId: work!.id, name: 'notes.md', size: 88, mimeType: 'text/markdown' },
  ]);
  return { docId: doc!.id, workId: work!.id, personalId: personal!.id, picsId: pics!.id };
}

let ids: Awaited<ReturnType<typeof seedFixture>>;

beforeAll(async () => {
  await migrate(db, { migrationsFolder: `${import.meta.dir}/../../src/infrastructure/db/migrations` });
  ids = await seedFixture();
});

afterAll(async () => {
  await client.end();
});

describe('Drizzle repositories', () => {
  it('returns roots and child flags', async () => {
    const repo = new DrizzleFolderRepository(db as any);
    const svc = new FolderService(repo);
    const roots = await svc.listRoots();
    expect(roots).toHaveLength(2);
    const docs = roots.find((r) => r.name === 'Documents')!;
    const pics = roots.find((r) => r.name === 'Pictures')!;
    expect(docs.hasChildren).toBe(true);
    expect(pics.hasChildren).toBe(false);
  });

  it('returns children for a folder', async () => {
    const repo = new DrizzleFolderRepository(db as any);
    const svc = new FolderService(repo);
    const children = await svc.listChildren(ids.docId);
    expect(children.map((c) => c.name).sort()).toEqual(['Personal', 'Work']);
  });

  it('returns files for a folder', async () => {
    const folderRepo = new DrizzleFolderRepository(db as any);
    const fileRepo = new DrizzleFileRepository(db as any);
    const svc = new FileService(fileRepo, folderRepo);
    const list = await svc.listInFolder(ids.workId, 50, null);
    expect(list.map((f) => f.name).sort()).toEqual(['notes.md', 'report.pdf']);
  });

  it('search finds folder by partial name', async () => {
    const repo = new DrizzleFolderRepository(db as any);
    const svc = new FolderService(repo);
    const res = await svc.search('work', 10);
    expect(res.map((r) => r.name)).toContain('Work');
  });
});

describe('HTTP endpoints', () => {
  // Build a server bound to the test DB
  const folderRepo = new DrizzleFolderRepository(db as any);
  const fileRepo = new DrizzleFileRepository(db as any);
  const c = {
    folderService: new FolderService(folderRepo),
    fileService: new FileService(fileRepo, folderRepo),
  };
  const app = createServer(c);

  it('GET /health', async () => {
    const res = await app.handle(new Request('http://localhost/health'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.status).toBe('ok');
  });

  it('GET /api/v1/folders/roots', async () => {
    const res = await app.handle(new Request('http://localhost/api/v1/folders/roots'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.length).toBe(2);
  });

  it('GET /api/v1/folders/:id/children', async () => {
    const res = await app.handle(new Request(`http://localhost/api/v1/folders/${ids.docId}/children`));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.map((c: { name: string }) => c.name).sort()).toEqual(['Personal', 'Work']);
  });

  it('GET unknown folder → 404', async () => {
    const res = await app.handle(new Request('http://localhost/api/v1/folders/999999/children'));
    expect(res.status).toBe(404);
  });

  it('GET /api/v1/search', async () => {
    const res = await app.handle(new Request('http://localhost/api/v1/search?q=report'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.files.map((f: { name: string }) => f.name)).toContain('report.pdf');
  });
});

// avoid unused warnings for createContainer
void createContainer;
