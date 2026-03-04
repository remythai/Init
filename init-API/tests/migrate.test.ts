import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockClient, mockPool } = vi.hoisted(() => {
  const mockClient = {
    query: vi.fn(),
    release: vi.fn(),
  };
  const mockPool = {
    query: vi.fn(),
    connect: vi.fn().mockResolvedValue(mockClient),
  };
  return { mockClient, mockPool };
});

vi.mock('../config/database', () => ({
  default: mockPool,
}));

vi.mock('../utils/logger', () => ({
  default: {
    info: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('fs', async () => {
  const actual = await vi.importActual<typeof import('fs')>('fs');
  return {
    ...actual,
    default: {
      ...actual,
      existsSync: vi.fn(),
      readdirSync: vi.fn(),
      readFileSync: vi.fn(),
    },
  };
});

import fs from 'fs';
import { runMigrations } from '../migrate';

describe('runMigrations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPool.connect.mockResolvedValue(mockClient);
  });

  it('should create schema_migrations table if it does not exist', async () => {
    mockPool.query
      .mockResolvedValueOnce(undefined) // CREATE TABLE
      .mockResolvedValueOnce({ rows: [] }); // SELECT applied
    vi.mocked(fs.existsSync).mockReturnValue(false);

    await runMigrations();

    expect(mockPool.query).toHaveBeenCalledWith(
      expect.stringContaining('CREATE TABLE IF NOT EXISTS schema_migrations')
    );
  });

  it('should return early if no migration files found', async () => {
    mockPool.query
      .mockResolvedValueOnce(undefined) // CREATE TABLE
      .mockResolvedValueOnce({ rows: [] }); // SELECT applied
    vi.mocked(fs.existsSync).mockReturnValue(false);

    await runMigrations();

    expect(mockPool.connect).not.toHaveBeenCalled();
  });

  it('should apply all migrations on a fresh database', async () => {
    mockPool.query
      .mockResolvedValueOnce(undefined) // CREATE TABLE
      .mockResolvedValueOnce({ rows: [] }) // SELECT applied (none)
      .mockResolvedValueOnce({ rows: [{ exists: false }] }); // isExistingDatabase -> no users table

    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.readdirSync).mockReturnValue([
      '0001_baseline.sql' as unknown as import('fs').Dirent,
      '0002_add_bio.sql' as unknown as import('fs').Dirent,
    ]);
    vi.mocked(fs.readFileSync)
      .mockReturnValueOnce('CREATE TABLE users (id SERIAL);')
      .mockReturnValueOnce('ALTER TABLE users ADD COLUMN bio TEXT;');

    mockClient.query.mockResolvedValue(undefined);

    await runMigrations();

    // 2 migrations * 4 queries each (BEGIN, SQL, INSERT, COMMIT)
    expect(mockClient.query).toHaveBeenCalledTimes(8);
    expect(mockClient.release).toHaveBeenCalledTimes(2);
  });

  it('should mark all migrations as applied on existing database', async () => {
    mockPool.query
      .mockResolvedValueOnce(undefined) // CREATE TABLE
      .mockResolvedValueOnce({ rows: [] }) // SELECT applied (none)
      .mockResolvedValueOnce({ rows: [{ exists: true }] }) // isExistingDatabase -> users exist
      .mockResolvedValueOnce(undefined) // INSERT 0001
      .mockResolvedValueOnce(undefined); // INSERT 0002

    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.readdirSync).mockReturnValue([
      '0001_baseline.sql' as unknown as import('fs').Dirent,
      '0002_add_bio.sql' as unknown as import('fs').Dirent,
    ]);

    await runMigrations();

    // All migrations marked via pool.query INSERT
    expect(mockPool.query).toHaveBeenCalledWith(
      'INSERT INTO schema_migrations (name) VALUES ($1)',
      ['0001_baseline.sql']
    );
    expect(mockPool.query).toHaveBeenCalledWith(
      'INSERT INTO schema_migrations (name) VALUES ($1)',
      ['0002_add_bio.sql']
    );
    // No migrations applied via client (all already in DB)
    expect(mockClient.query).not.toHaveBeenCalled();
  });

  it('should skip already applied migrations', async () => {
    mockPool.query
      .mockResolvedValueOnce(undefined) // CREATE TABLE
      .mockResolvedValueOnce({ rows: [{ name: '0001_baseline.sql' }, { name: '0002_add_bio.sql' }] });

    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.readdirSync).mockReturnValue([
      '0001_baseline.sql' as unknown as import('fs').Dirent,
      '0002_add_bio.sql' as unknown as import('fs').Dirent,
    ]);

    await runMigrations();

    expect(mockPool.connect).not.toHaveBeenCalled();
    expect(fs.readFileSync).not.toHaveBeenCalled();
  });

  it('should rollback and throw on migration failure', async () => {
    mockPool.query
      .mockResolvedValueOnce(undefined) // CREATE TABLE
      .mockResolvedValueOnce({ rows: [] }) // SELECT applied
      .mockResolvedValueOnce({ rows: [{ exists: false }] }); // fresh DB

    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.readdirSync).mockReturnValue([
      '0001_baseline.sql' as unknown as import('fs').Dirent,
    ]);
    vi.mocked(fs.readFileSync).mockReturnValue('INVALID SQL;');

    mockClient.query
      .mockResolvedValueOnce(undefined) // BEGIN
      .mockRejectedValueOnce(new Error('syntax error')); // SQL fails

    await expect(runMigrations()).rejects.toThrow('syntax error');
    expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
    expect(mockClient.release).toHaveBeenCalled();
  });

  it('should not apply migrations after a failed one', async () => {
    mockPool.query
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ exists: false }] });

    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.readdirSync).mockReturnValue([
      '0001_baseline.sql' as unknown as import('fs').Dirent,
      '0002_add_bio.sql' as unknown as import('fs').Dirent,
    ]);
    vi.mocked(fs.readFileSync).mockReturnValue('INVALID SQL;');

    mockClient.query
      .mockResolvedValueOnce(undefined) // BEGIN
      .mockRejectedValueOnce(new Error('syntax error')); // SQL fails

    await expect(runMigrations()).rejects.toThrow('syntax error');

    // readFileSync called only once (first migration), second never reached
    expect(fs.readFileSync).toHaveBeenCalledTimes(1);
  });

  it('should ignore non-.sql files', async () => {
    mockPool.query
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce({ rows: [] });

    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.readdirSync).mockReturnValue([
      'README.md' as unknown as import('fs').Dirent,
      '.gitkeep' as unknown as import('fs').Dirent,
    ]);

    await runMigrations();

    expect(mockPool.connect).not.toHaveBeenCalled();
  });

  it('should apply migrations in sorted order', async () => {
    mockPool.query
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ exists: false }] });

    vi.mocked(fs.existsSync).mockReturnValue(true);
    // Return unsorted to verify sort
    vi.mocked(fs.readdirSync).mockReturnValue([
      '0003_third.sql' as unknown as import('fs').Dirent,
      '0001_first.sql' as unknown as import('fs').Dirent,
      '0002_second.sql' as unknown as import('fs').Dirent,
    ]);
    vi.mocked(fs.readFileSync).mockReturnValue('SELECT 1;');
    mockClient.query.mockResolvedValue(undefined);

    await runMigrations();

    const insertCalls = mockClient.query.mock.calls
      .filter(call => typeof call[0] === 'string' && call[0].includes('INSERT INTO schema_migrations'));
    expect(insertCalls[0][1]).toEqual(['0001_first.sql']);
    expect(insertCalls[1][1]).toEqual(['0002_second.sql']);
    expect(insertCalls[2][1]).toEqual(['0003_third.sql']);
  });

  it('should release client even on rollback failure', async () => {
    mockPool.query
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ exists: false }] });

    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.readdirSync).mockReturnValue([
      '0001_baseline.sql' as unknown as import('fs').Dirent,
    ]);
    vi.mocked(fs.readFileSync).mockReturnValue('BAD SQL;');

    mockClient.query
      .mockResolvedValueOnce(undefined) // BEGIN
      .mockRejectedValueOnce(new Error('sql error')) // SQL fails
      .mockResolvedValueOnce(undefined); // ROLLBACK

    await expect(runMigrations()).rejects.toThrow('sql error');
    expect(mockClient.release).toHaveBeenCalledTimes(1);
  });
});
