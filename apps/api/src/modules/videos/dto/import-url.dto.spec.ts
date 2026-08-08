import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { ImportUrlDto } from './import-url.dto';

const validBase = { url: 'https://www.youtube.com/watch?v=abc123' };

describe('ImportUrlDto', () => {
  it('passes validation with only the required url field', async () => {
    const dto = plainToInstance(ImportUrlDto, validBase);
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('passes validation with every optional field populated validly', async () => {
    const dto = plainToInstance(ImportUrlDto, {
      ...validBase,
      title: 'My video',
      clip_count: 10,
      durations: [15, 30],
      caption_style: 'viral',
      caption_language: 'en',
      platforms: ['tiktok', 'instagram'],
      export_quality: 'hd',
      auto_publish: true,
    });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('fails validation when url is missing', async () => {
    const dto = plainToInstance(ImportUrlDto, {});
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'url')).toBe(true);
  });

  it('fails validation when url is not a valid URL', async () => {
    const dto = plainToInstance(ImportUrlDto, { url: 'not-a-url' });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'url')).toBe(true);
  });

  it.each([4, 21])('fails validation when clip_count is out of range (%i)', async (clipCount) => {
    const dto = plainToInstance(ImportUrlDto, { ...validBase, clip_count: clipCount });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'clip_count')).toBe(true);
  });

  it.each([5, 20])('passes validation when clip_count is at the boundary (%i)', async (clipCount) => {
    const dto = plainToInstance(ImportUrlDto, { ...validBase, clip_count: clipCount });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('fails validation when durations contains non-integers', async () => {
    const dto = plainToInstance(ImportUrlDto, { ...validBase, durations: ['a', 'b'] });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'durations')).toBe(true);
  });

  it('fails validation when caption_style is not an allowed value', async () => {
    const dto = plainToInstance(ImportUrlDto, { ...validBase, caption_style: 'bogus' });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'caption_style')).toBe(true);
  });

  it('fails validation when caption_language is not an allowed value', async () => {
    const dto = plainToInstance(ImportUrlDto, { ...validBase, caption_language: 'zz' });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'caption_language')).toBe(true);
  });

  it('fails validation when platforms contains non-strings', async () => {
    const dto = plainToInstance(ImportUrlDto, { ...validBase, platforms: [1, 2] });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'platforms')).toBe(true);
  });

  it('fails validation when export_quality is not an allowed value', async () => {
    const dto = plainToInstance(ImportUrlDto, { ...validBase, export_quality: 'ultra' });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'export_quality')).toBe(true);
  });
});
