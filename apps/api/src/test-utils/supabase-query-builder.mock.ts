/**
 * Reusable mock helpers for Supabase's chainable query builder
 * (`from().select().eq()...`) used throughout repository classes.
 *
 * A "query builder" mock is a chainable object where every query method
 * (select/insert/update/upsert/delete/eq/order/...) returns `this`, and the
 * object itself is thenable, resolving to the given `{ data, error, count }`
 * result — mirroring how the real supabase-js `PostgrestFilterBuilder` works
 * (it can be awaited directly, or terminated with `.single()`/`.maybeSingle()`).
 */

export interface SupabaseResult<T = unknown> {
  data?: T;
  error?: { message: string } | null;
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
  'in',
  'order',
  'limit',
  'range',
  'match',
  'gte',
  'lte',
  'ilike',
  'single',
  'maybeSingle',
] as const;

export type QueryBuilderMock = {
  [K in (typeof CHAIN_METHODS)[number]]: jest.Mock;
} & {
  then: (
    onfulfilled?: ((value: SupabaseResult) => unknown) | null,
    onrejected?: ((reason: unknown) => unknown) | null,
  ) => Promise<unknown>;
  catch: (onrejected?: ((reason: unknown) => unknown) | null) => Promise<unknown>;
};

/** Creates a chainable query-builder mock that resolves to `result`. */
export function createQueryBuilderMock(result: SupabaseResult = { data: null, error: null }): QueryBuilderMock {
  const builder = {} as QueryBuilderMock;

  for (const method of CHAIN_METHODS) {
    (builder[method] as jest.Mock) = jest.fn(() => builder);
  }

  builder.then = (onfulfilled, onrejected) => Promise.resolve(result).then(onfulfilled, onrejected);
  builder.catch = (onrejected) => Promise.resolve(result).catch(onrejected);

  return builder;
}

/** Creates a mock Supabase client whose `.from()` calls are driven by `fromImpl`. */
export function createSupabaseClientMock(fromImpl: (table: string) => QueryBuilderMock) {
  return { from: jest.fn(fromImpl) };
}

/** Creates a mock SupabaseAdminService (or a plain stand-in with the same shape). */
export function createSupabaseAdminServiceMock(client: { from: jest.Mock }) {
  return {
    getClient: jest.fn(() => client),
    isConfigured: true,
  };
}
