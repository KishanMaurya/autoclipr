import { sanitizeForLog, formatForLog, formatJsonForLog } from './log-sanitize.util';

describe('sanitizeForLog', () => {
  it('passes through null and undefined unchanged', () => {
    expect(sanitizeForLog(null)).toBeNull();
    expect(sanitizeForLog(undefined)).toBeUndefined();
  });

  it('passes through ordinary short strings unchanged', () => {
    expect(sanitizeForLog('hello world')).toBe('hello world');
  });

  it('redacts strings that look like an OpenAI-style secret key', () => {
    expect(sanitizeForLog('sk-abcdefgh12345678')).toBe('[REDACTED_KEY]');
  });

  it('does not redact a string that merely contains "sk-" but is too short to match', () => {
    expect(sanitizeForLog('sk-short')).toBe('sk-short');
  });

  it('leaves a 2000-char string untouched (boundary) but truncates 2001 chars', () => {
    const exact = 'a'.repeat(2000);
    const over = 'a'.repeat(2001);

    expect(sanitizeForLog(exact)).toBe(exact);
    expect(sanitizeForLog(over)).toBe(`${'a'.repeat(2000)}…[truncated]`);
  });

  it('passes through numbers and booleans unchanged', () => {
    expect(sanitizeForLog(42)).toBe(42);
    expect(sanitizeForLog(0)).toBe(0);
    expect(sanitizeForLog(true)).toBe(true);
    expect(sanitizeForLog(false)).toBe(false);
  });

  it('truncates arrays to the first 30 items and sanitizes each element', () => {
    const input = Array.from({ length: 35 }, (_, i) => i);
    const result = sanitizeForLog(input) as number[];

    expect(result).toHaveLength(30);
    expect(result).toEqual(Array.from({ length: 30 }, (_, i) => i));
  });

  it('recursively sanitizes elements within an array', () => {
    const result = sanitizeForLog(['sk-abcdefgh12345678', 'plain']);
    expect(result).toEqual(['[REDACTED_KEY]', 'plain']);
  });

  it('redacts object keys that look sensitive, case-insensitively', () => {
    const input = {
      password: 'hunter2',
      Token: 'abc',
      SECRET: 'xyz',
      Authorization: 'Bearer abc',
      apiKey: 'k1',
      api_key: 'k2',
      'api-key': 'k3',
      credit_card: '4111111111111111',
      service_role: 'srk',
      'service-role': 'srk2',
      containsSkDash: 'sk-something',
      normal: 'value',
    };

    const result = sanitizeForLog(input) as Record<string, unknown>;

    expect(result.password).toBe('[REDACTED]');
    expect(result.Token).toBe('[REDACTED]');
    expect(result.SECRET).toBe('[REDACTED]');
    expect(result.Authorization).toBe('[REDACTED]');
    expect(result.apiKey).toBe('[REDACTED]');
    expect(result.api_key).toBe('[REDACTED]');
    expect(result['api-key']).toBe('[REDACTED]');
    expect(result.credit_card).toBe('[REDACTED]');
    expect(result.service_role).toBe('[REDACTED]');
    expect(result['service-role']).toBe('[REDACTED]');
    // The key itself doesn't match SENSITIVE_KEY, but the value looks like a
    // secret key, so it gets redacted at the value level instead.
    expect(result.containsSkDash).toBe('[REDACTED_KEY]');
    expect(result.normal).toBe('value');
  });

  it('redacts a key that literally contains "sk-" at the key level', () => {
    const result = sanitizeForLog({ 'my-sk-thing': 'harmless value' }) as Record<string, unknown>;
    expect(result['my-sk-thing']).toBe('[REDACTED]');
  });

  it('recursively sanitizes nested object values', () => {
    const input = { user: { password: 'secret1', name: 'Alice' } };
    const result = sanitizeForLog(input) as any;

    expect(result.user.password).toBe('[REDACTED]');
    expect(result.user.name).toBe('Alice');
  });

  it('caps recursion depth and replaces deeply nested values with "[nested]"', () => {
    const deep = { a: { b: { c: { d: { e: { f: { g: 'too deep' } } } } } } };
    const result = sanitizeForLog(deep) as any;

    // depth: deep=0, a=1, b=2, c=3, d=4, e=5, f=6 -> f's value replaced at depth>5
    expect(result.a.b.c.d.e.f).toBe('[nested]');
  });

  it('converts unrecognized primitive types (e.g. functions) via String()', () => {
    const fn = function namedFn() {};
    expect(sanitizeForLog(fn)).toBe(String(fn));
  });

  it('stringifies bigint values', () => {
    expect(sanitizeForLog(BigInt(10))).toBe('10');
  });
});

describe('formatForLog', () => {
  it('produces a compact JSON string (delegates to formatJsonForLog with pretty:false)', () => {
    expect(formatForLog({ a: 1, b: 'x' })).toBe('{"a":1,"b":"x"}');
  });

  it('returns an empty string for undefined', () => {
    expect(formatForLog(undefined)).toBe('');
  });
});

describe('formatJsonForLog', () => {
  it('returns an empty string when value is undefined', () => {
    expect(formatJsonForLog(undefined)).toBe('');
  });

  it('pretty-prints with 2-space indentation by default', () => {
    const result = formatJsonForLog({ a: 1 });
    expect(result).toBe(JSON.stringify({ a: 1 }, null, 2));
  });

  it('produces compact JSON when pretty:false is passed', () => {
    const result = formatJsonForLog({ a: 1 }, { pretty: false });
    expect(result).toBe(JSON.stringify({ a: 1 }));
  });

  it('sanitizes sensitive fields before serializing', () => {
    const result = formatJsonForLog({ password: 'hunter2' }, { pretty: false });
    expect(result).toBe('{"password":"[REDACTED]"}');
  });

  it('truncates pretty output longer than 12000 characters', () => {
    const bigObject: Record<string, string> = {};
    for (let i = 0; i < 400; i++) {
      bigObject[`key_${i}`] = 'x'.repeat(40);
    }
    const result = formatJsonForLog(bigObject, { pretty: true });

    expect(result.length).toBe(12001);
    expect(result.endsWith('…')).toBe(true);
  });

  it('truncates compact output longer than 2000 characters', () => {
    const bigObject: Record<string, string> = {};
    for (let i = 0; i < 100; i++) {
      bigObject[`key_${i}`] = 'x'.repeat(40);
    }
    const result = formatJsonForLog(bigObject, { pretty: false });

    expect(result.length).toBe(2001);
    expect(result.endsWith('…')).toBe(true);
  });

  it('falls back to String(value) when JSON.stringify throws', () => {
    const stringifySpy = jest.spyOn(JSON, 'stringify').mockImplementationOnce(() => {
      throw new Error('circular structure');
    });

    const value = { a: 1 };
    const result = formatJsonForLog(value);

    expect(result).toBe(String(value));
    stringifySpy.mockRestore();
  });
});
