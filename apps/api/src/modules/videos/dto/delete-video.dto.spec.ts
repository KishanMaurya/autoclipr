import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { DeleteVideoDto } from './delete-video.dto';

describe('DeleteVideoDto', () => {
  it('passes validation with a valid v4 UUID', async () => {
    const dto = plainToInstance(DeleteVideoDto, {
      video_id: '123e4567-e89b-42d3-a456-426614174000',
    });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('fails validation when video_id is not a UUID', async () => {
    const dto = plainToInstance(DeleteVideoDto, { video_id: 'not-a-uuid' });
    const errors = await validate(dto);
    expect(errors).toHaveLength(1);
    expect(errors[0].property).toBe('video_id');
  });

  it('fails validation when video_id is missing', async () => {
    const dto = plainToInstance(DeleteVideoDto, {});
    const errors = await validate(dto);
    expect(errors).toHaveLength(1);
    expect(errors[0].property).toBe('video_id');
  });
});
