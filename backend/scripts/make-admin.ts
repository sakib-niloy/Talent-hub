// Promote a user to admin:  npm run make-admin -- someone@example.com
// Uses the same DATABASE_URL as the app (set it to your Neon URL to run against production).
import { eq } from 'drizzle-orm';
import { loadConfig } from '../src/config/env.js';
import { createDatabase } from '../src/lib/db.js';
import { users } from '../src/db/schema.js';

const email = process.argv[2]?.trim().toLowerCase();
if (!email) {
  console.error('Usage: npm run make-admin -- <email>');
  process.exit(1);
}

const config = loadConfig();
const database = await createDatabase({ url: config.DATABASE_URL, pgliteDir: config.PGLITE_DIR });
await database.migrate();
const updated = await database.db
  .update(users)
  .set({ role: 'admin', updatedAt: new Date() })
  .where(eq(users.email, email))
  .returning({ id: users.id, handle: users.handle });
console.log(updated.length ? `✔ ${email} (@${updated[0]!.handle}) is now an admin.` : `✘ No user with email ${email}. Sign up first.`);
await database.close();
process.exit(updated.length ? 0 : 1);
