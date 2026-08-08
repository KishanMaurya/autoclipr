import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { InitUploadDto } from './init-upload.dto';

describe('InitUploadDto', () => {
  it('passes validation with only required fields', async () => {
    const dto = plainToInstance(InitUploadDto, { title: 'My video', filename: 'video.mp4' });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('passes validation with all fields populated', async () => {
    const dto = plainToInstance(InitUploadDto, {
      title: 'My video',
      filename: 'video.mp4',
      mime_type: 'video/mp4',
      size: 1024,
    });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('fails validation when title is missing', async () => {
    const dto = plainToInstance(InitUploadDto, { filename: 'video.mp4' });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'title')).toBe(true);
  });

  it('fails validation when filename is missing', async () => {
    const dto = plainToInstance(InitUploadDto, { title: 'My video' });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'filename')).toBe(true);
  });

  it('fails validation when size is negative', async () => {
    const dto = plainToInstance(InitUploadDto, {
      title: 'My video',
      filename: 'video.mp4',
      size: -1,
    });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'size')).toBe(true);
  });

  it('fails validation when size is not an integer', async () => {
    const dto = plainToInstance(InitUploadDto, {
      title: 'My video',
      filename: 'video.mp4',
      size: 'not-a-number',
    });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'size')).toBe(true);
  });
});
