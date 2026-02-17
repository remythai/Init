import fs from 'fs';
import path from 'path';

const MIGRATIONS_DIR = path.join(process.cwd(), 'migrations');

const name = process.argv[2];
if (!name) {
  console.error('Usage: npm run migrate:create <migration_name>');
  process.exit(1);
}

if (!/^[a-z0-9_]+$/.test(name)) {
  console.error('Migration name must contain only lowercase letters, numbers, and underscores');
  process.exit(1);
}

if (!fs.existsSync(MIGRATIONS_DIR)) {
  fs.mkdirSync(MIGRATIONS_DIR, { recursive: true });
}

const existing = fs.readdirSync(MIGRATIONS_DIR)
  .filter(f => f.endsWith('.sql'))
  .sort();

let nextNum = 1;
if (existing.length > 0) {
  const last = existing[existing.length - 1];
  const match = last.match(/^(\d+)_/);
  if (match) {
    nextNum = parseInt(match[1], 10) + 1;
  }
}

const padded = String(nextNum).padStart(4, '0');
const filename = `${padded}_${name}.sql`;
const filepath = path.join(MIGRATIONS_DIR, filename);

fs.writeFileSync(filepath, `-- Migration: ${name}\n\n`);
console.log(`Created: migrations/${filename}`);
