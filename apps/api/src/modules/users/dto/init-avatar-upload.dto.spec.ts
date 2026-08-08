import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { InitAvatarUploadDto } from './init-avatar-upload.dto';

const VALID = { filename: 'avatar.png', mime_type: 'image/png', size: 1024 };

describe('InitAvatarUploadDto', () => {
  it('is valid with a well-formed payload', async () => {
    const dto = plainToInstance(InitAvatarUploadDto, VALID);
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('rejects a missing filename', async () => {
    const dto = plainToInstance(InitAvatarUploadDto, { ...VALID, filename: undefined });
    const errors = await validate(dto);
    expect(errors.map((e) => e.property)).toContain('filename');
  });

  it('rejects a non-string mime_type', async () => {
    const dto = plainToInstance(InitAvatarUploadDto, { ...VALID, mime_type: 42 });
    const errors = await validate(dto);
    expect(errors.map((e) => e.property)).toContain('mime_type');
  });

  it('rejects a non-integer size', async () => {
    const dto = plainToInstance(InitAvatarUploadDto, { ...VALID, size: 1.5 });
    const errors = await validate(dto);
    expect(errors.map((e) => e.property)).toContain('size');
    expect(errors[0].constraints).toHaveProperty('isInt');
  });

  it('rejects size below the minimum of 1', async () => {
    const dto = plainToInstance(InitAvatarUploadDto, { ...VALID, size: 0 });
    const errors = await validate(dto);
    expect(errors.map((e) => e.property)).toContain('size');
    expect(errors[0].constraints).toHaveProperty('min');
  });

  it('rejects size above the 2 MB maximum', async () => {
    const dto = plainToInstance(InitAvatarUploadDto, { ...VALID, size: 2 * 1024 * 1024 + 1 });
    const errors = await validate(dto);
    expect(errors.map((e) => e.property)).toContain('size');
    expect(errors[0].constraints).toHaveProperty('max');
  });

  it('accepts size at exactly the 2 MB boundary', async () => {
    const dto = plainToInstance(InitAvatarUploadDto, { ...VALID, size: 2 * 1024 * 1024 });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('accepts size at exactly the minimum boundary of 1', async () => {
    const dto = plainToInstance(InitAvatarUploadDto, { ...VALID, size: 1 });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });
});
