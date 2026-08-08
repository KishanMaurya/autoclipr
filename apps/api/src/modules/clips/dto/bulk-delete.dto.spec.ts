import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { BulkDeleteDto } from './bulk-delete.dto';

const uuid = (n: number) => `123e4567-e89b-42d3-a456-42661417400${n}`;

describe('BulkDeleteDto', () => {
  it('passes validation with a single valid UUID', async () => {
    const dto = plainToInstance(BulkDeleteDto, { clip_ids: [uuid(0)] });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('passes validation with 50 valid UUIDs (upper bound)', async () => {
    const ids = Array.from({ length: 50 }, (_, i) => `123e4567-e89b-42d3-a456-4266141740${String(i).padStart(2, '0')}`);
    const dto = plainToInstance(BulkDeleteDto, { clip_ids: ids });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('fails validation with an empty array', async () => {
    const dto = plainToInstance(BulkDeleteDto, { clip_ids: [] });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'clip_ids')).toBe(true);
  });

  it('fails validation with more than 50 UUIDs', async () => {
    const ids = Array.from({ length: 51 }, (_, i) => `123e4567-e89b-42d3-a456-4266141740${String(i % 100).padStart(2, '0')}`);
    const dto = plainToInstance(BulkDeleteDto, { clip_ids: ids });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'clip_ids')).toBe(true);
  });

  it('fails validation when an entry is not a UUID', async () => {
    const dto = plainToInstance(BulkDeleteDto, { clip_ids: ['not-a-uuid'] });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'clip_ids')).toBe(true);
  });

  it('fails validation when clip_ids is missing', async () => {
    const dto = plainToInstance(BulkDeleteDto, {});
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'clip_ids')).toBe(true);
  });
});
