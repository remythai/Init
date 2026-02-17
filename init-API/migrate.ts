import fs from 'fs';
import path from 'path';
import pool from './config/database.js';
import logger from './utils/logger.js';

const MIGRATIONS_DIR = path.join(process.cwd(), 'migrations');

async function ensureMigrationsTable(): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) UNIQUE NOT NULL,
      applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);
}

async function getAppliedMigrations(): Promise<Set<string>> {
  const { rows } = await pool.query('SELECT name FROM schema_migrations ORDER BY id');
  return new Set(rows.map((r: { name: string }) => r.name));
}

async function isExistingDatabase(): Promise<boolean> {
  const { rows } = await pool.query(`
    SELECT EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = 'users'
    ) AS exists
  `);
  return rows[0].exists;
}

function getMigrationFiles(): string[] {
  if (!fs.existsSync(MIGRATIONS_DIR)) {
    return [];
  }
  return fs.readdirSync(MIGRATIONS_DIR)
    .filter(f => f.endsWith('.sql'))
    .sort();
}

export async function runMigrations(): Promise<void> {
  await ensureMigrationsTable();

  const applied = await getAppliedMigrations();
  const files = getMigrationFiles();

  if (files.length === 0) {
    logger.info('No migration files found');
    return;
  }

  // Detect existing database without schema_migrations history
  if (applied.size === 0 && await isExistingDatabase()) {
    const baseline = files[0];
    await pool.query('INSERT INTO schema_migrations (name) VALUES ($1)', [baseline]);
    logger.info({ migration: baseline }, 'Existing database detected, baseline marked as applied');
    applied.add(baseline);
  }

  let count = 0;
  for (const file of files) {
    if (applied.has(file)) {
      continue;
    }

    const filePath = path.join(MIGRATIONS_DIR, file);
    const sql = fs.readFileSync(filePath, 'utf-8');

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(sql);
      await client.query('INSERT INTO schema_migrations (name) VALUES ($1)', [file]);
      await client.query('COMMIT');
      logger.info({ migration: file }, 'Migration applied');
      count++;
    } catch (err) {
      await client.query('ROLLBACK');
      logger.error({ migration: file, err }, 'Migration failed');
      throw err;
    } finally {
      client.release();
    }
  }

  if (count === 0) {
    logger.info('All migrations already applied');
  } else {
    logger.info({ count }, 'Migrations completed');
  }
}
