/**
 * Reusable Supabase mocking helpers shared across repository/service spec files.
 *
 * `mockQueryBuilder` fabricates a chainable object that mimics the Supabase
 * query builder (`.select().eq().order()...`). Every chain method returns the
 * builder itself so arbitrarily long chains work, and the builder is also
 * "thenable" so `await this.db.from('t').select(...)` resolves correctly even
 * when the code under test never calls a terminal method like `.single()`.
 */

export interface QueryResult<T = any> {
  data?: T | null;
  error?: any;
  count?: number | null;
}

const CHAIN_METHODS = [
  'select',
  'insert',
  'update',
  'upsert',
  'delete',
  'eq',
  'neq',
  'gt',
  'gte',
  'lt',
  'lte',
  'like',
  'ilike',
  'is',
  'in',
  'not',
  'or',
  'order',
  'limit',
  'range',
  'match',
  'filter',
  'contains',
] as const;

export function mockQueryBuilder<T = any>(result: QueryResult<T> = { data: null, error: null }) {
  const builder: any = {
    single: jest.fn().mockResolvedValue(result),
    maybeSingle: jest.fn().mockResolvedValue(result),
  };
  for (const method of CHAIN_METHODS) {
    builder[method] = jest.fn(() => builder);
  }
  // Thenable: lets `await` resolve the chain even without a terminal call.
  builder.then = (onFulfilled?: any, onRejected?: any) =>
    Promise.resolve(result).then(onFulfilled, onRejected);
  builder.catch = (onRejected?: any) => Promise.resolve(result).catch(onRejected);
  return builder;
}

export function mockStorageBucket(overrides: Record<string, jest.Mock> = {}) {
  return {
    upload: jest.fn().mockResolvedValue({ data: null, error: null }),
    createSignedUrl: jest.fn().mockResolvedValue({ data: null, error: null }),
    createSignedUploadUrl: jest.fn().mockResolvedValue({ data: null, error: null }),
    remove: jest.fn().mockResolvedValue({ data: null, error: null }),
    list: jest.fn().mockResolvedValue({ data: null, error: null }),
    ...overrides,
  };
}

export function createMockSupabaseClient() {
  const client: any = {
    from: jest.fn(),
    rpc: jest.fn().mockResolvedValue({ data: null, error: null }),
    storage: {
      from: jest.fn(),
    },
  };
  return client;
}

export function mockSupabaseAdminService(client = createMockSupabaseClient()) {
  return {
    getClient: jest.fn().mockReturnValue(client),
    isConfigured: true,
  };
}
