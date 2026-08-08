import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { SyncProfileDto } from './sync-profile.dto';

describe('SyncProfileDto', () => {
  it('is valid when no fields are provided (all optional)', async () => {
    const dto = plainToInstance(SyncProfileDto, {});
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('is valid when all fields are strings', async () => {
    const dto = plainToInstance(SyncProfileDto, {
      full_name: 'Jane Doe',
      avatar_url: 'https://example.com/avatar.png',
      phone: '+1234567890',
    });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it.each([
    ['full_name', 123],
    ['avatar_url', 123],
    ['phone', 123],
  ])('rejects a non-string %s', async (field, value) => {
    const dto = plainToInstance(SyncProfileDto, { [field]: value });
    const errors = await validate(dto);
    expect(errors).toHaveLength(1);
    expect(errors[0].property).toBe(field);
    expect(errors[0].constraints).toHaveProperty('isString');
  });

  it('allows an empty string for every field', async () => {
    const dto = plainToInstance(SyncProfileDto, {
      full_name: '',
      avatar_url: '',
      phone: '',
    });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });
});
