import { sqlClient } from './client';

await sqlClient.unsafe('DROP TABLE IF EXISTS files CASCADE; DROP TABLE IF EXISTS folders CASCADE; DROP TABLE IF EXISTS "__drizzle_migrations" CASCADE; DROP SCHEMA IF EXISTS drizzle CASCADE;');
await sqlClient.end();
console.log('Database reset.');
