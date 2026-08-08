import { parsePagination } from './pagination';

describe('parsePagination', () => {
  it('defaults to page 1 and limit 20 when no arguments are given', () => {
    expect(parsePagination()).toEqual({ page: 1, limit: 20, offset: 0 });
  });

  it('computes offset from page and limit', () => {
    expect(parsePagination(3, 10)).toEqual({ page: 3, limit: 10, offset: 20 });
  });

  it('clamps page below 1 up to 1', () => {
    expect(parsePagination(0, 10)).toEqual({ page: 1, limit: 10, offset: 0 });
    expect(parsePagination(-5, 10)).toEqual({ page: 1, limit: 10, offset: 0 });
  });

  it('clamps limit below 1 up to 1', () => {
    expect(parsePagination(1, 0)).toEqual({ page: 1, limit: 1, offset: 0 });
    expect(parsePagination(1, -5)).toEqual({ page: 1, limit: 1, offset: 0 });
  });

  it('clamps limit above 100 down to 100', () => {
    expect(parsePagination(1, 500)).toEqual({ page: 1, limit: 100, offset: 0 });
  });

  it('passes through a limit exactly at the boundaries (1 and 100) unchanged', () => {
    expect(parsePagination(1, 1)).toEqual({ page: 1, limit: 1, offset: 0 });
    expect(parsePagination(1, 100)).toEqual({ page: 1, limit: 100, offset: 0 });
  });
});
