/**
 * Reusable Supabase mocking helpers shared across repository/service spec files.
 *
 * Three complementary builder styles live here because different spec files
 * across the suite were written against each — all fabricate a chainable +
 * thenable object mimicking the Supabase query builder (`.select().eq()...`),
 * so `await` resolves correctly whether or not the caller terminates the
 * chain with `.single()` / `.maybeSingle()`.
 *  - `mockQueryBuilder` / `createMockSupabaseClient` / `mockSupabaseAdminService`
 *  - `createQueryBuilderMock` / `createSupabaseAdminServiceMock`
 *  - `createSupabaseMock`
 */

export interface QueryResult<T = any> {
  data?: T | null;
  error?: any;
  count?: number | null;
}

export interface SupabaseResult<T = any> {
  data: T | null;
  error: { message: string; [key: string]: unknown } | null;
}

const QUERY_BUILDER_CHAIN_METHODS = [
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
  for (const method of QUERY_BUILDER_CHAIN_METHODS) {
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

export type SupabaseQueryBuilderMock = {
  from: jest.Mock;
  select: jest.Mock;
  insert: jest.Mock;
  update: jest.Mock;
  upsert: jest.Mock;
  delete: jest.Mock;
  eq: jest.Mock;
  order: jest.Mock;
  limit: jest.Mock;
  single: jest.Mock;
  maybeSingle: jest.Mock;
  then: (resolve: (value: any) => any, reject?: (err: any) => any) => Promise<any>;
  /** Change the result this builder resolves to (e.g. after building it once and reusing it). */
  __setResult: (result: SupabaseResult) => void;
};

const SUPABASE_ADMIN_CHAIN_METHODS = [
  'from',
  'select',
  'insert',
  'update',
  'upsert',
  'delete',
  'eq',
  'order',
  'limit',
] as const;

/**
 * Builds a chainable + thenable mock of the Supabase query builder that resolves
 * to `result` however the caller terminates the chain (implicit await, `.single()`,
 * or `.maybeSingle()`).
 */
export function createQueryBuilderMock(
  result: SupabaseResult = { data: null, error: null },
): SupabaseQueryBuilderMock {
  let current = result;

  const builder = {} as SupabaseQueryBuilderMock;

  for (const method of SUPABASE_ADMIN_CHAIN_METHODS) {
    (builder as any)[method] = jest.fn(() => builder);
  }

  builder.single = jest.fn(() => Promise.resolve(current));
  builder.maybeSingle = jest.fn(() => Promise.resolve(current));
  builder.then = (resolve: (value: any) => any, reject?: (err: any) => any) =>
    Promise.resolve(current).then(resolve, reject);
  builder.__setResult = (next: SupabaseResult) => {
    current = next;
  };

  return builder;
}

/** Minimal mock of SupabaseAdminService — `getClient()` returns whatever builder(s) you configure. */
export function createSupabaseAdminServiceMock(defaultBuilder?: SupabaseQueryBuilderMock) {
  const client: any = {
    from: jest.fn(() => defaultBuilder ?? createQueryBuilderMock()),
    // Postgres functions called via supabase.rpc(name, args) — e.g. the atomic
    // credit deduct/refund helpers. Resolves { data, error } like the real client.
    rpc: jest.fn().mockResolvedValue({ data: null, error: null }),
    auth: {
      admin: {
        deleteUser: jest.fn().mockResolvedValue({ error: null }),
        updateUserById: jest.fn().mockResolvedValue({ error: null }),
      },
    },
  };

  return {
    getClient: jest.fn(() => client),
    isConfigured: true,
    __client: client,
  };
}

export interface SupabaseMockResult<T = unknown> {
  data: T;
  error: { message: string; code?: string } | null;
  count?: number | null;
}

export type ChainableMock = {
  from: jest.Mock;
  select: jest.Mock;
  insert: jest.Mock;
  update: jest.Mock;
  upsert: jest.Mock;
  delete: jest.Mock;
  eq: jest.Mock;
  neq: jest.Mock;
  in: jest.Mock;
  order: jest.Mock;
  range: jest.Mock;
  limit: jest.Mock;
  single: jest.Mock;
  maybeSingle: jest.Mock;
  then: (
    onfulfilled?: (value: SupabaseMockResult) => unknown,
    onrejected?: (reason: unknown) => unknown,
  ) => Promise<unknown>;
  __setResult: (result: SupabaseMockResult) => ChainableMock;
};

/**
 * Creates a chainable mock mimicking the Supabase query builder.
 * Every chained method returns `this`; the terminal awaited value is the
 * provided `result` (or whatever is later configured via `__setResult`).
 */
export function createSupabaseMock(
  initialResult: SupabaseMockResult = { data: null, error: null },
): ChainableMock {
  let result: SupabaseMockResult = initialResult;

  const chain = {} as ChainableMock;

  const chainMethods = [
    'from',
    'select',
    'insert',
    'update',
    'upsert',
    'delete',
    'eq',
    'neq',
    'in',
    'order',
    'range',
    'limit',
  ] as const;

  for (const method of chainMethods) {
    chain[method] = jest.fn().mockReturnValue(chain);
  }

  chain.single = jest.fn().mockImplementation(() => Promise.resolve(result));
  chain.maybeSingle = jest.fn().mockImplementation(() => Promise.resolve(result));

  // Makes the chain itself awaitable, e.g. `await client.from(...).select(...).eq(...)`.
  chain.then = (onfulfilled, onrejected) => Promise.resolve(result).then(onfulfilled, onrejected);

  chain.__setResult = (next: SupabaseMockResult) => {
    result = next;
    return chain;
  };

  return chain;
}
