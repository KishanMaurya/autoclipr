import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { BulkDownloadDto } from './bulk-download.dto';

const uuid = (n: number) => `123e4567-e89b-42d3-a456-42661417400${n}`;

describe('BulkDownloadDto', () => {
  it('passes validation with a single valid UUID', async () => {
    const dto = plainToInstance(BulkDownloadDto, { clip_ids: [uuid(0)] });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('fails validation with an empty array', async () => {
    const dto = plainToInstance(BulkDownloadDto, { clip_ids: [] });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'clip_ids')).toBe(true);
  });

  it('fails validation with more than 50 UUIDs', async () => {
    const ids = Array.from({ length: 51 }, (_, i) => `123e4567-e89b-42d3-a456-4266141740${String(i % 100).padStart(2, '0')}`);
    const dto = plainToInstance(BulkDownloadDto, { clip_ids: ids });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'clip_ids')).toBe(true);
  });

  it('fails validation when an entry is not a UUID', async () => {
    const dto = plainToInstance(BulkDownloadDto, { clip_ids: ['nope'] });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'clip_ids')).toBe(true);
  });

  it('fails validation when clip_ids is missing', async () => {
    const dto = plainToInstance(BulkDownloadDto, {});
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'clip_ids')).toBe(true);
  });
});
