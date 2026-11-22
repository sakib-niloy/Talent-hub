// Standalone migration runner: `npm run db:migrate` (also runs automatically on boot
// unless RUN_MIGRATIONS=false).
import { loadConfig } from '../config/env.js';
import { createDatabase } from '../lib/db.js';

const config = loadConfig();
const database = await createDatabase({ url: config.DATABASE_URL, pgliteDir: config.PGLITE_DIR });
await database.migrate();
console.log(`Migrations applied (${database.driver}).`);
await database.close();
