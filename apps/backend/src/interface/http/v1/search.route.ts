import { Elysia, t } from 'elysia';
import type { Container } from '../container';

export const searchRoute = (c: Container) =>
  new Elysia({ prefix: '/api/v1/search' }).get(
    '/',
    async ({ query }) => {
      const q = query.q ?? '';
      const limit = query.limit ? Math.min(Number(query.limit), 200) : 50;
      const type = query.type ?? 'all';
      const [folders, files] = await Promise.all([
        type === 'file' ? Promise.resolve([]) : c.folderService.search(q, limit),
        type === 'folder' ? Promise.resolve([]) : c.fileService.search(q, limit),
      ]);
      return { data: { folders, files } };
    },
    {
      query: t.Object({
        q: t.Optional(t.String()),
        limit: t.Optional(t.String()),
        type: t.Optional(t.Union([t.Literal('folder'), t.Literal('file'), t.Literal('all')])),
      }),
    },
  );
