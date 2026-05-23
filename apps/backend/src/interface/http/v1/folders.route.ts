import { Elysia, t } from 'elysia';
import type { Container } from '../container';
import { NotFoundError, ValidationError } from '../../../domain/errors';

export const foldersRoute = (c: Container) =>
  new Elysia({ prefix: '/api/v1/folders' })
    .get('/roots', async () => ({ data: await c.folderService.listRoots() }))
    .get(
      '/tree',
      async ({ query }) => {
        const rootId = query.rootId ? Number(query.rootId) : null;
        const maxDepth = query.maxDepth ? Number(query.maxDepth) : 2;
        return { data: await c.folderService.getTree(rootId, maxDepth) };
      },
      {
        query: t.Object({
          rootId: t.Optional(t.String()),
          maxDepth: t.Optional(t.String()),
        }),
      },
    )
    .get(
      '/:id',
      async ({ params }) => ({ data: await c.folderService.getDetail(Number(params.id)) }),
      { params: t.Object({ id: t.String() }) },
    )
    .get(
      '/:id/children',
      async ({ params }) => ({ data: await c.folderService.listChildren(Number(params.id)) }),
      { params: t.Object({ id: t.String() }) },
    )
    .get(
      '/:id/files',
      async ({ params, query }) => {
        const limit = query.limit ? Math.min(Number(query.limit), 500) : 200;
        const cursor = query.cursor ? Number(query.cursor) : null;
        const data = await c.fileService.listInFolder(Number(params.id), limit, cursor);
        const nextCursor = data.length === limit ? String(data[data.length - 1]!.id) : null;
        return { data, meta: { limit, nextCursor } };
      },
      {
        params: t.Object({ id: t.String() }),
        query: t.Object({
          limit: t.Optional(t.String()),
          cursor: t.Optional(t.String()),
        }),
      },
    );

export { NotFoundError, ValidationError };
