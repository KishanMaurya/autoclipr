/**
 * Reusable mock helpers for tests that talk to Supabase through SupabaseAdminService.
 *
 * Supabase's query builder (`.from().select().eq()...`) is chainable AND thenable:
 * every intermediate call returns the same builder object, and the builder itself
 * can be awaited directly (without a terminal `.single()`/`.maybeSingle()`) because
 * it implements `PromiseLike<{ data, error }>`.
 *
 * `createQueryBuilderMock` reproduces that shape so production code can be exercised
 * unmodified, regardless of how long the chain is or whether the caller awaits the
 * builder directly or terminates with `.single()` / `.maybeSingle()`.
 */

export interface SupabaseResult<T = any> {
  data: T | null;
  error: { message: string; [key: string]: unknown } | null;
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

const CHAIN_METHODS = ['from', 'select', 'insert', 'update', 'upsert', 'delete', 'eq', 'order', 'limit'] as const;

/**
 * Builds a chainable + thenable mock of the Supabase query builder that resolves
 * to `result` however the caller terminates the chain (implicit await, `.single()`,
 * or `.maybeSingle()`).
 */
export function createQueryBuilderMock(result: SupabaseResult = { data: null, error: null }): SupabaseQueryBuilderMock {
  let current = result;

  const builder = {} as SupabaseQueryBuilderMock;

  for (const method of CHAIN_METHODS) {
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
