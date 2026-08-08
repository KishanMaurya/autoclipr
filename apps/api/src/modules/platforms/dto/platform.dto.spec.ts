import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { ConnectPlatformDto, PublishClipDto, SUPPORTED_PLATFORMS } from './platform.dto';

describe('SUPPORTED_PLATFORMS', () => {
  it('lists exactly the four supported platform ids', () => {
    expect(SUPPORTED_PLATFORMS).toEqual(['youtube', 'instagram', 'facebook', 'tiktok']);
  });
});

describe('ConnectPlatformDto', () => {
  it.each(SUPPORTED_PLATFORMS)('accepts platform=%s with no account_name', async (platform) => {
    const dto = plainToInstance(ConnectPlatformDto, { platform });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('accepts an optional account_name string', async () => {
    const dto = plainToInstance(ConnectPlatformDto, {
      platform: 'youtube',
      account_name: 'My Channel',
    });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('rejects an unsupported platform value', async () => {
    const dto = plainToInstance(ConnectPlatformDto, { platform: 'twitter' });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].property).toBe('platform');
  });

  it('rejects a missing platform', async () => {
    const dto = plainToInstance(ConnectPlatformDto, {});
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'platform')).toBe(true);
  });

  it('rejects a non-string account_name', async () => {
    const dto = plainToInstance(ConnectPlatformDto, { platform: 'youtube', account_name: 123 });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'account_name')).toBe(true);
  });
});

describe('PublishClipDto', () => {
  it('accepts a valid platforms array with an optional title', async () => {
    const dto = plainToInstance(PublishClipDto, {
      platforms: ['youtube', 'instagram'],
      title: 'My clip',
    });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('accepts a valid platforms array without a title', async () => {
    const dto = plainToInstance(PublishClipDto, { platforms: ['facebook'] });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('rejects an empty platforms array', async () => {
    const dto = plainToInstance(PublishClipDto, { platforms: [] });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'platforms')).toBe(true);
  });

  it('rejects a platforms array containing an unsupported platform', async () => {
    const dto = plainToInstance(PublishClipDto, { platforms: ['youtube', 'twitter'] });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'platforms')).toBe(true);
  });

  it('rejects a missing platforms field', async () => {
    const dto = plainToInstance(PublishClipDto, {});
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'platforms')).toBe(true);
  });

  it('rejects a non-string title', async () => {
    const dto = plainToInstance(PublishClipDto, { platforms: ['youtube'], title: 42 });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'title')).toBe(true);
  });
});
