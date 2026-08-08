import { DatabaseService } from './database.service';

const mockQuery = jest.fn();
const mockEnd = jest.fn();

jest.mock('pg', () => ({
  Pool: jest.fn().mockImplementation((opts: unknown) => ({
    __opts: opts,
    query: mockQuery,
    end: mockEnd,
  })),
}));

function makeConfig(databaseUrl: string | undefined) {
  return { get: jest.fn().mockReturnValue(databaseUrl) } as any;
}

describe('DatabaseService', () => {
  const originalDatabaseSsl = process.env.DATABASE_SSL;

  beforeEach(() => {
    jest.clearAllMocks();
    mockQuery.mockResolvedValue({ rows: [] });
    delete process.env.DATABASE_SSL;
  });

  afterEach(() => {
    if (originalDatabaseSsl === undefined) {
      delete process.env.DATABASE_SSL;
    } else {
      process.env.DATABASE_SSL = originalDatabaseSsl;
    }
  });

  describe('onModuleInit', () => {
    it('warns and leaves the pool unset when DATABASE_URL is not configured', () => {
      const service = new DatabaseService(makeConfig(undefined));

      service.onModuleInit();

      expect(service.connected).toBe(false);
    });

    it('errors and leaves the pool unset when the URL is malformed (host parses as "base")', () => {
      const service = new DatabaseService(
        makeConfig('DATABASE_URL=postgres://user:pass@host:5432/db'),
      );

      service.onModuleInit();

      expect(service.connected).toBe(false);
    });

    it('creates a pool with SSL enabled for a supabase.co host even when DATABASE_SSL=false', async () => {
      process.env.DATABASE_SSL = 'false';
      const { Pool } = jest.requireMock('pg');
      const service = new DatabaseService(
        makeConfig('postgres://user:pass@db.project.supabase.co:5432/postgres'),
      );

      service.onModuleInit();
      await flushMicrotasks();

      expect(Pool).toHaveBeenCalledWith(
        expect.objectContaining({ ssl: { rejectUnauthorized: false } }),
      );
      expect(service.connected).toBe(true);
    });

    it('creates a pool with SSL enabled by default for a non-supabase host', async () => {
      const { Pool } = jest.requireMock('pg');
      const service = new DatabaseService(makeConfig('postgres://user:pass@host:5432/db'));

      service.onModuleInit();
      await flushMicrotasks();

      expect(Pool).toHaveBeenCalledWith(
        expect.objectContaining({ ssl: { rejectUnauthorized: false } }),
      );
    });

    it('disables SSL when DATABASE_SSL=false and the host is not supabase.co', async () => {
      process.env.DATABASE_SSL = 'false';
      const { Pool } = jest.requireMock('pg');
      const service = new DatabaseService(makeConfig('postgres://user:pass@host:5432/db'));

      service.onModuleInit();
      await flushMicrotasks();

      expect(Pool).toHaveBeenCalledWith(expect.objectContaining({ ssl: undefined }));
    });

    it('logs a warning (does not throw) when the initial SELECT 1 check fails', async () => {
      mockQuery.mockRejectedValueOnce(new Error('connection refused'));
      const service = new DatabaseService(makeConfig('postgres://user:pass@host:5432/db'));

      expect(() => service.onModuleInit()).not.toThrow();
      await flushMicrotasks();

      expect(service.connected).toBe(true);
    });
  });

  describe('connected', () => {
    it('is false before onModuleInit is called', () => {
      const service = new DatabaseService(makeConfig('postgres://user:pass@host:5432/db'));
      expect(service.connected).toBe(false);
    });
  });

  describe('query / queryOne', () => {
    it('throws when the pool is not configured', async () => {
      const service = new DatabaseService(makeConfig(undefined));
      service.onModuleInit();

      await expect(service.query('SELECT 1')).rejects.toThrow('Database not configured');
    });

    it('returns rows from the pool for query()', async () => {
      const service = new DatabaseService(makeConfig('postgres://user:pass@host:5432/db'));
      service.onModuleInit();
      await flushMicrotasks();
      mockQuery.mockResolvedValueOnce({ rows: [{ id: 1 }, { id: 2 }] });

      const rows = await service.query('SELECT * FROM t');

      expect(rows).toEqual([{ id: 1 }, { id: 2 }]);
    });

    it('passes query params through to the underlying pool', async () => {
      const service = new DatabaseService(makeConfig('postgres://user:pass@host:5432/db'));
      service.onModuleInit();
      await flushMicrotasks();
      mockQuery.mockResolvedValueOnce({ rows: [] });

      await service.query('SELECT * FROM t WHERE id = $1', [42]);

      expect(mockQuery).toHaveBeenLastCalledWith('SELECT * FROM t WHERE id = $1', [42]);
    });

    it('queryOne returns the first row when present', async () => {
      const service = new DatabaseService(makeConfig('postgres://user:pass@host:5432/db'));
      service.onModuleInit();
      await flushMicrotasks();
      mockQuery.mockResolvedValueOnce({ rows: [{ id: 1 }, { id: 2 }] });

      const row = await service.queryOne('SELECT * FROM t');

      expect(row).toEqual({ id: 1 });
    });

    it('queryOne returns null when there are no rows', async () => {
      const service = new DatabaseService(makeConfig('postgres://user:pass@host:5432/db'));
      service.onModuleInit();
      await flushMicrotasks();
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const row = await service.queryOne('SELECT * FROM t WHERE 1=0');

      expect(row).toBeNull();
    });
  });

  describe('onModuleDestroy', () => {
    it('ends the pool when one was created', async () => {
      const service = new DatabaseService(makeConfig('postgres://user:pass@host:5432/db'));
      service.onModuleInit();
      await flushMicrotasks();

      await service.onModuleDestroy();

      expect(mockEnd).toHaveBeenCalled();
    });

    it('does nothing when no pool was ever created', async () => {
      const service = new DatabaseService(makeConfig(undefined));
      service.onModuleInit();

      await expect(service.onModuleDestroy()).resolves.toBeUndefined();
      expect(mockEnd).not.toHaveBeenCalled();
    });
  });
});

/** Lets pending .then()/.catch() microtask chains (e.g. the SELECT 1 check) settle. */
function flushMicrotasks() {
  return new Promise((resolve) => setImmediate(resolve));
}
