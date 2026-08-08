import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { UpdateProfileDto } from './update-profile.dto';

describe('UpdateProfileDto', () => {
  it('is valid when no fields are provided (all optional)', async () => {
    const dto = plainToInstance(UpdateProfileDto, {});
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('is valid with a fully populated, well-formed payload', async () => {
    const dto = plainToInstance(UpdateProfileDto, {
      full_name: 'Jane Doe',
      email: 'jane@example.com',
      avatar_url: 'https://example.com/avatar.png',
      email_notifications_enabled: true,
    });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('rejects a full_name shorter than 2 characters', async () => {
    const dto = plainToInstance(UpdateProfileDto, { full_name: 'A' });
    const errors = await validate(dto);
    expect(errors.map((e) => e.property)).toContain('full_name');
    expect(errors[0].constraints).toHaveProperty('minLength');
  });

  it('accepts a full_name at exactly the 2 character minimum', async () => {
    const dto = plainToInstance(UpdateProfileDto, { full_name: 'Al' });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('rejects an invalid email', async () => {
    const dto = plainToInstance(UpdateProfileDto, { email: 'not-an-email' });
    const errors = await validate(dto);
    expect(errors.map((e) => e.property)).toContain('email');
    expect(errors[0].constraints).toHaveProperty('isEmail');
  });

  it('rejects a non-string avatar_url', async () => {
    const dto = plainToInstance(UpdateProfileDto, { avatar_url: 42 });
    const errors = await validate(dto);
    expect(errors.map((e) => e.property)).toContain('avatar_url');
  });

  it('allows an empty avatar_url (used to clear the avatar)', async () => {
    const dto = plainToInstance(UpdateProfileDto, { avatar_url: '' });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('rejects a non-boolean email_notifications_enabled', async () => {
    const dto = plainToInstance(UpdateProfileDto, { email_notifications_enabled: 'yes' });
    const errors = await validate(dto);
    expect(errors.map((e) => e.property)).toContain('email_notifications_enabled');
    expect(errors[0].constraints).toHaveProperty('isBoolean');
  });

  it('accepts email_notifications_enabled=false', async () => {
    const dto = plainToInstance(UpdateProfileDto, { email_notifications_enabled: false });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });
});
