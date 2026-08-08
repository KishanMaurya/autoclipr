import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { ConnectChannelDto } from './connect-channel.dto';

const validBase = {
  channel_url: 'https://www.youtube.com/@somechannel',
  channel_name: 'Some Channel',
};

describe('ConnectChannelDto', () => {
  it('passes validation with only required fields', async () => {
    const dto = plainToInstance(ConnectChannelDto, validBase);
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('passes validation with all fields populated', async () => {
    const dto = plainToInstance(ConnectChannelDto, {
      ...validBase,
      thumbnail_url: 'https://example.com/thumb.jpg',
      is_trial_channel: false,
    });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('fails validation when channel_url is missing', async () => {
    const dto = plainToInstance(ConnectChannelDto, { channel_name: 'Some Channel' });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'channel_url')).toBe(true);
  });

  it('fails validation when channel_url is not a valid URL', async () => {
    const dto = plainToInstance(ConnectChannelDto, { ...validBase, channel_url: 'not-a-url' });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'channel_url')).toBe(true);
  });

  it('fails validation when channel_name is missing', async () => {
    const dto = plainToInstance(ConnectChannelDto, { channel_url: validBase.channel_url });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'channel_name')).toBe(true);
  });

  it('fails validation when is_trial_channel is not a boolean', async () => {
    const dto = plainToInstance(ConnectChannelDto, { ...validBase, is_trial_channel: 'yes' });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'is_trial_channel')).toBe(true);
  });
});
