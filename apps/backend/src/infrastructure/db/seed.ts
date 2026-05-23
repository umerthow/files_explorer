import { sqlClient, db } from './client';
import { files, folders } from './schema';
import { sql } from 'drizzle-orm';

const FOLDER_NAMES = [
  'Documents', 'Pictures', 'Music', 'Videos', 'Downloads', 'Desktop', 'Projects',
  'Work', 'Personal', 'Archive', 'Backup', 'Notes', 'Research', 'Reports',
  'Invoices', 'Contracts', 'Photos', 'Travel', 'Family', 'Friends', 'Recipes',
  'Books', 'Code', 'Designs', 'Drafts', 'Final', 'Reviews', 'Misc', 'Inbox',
  'Shared', 'Public', 'Templates',
];

const FILE_EXTS: Array<[string, string]> = [
  ['txt', 'text/plain'],
  ['md', 'text/markdown'],
  ['pdf', 'application/pdf'],
  ['jpg', 'image/jpeg'],
  ['png', 'image/png'],
  ['mp3', 'audio/mpeg'],
  ['mp4', 'video/mp4'],
  ['zip', 'application/zip'],
  ['json', 'application/json'],
  ['csv', 'text/csv'],
];

const FILE_STEMS = [
  'notes', 'report', 'summary', 'draft', 'final', 'meeting', 'budget',
  'roadmap', 'design', 'spec', 'todo', 'invoice', 'photo', 'screenshot',
  'memo', 'plan', 'log', 'data', 'export', 'backup',
];

interface Config {
  rootCount: number;
  maxDepth: number;
  childrenPerFolder: [number, number];
  filesPerFolder: [number, number];
  targetFolders: number;
}

const CONFIG: Config = {
  rootCount: 6,
  maxDepth: 6,
  childrenPerFolder: [2, 6],
  filesPerFolder: [0, 8],
  targetFolders: 2000, // keep seed fast; bump for stress tests
};

const rand = (min: number, max: number) => min + Math.floor(Math.random() * (max - min + 1));
const pick = <T>(arr: readonly T[]): T => arr[Math.floor(Math.random() * arr.length)]!;

interface PendingFolder {
  parentId: number | null;
  parentPath: string;
  depth: number;
  name: string;
}

async function reset() {
  await sqlClient.unsafe('TRUNCATE TABLE files, folders RESTART IDENTITY CASCADE');
}

async function insertFolderBatch(batch: PendingFolder[]) {
  if (batch.length === 0) return [] as { id: number; path: string; depth: number; parentId: number | null }[];
  const rows = await db
    .insert(folders)
    .values(
      batch.map((b) => ({
        parentId: b.parentId,
        name: b.name,
        path: '__pending__',
        depth: b.depth,
      })),
    )
    .returning({ id: folders.id, parentId: folders.parentId, depth: folders.depth });

  // Fix paths now that we have ids
  const updates = rows.map((r, idx) => {
    const parentPath = batch[idx]!.parentPath;
    const path = `${parentPath}${r.id}/`;
    return { id: r.id, path, depth: r.depth, parentId: r.parentId };
  });

  // Bulk update paths via a single CASE
  const caseExpr = sql.join(
    updates.map((u) => sql`WHEN ${u.id} THEN ${u.path}`),
    sql.raw(' '),
  );
  const idList = sql.join(
    updates.map((u) => sql`${u.id}`),
    sql.raw(','),
  );
  await db.execute(sql`UPDATE folders SET path = CASE id ${caseExpr} END WHERE id IN (${idList})`);
  return updates;
}

async function insertFilesFor(folderIds: number[]) {
  const allFiles: Array<{ folderId: number; name: string; size: number; mimeType: string }> = [];
  const seenPerFolder = new Map<number, Set<string>>();
  for (const fid of folderIds) {
    const count = rand(CONFIG.filesPerFolder[0], CONFIG.filesPerFolder[1]);
    const seen = new Set<string>();
    for (let i = 0; i < count; i++) {
      const stem = pick(FILE_STEMS);
      const [ext, mime] = pick(FILE_EXTS);
      let name = `${stem}.${ext}`;
      let n = 1;
      while (seen.has(name)) {
        name = `${stem}-${n++}.${ext}`;
      }
      seen.add(name);
      allFiles.push({
        folderId: fid,
        name,
        size: rand(100, 5_000_000),
        mimeType: mime,
      });
    }
    seenPerFolder.set(fid, seen);
  }
  if (allFiles.length === 0) return 0;
  // Chunk inserts to avoid huge statements
  const CHUNK = 1000;
  for (let i = 0; i < allFiles.length; i += CHUNK) {
    await db.insert(files).values(allFiles.slice(i, i + CHUNK));
  }
  return allFiles.length;
}

async function main() {
  console.log('[seed] resetting tables...');
  await reset();

  let totalFolders = 0;
  const allInsertedFolderIds: number[] = [];

  // BFS frontier of folders to expand
  type Frontier = { id: number; path: string; depth: number };
  let frontier: Frontier[] = [];

  // Roots
  const rootBatch: PendingFolder[] = [];
  const usedRootNames = new Set<string>();
  for (let i = 0; i < CONFIG.rootCount; i++) {
    let name = pick(FOLDER_NAMES);
    let n = 1;
    while (usedRootNames.has(name)) name = `${pick(FOLDER_NAMES)}-${n++}`;
    usedRootNames.add(name);
    rootBatch.push({ parentId: null, parentPath: '/', depth: 0, name });
  }
  const insertedRoots = await insertFolderBatch(rootBatch);
  totalFolders += insertedRoots.length;
  allInsertedFolderIds.push(...insertedRoots.map((r) => r.id));
  frontier = insertedRoots.map((r) => ({ id: r.id, path: r.path, depth: r.depth }));

  while (frontier.length > 0 && totalFolders < CONFIG.targetFolders) {
    const nextBatch: PendingFolder[] = [];
    for (const f of frontier) {
      if (f.depth >= CONFIG.maxDepth) continue;
      const count = rand(CONFIG.childrenPerFolder[0], CONFIG.childrenPerFolder[1]);
      const used = new Set<string>();
      for (let i = 0; i < count; i++) {
        let name = pick(FOLDER_NAMES);
        let n = 1;
        while (used.has(name)) name = `${pick(FOLDER_NAMES)}-${n++}`;
        used.add(name);
        nextBatch.push({
          parentId: f.id,
          parentPath: f.path,
          depth: f.depth + 1,
          name,
        });
        if (totalFolders + nextBatch.length >= CONFIG.targetFolders) break;
      }
      if (totalFolders + nextBatch.length >= CONFIG.targetFolders) break;
    }
    if (nextBatch.length === 0) break;
    const inserted = await insertFolderBatch(nextBatch);
    totalFolders += inserted.length;
    allInsertedFolderIds.push(...inserted.map((r) => r.id));
    frontier = inserted.map((r) => ({ id: r.id, path: r.path, depth: r.depth }));
    console.log(`[seed] inserted ${inserted.length} folders (depth=${frontier[0]?.depth}), total=${totalFolders}`);
  }

  console.log(`[seed] folders done: ${totalFolders}. inserting files...`);
  const totalFiles = await insertFilesFor(allInsertedFolderIds);
  console.log(`[seed] files done: ${totalFiles}`);

  await sqlClient.end();
}

await main();
