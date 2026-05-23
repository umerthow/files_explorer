import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

const url = process.env.DATABASE_URL ?? 'postgres://postgres:postgres@localhost:5432/explorer';

export const sqlClient = postgres(url, { max: 10 });
export const db = drizzle(sqlClient, { schema });
export type DB = typeof db;
