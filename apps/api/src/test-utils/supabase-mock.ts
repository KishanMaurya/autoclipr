/**
 * Reusable chainable Supabase query-builder mock for repository unit tests.
 *
 * Usage:
 *   const client = createSupabaseMock({ data: [...], error: null });
 *   const supabase = { getClient: () => client } as unknown as SupabaseAdminService;
 *
 * Every query-builder method (from/select/eq/neq/in/order/range/limit/...)
 * returns the same chainable object (`this`), so any call chain "resolves"
 * once awaited to the configured terminal result. Because the mock is a
 * thenable, `await builder.from(...).select(...).eq(...)` resolves directly
 * without requiring a `.single()`/`.maybeSingle()` call, matching how the
 * Supabase JS client behaves.
 */
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
export function createSupabaseMock(initialResult: SupabaseMockResult = { data: null, error: null }): ChainableMock {
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
  chain.then = (onfulfilled, onrejected) =>
    Promise.resolve(result).then(onfulfilled, onrejected);

  chain.__setResult = (next: SupabaseMockResult) => {
    result = next;
    return chain;
  };

  return chain;
}
