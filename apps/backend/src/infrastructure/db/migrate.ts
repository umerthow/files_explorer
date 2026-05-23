import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { db, sqlClient } from './client';

await migrate(db, { migrationsFolder: `${import.meta.dir}/migrations` });
await sqlClient.end();
console.log('Migrations applied.');
