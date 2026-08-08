import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { GenerateClipsDto } from './generate-clips.dto';

const validBase = { video_id: '123e4567-e89b-42d3-a456-426614174000' };

describe('GenerateClipsDto', () => {
  it('passes validation with only the required video_id', async () => {
    const dto = plainToInstance(GenerateClipsDto, validBase);
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('passes validation with every optional field populated validly', async () => {
    const dto = plainToInstance(GenerateClipsDto, {
      ...validBase,
      clip_count: 5,
      aspect_ratio: '9:16',
      with_subtitles: true,
      durations: [15, 30, 45],
      caption_style: 'karaoke',
      caption_language: 'es',
      platforms: ['youtube'],
      export_quality: '4k',
    });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('fails validation when video_id is missing', async () => {
    const dto = plainToInstance(GenerateClipsDto, {});
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'video_id')).toBe(true);
  });

  it('fails validation when video_id is not a UUID', async () => {
    const dto = plainToInstance(GenerateClipsDto, { video_id: 'nope' });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'video_id')).toBe(true);
  });

  it.each([0, 21])('fails validation when clip_count is out of range (%i)', async (clipCount) => {
    const dto = plainToInstance(GenerateClipsDto, { ...validBase, clip_count: clipCount });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'clip_count')).toBe(true);
  });

  it('fails validation when with_subtitles is not a boolean', async () => {
    const dto = plainToInstance(GenerateClipsDto, { ...validBase, with_subtitles: 'yes' });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'with_subtitles')).toBe(true);
  });

  it('fails validation when durations contains non-integers', async () => {
    const dto = plainToInstance(GenerateClipsDto, { ...validBase, durations: ['x'] });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'durations')).toBe(true);
  });

  it('fails validation when caption_style is not an allowed value', async () => {
    const dto = plainToInstance(GenerateClipsDto, { ...validBase, caption_style: 'bogus' });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'caption_style')).toBe(true);
  });

  it('fails validation when caption_language is not an allowed value', async () => {
    const dto = plainToInstance(GenerateClipsDto, { ...validBase, caption_language: 'zz' });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'caption_language')).toBe(true);
  });

  it('fails validation when platforms contains non-strings', async () => {
    const dto = plainToInstance(GenerateClipsDto, { ...validBase, platforms: [1] });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'platforms')).toBe(true);
  });

  it('fails validation when export_quality is not an allowed value', async () => {
    const dto = plainToInstance(GenerateClipsDto, { ...validBase, export_quality: 'ultra' });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'export_quality')).toBe(true);
  });
});
