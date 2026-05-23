import {
  bigint,
  bigserial,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

export const folders = pgTable(
  'folders',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    parentId: bigint('parent_id', { mode: 'number' }).references((): any => folders.id, {
      onDelete: 'cascade',
    }),
    name: text('name').notNull(),
    path: text('path').notNull(),
    depth: integer('depth').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    parentIdx: index('folders_parent_idx').on(t.parentId),
    pathIdx: index('folders_path_idx').on(t.path),
    nameLowerIdx: index('folders_name_lower_idx').on(sql`lower(${t.name})`),
    uniqSibling: uniqueIndex('folders_parent_name_uniq').on(t.parentId, t.name),
  }),
);

export const files = pgTable(
  'files',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    folderId: bigint('folder_id', { mode: 'number' })
      .references(() => folders.id, { onDelete: 'cascade' })
      .notNull(),
    name: text('name').notNull(),
    size: bigint('size', { mode: 'number' }).notNull().default(0),
    mimeType: text('mime_type'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    folderIdx: index('files_folder_idx').on(t.folderId),
    nameLowerIdx: index('files_name_lower_idx').on(sql`lower(${t.name})`),
    uniqInFolder: uniqueIndex('files_folder_name_uniq').on(t.folderId, t.name),
  }),
);

export type FolderRow = typeof folders.$inferSelect;
export type FileRow = typeof files.$inferSelect;
