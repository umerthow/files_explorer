import { Elysia } from 'elysia';
import { cors } from '@elysiajs/cors';
import { swagger } from '@elysiajs/swagger';
import type { Container } from './container';
import { foldersRoute } from './v1/folders.route';
import { searchRoute } from './v1/search.route';
import { NotFoundError, ValidationError } from '../../domain/errors';

export const createServer = (c: Container) =>
  new Elysia()
    .use(
      cors({
        origin: process.env.CORS_ORIGIN?.split(',') ?? true,
        methods: ['GET'],
      }),
    )
    .use(swagger({ path: '/docs' }))
    .onError(({ error, set, code }) => {
      // Elysia validation
      if (code === 'VALIDATION') {
        set.status = 400;
        return { error: { code: 'VALIDATION', message: (error as Error).message } };
      }
      const err = error as unknown as { code?: string; message?: string };
      if (err?.code === 'NOT_FOUND' || error instanceof NotFoundError) {
        set.status = 404;
        return { error: { code: 'NOT_FOUND', message: err.message ?? 'Not found' } };
      }
      if (err?.code === 'VALIDATION_ERROR' || error instanceof ValidationError) {
        set.status = 400;
        return { error: { code: 'VALIDATION_ERROR', message: err.message ?? 'Invalid' } };
      }
      console.error('[server error]', error);
      set.status = 500;
      return { error: { code: 'INTERNAL', message: 'Internal server error' } };
    })
    .get('/health', () => ({ data: { status: 'ok', uptime: process.uptime() } }))
    .use(foldersRoute(c))
    .use(searchRoute(c));

export type Server = ReturnType<typeof createServer>;
