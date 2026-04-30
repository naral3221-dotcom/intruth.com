import path from 'node:path';
import { fileURLToPath } from 'node:url';
import EmbeddedPostgres from 'embedded-postgres';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const port = Number(process.env.INTRUTH_DEV_DB_PORT || 5433);
const user = process.env.INTRUTH_DEV_DB_USER || 'postgres';
const password = process.env.INTRUTH_DEV_DB_PASSWORD || 'password';
const database = process.env.INTRUTH_DEV_DB_NAME || 'intruth_dev';
const databaseDir = path.resolve(
  rootDir,
  process.env.INTRUTH_DEV_DB_DIR || '.local-postgres/data'
);

const pg = new EmbeddedPostgres({
  databaseDir,
  user,
  password,
  port,
  persistent: true,
  onLog: (message) => {
    const text = String(message).trim();
    if (text) console.log(`[postgres] ${text}`);
  },
  onError: (message) => {
    const text = String(message).trim();
    if (text) console.error(`[postgres] ${text}`);
  },
});

async function createDatabaseIfNeeded() {
  try {
    await pg.createDatabase(database);
    console.log(`[postgres] database created: ${database}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (!message.toLowerCase().includes('already exists')) {
      throw error;
    }
    console.log(`[postgres] database already exists: ${database}`);
  }
}

async function main() {
  await pg.initialise();
  await pg.start();
  await createDatabaseIfNeeded();

  console.log('[postgres] ready');
  console.log(`DATABASE_URL=postgresql://${user}:${password}@127.0.0.1:${port}/${database}?schema=public`);

  const stop = async () => {
    console.log('[postgres] stopping...');
    await pg.stop();
    process.exit(0);
  };

  process.on('SIGINT', () => void stop());
  process.on('SIGTERM', () => void stop());

  await new Promise(() => {});
}

main().catch((error) => {
  console.error('[postgres] failed to start');
  console.error(error);
  process.exit(1);
});
