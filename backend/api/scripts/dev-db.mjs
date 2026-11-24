// Dev/test-only PostgreSQL that lives inside this project (no system install, no Docker).
// Production uses a real managed Postgres. Data dir: backend/api/.pgdata (gitignored).
import EmbeddedPostgres from "embedded-postgres";
import { existsSync } from "fs";

const dir = new URL("../.pgdata", import.meta.url).pathname;
const port = Number(process.env.DEV_DB_PORT ?? 5433);
const pg = new EmbeddedPostgres({ databaseDir: dir, user: "lfg", password: "lfg", port, persistent: true });

if (!existsSync(`${dir}/PG_VERSION`)) await pg.initialise();
await pg.start();
for (const name of ["lfg", "lfg_test"]) {
  try { await pg.createDatabase(name); } catch { /* already exists */ }
}
console.log(`Postgres ready on port ${port} (databases: lfg, lfg_test). Ctrl+C to stop.`);
const stop = async () => { await pg.stop(); process.exit(0); };
process.on("SIGINT", stop); process.on("SIGTERM", stop);
