import { ApiResponse } from './api-response';

describe('ApiResponse', () => {
  describe('ok', () => {
    it('wraps data in a success envelope without meta when omitted', () => {
      const result = ApiResponse.ok({ id: 1 });
      expect(result).toEqual({ success: true, data: { id: 1 }, meta: undefined });
    });

    it('includes meta when provided', () => {
      const result = ApiResponse.ok([1, 2, 3], { total: 3 });
      expect(result).toEqual({
        success: true,
        data: [1, 2, 3],
        meta: { total: 3 },
      });
    });

    it('preserves falsy but defined data values (e.g. 0, empty string, null)', () => {
      expect(ApiResponse.ok(0)).toEqual({ success: true, data: 0, meta: undefined });
      expect(ApiResponse.ok('')).toEqual({ success: true, data: '', meta: undefined });
      expect(ApiResponse.ok(null)).toEqual({ success: true, data: null, meta: undefined });
    });
  });

  describe('fail', () => {
    it('builds a failure envelope with the given code and message', () => {
      const result = ApiResponse.fail('NOT_FOUND', 'Resource not found');
      expect(result).toEqual({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Resource not found' },
      });
    });

    it('does not set a data or meta key on failure', () => {
      const result = ApiResponse.fail('BAD_REQUEST', 'Invalid input');
      expect(result.data).toBeUndefined();
      expect(result.meta).toBeUndefined();
    });
  });
});
