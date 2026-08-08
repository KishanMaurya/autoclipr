import { BadRequestException } from '@nestjs/common';
import { ChannelsController } from './channels.controller';
import { ChannelsService } from './channels.service';

describe('ChannelsController', () => {
  let controller: ChannelsController;
  let service: jest.Mocked<ChannelsService>;
  const user = { sub: 'u1', email: 'u1@test.dev' };

  beforeEach(() => {
    service = {
      list: jest.fn(),
      resolveChannel: jest.fn(),
      connect: jest.fn(),
      disconnect: jest.fn(),
    } as unknown as jest.Mocked<ChannelsService>;

    controller = new ChannelsController(service);
  });

  it('list delegates to the service', async () => {
    service.list.mockResolvedValue([{ id: 'ch1' } as never]);

    const result = await controller.list(user);

    expect(service.list).toHaveBeenCalledWith('u1');
    expect(result.data).toEqual([{ id: 'ch1' }]);
  });

  describe('resolve', () => {
    it('throws BadRequestException when q is missing', async () => {
      await expect(controller.resolve(undefined as unknown as string)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('throws BadRequestException when q is whitespace-only', async () => {
      await expect(controller.resolve('   ')).rejects.toThrow(BadRequestException);
    });

    it('delegates to resolveChannel when q is valid', async () => {
      service.resolveChannel.mockResolvedValue({
        channel_url: 'https://www.youtube.com/@x',
        channel_name: 'X',
      });

      const result = await controller.resolve('@x');

      expect(service.resolveChannel).toHaveBeenCalledWith('@x');
      expect(result.data).toEqual({
        channel_url: 'https://www.youtube.com/@x',
        channel_name: 'X',
      });
    });
  });

  it('connect delegates to the service', async () => {
    service.connect.mockResolvedValue({ id: 'ch1' } as never);
    const dto = { channel_url: 'https://www.youtube.com/@x', channel_name: 'X' };

    const result = await controller.connect(user, dto);

    expect(service.connect).toHaveBeenCalledWith('u1', dto);
    expect(result.data).toEqual({ id: 'ch1' });
  });

  it('disconnect delegates to the service', async () => {
    service.disconnect.mockResolvedValue({ removed: true });

    const result = await controller.disconnect(user, 'ch1');

    expect(service.disconnect).toHaveBeenCalledWith('u1', 'ch1');
    expect(result.data).toEqual({ removed: true });
  });
});
