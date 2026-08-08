import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ChannelsService } from './channels.service';
import { ChannelsRepository } from './channels.repository';

describe('ChannelsService', () => {
  let service: ChannelsService;
  let channelsRepo: jest.Mocked<ChannelsRepository>;
  let fetchMock: jest.Mock;

  beforeEach(() => {
    channelsRepo = {
      listByUser: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
    } as unknown as jest.Mocked<ChannelsRepository>;

    service = new ChannelsService(channelsRepo);

    fetchMock = jest.fn();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (global as any).fetch = fetchMock;
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('list', () => {
    it('delegates to the repository', async () => {
      channelsRepo.listByUser.mockResolvedValue([{ id: 'ch1' } as never]);
      const result = await service.list('u1');
      expect(channelsRepo.listByUser).toHaveBeenCalledWith('u1');
      expect(result).toEqual([{ id: 'ch1' }]);
    });
  });

  describe('normalizeToYoutubeUrl', () => {
    it('throws BadRequestException for an empty/whitespace input', () => {
      expect(() => service.normalizeToYoutubeUrl('   ')).toThrow(BadRequestException);
    });

    it('throws BadRequestException for a non-YouTube full URL', () => {
      expect(() => service.normalizeToYoutubeUrl('https://vimeo.com/12345')).toThrow(
        'URL must be a YouTube channel link',
      );
    });

    it('strips query string and trailing slash from a full youtube.com URL', () => {
      const result = service.normalizeToYoutubeUrl(
        'https://www.youtube.com/@somechannel/?utm_source=x',
      );
      expect(result).toBe('https://www.youtube.com/@somechannel');
    });

    it('accepts a full youtu.be URL', () => {
      const result = service.normalizeToYoutubeUrl('https://youtu.be/@somechannel?x=1');
      expect(result).toBe('https://youtu.be/@somechannel');
    });

    it('builds a youtube.com URL from an @handle', () => {
      const result = service.normalizeToYoutubeUrl('@somechannel');
      expect(result).toBe('https://www.youtube.com/@somechannel');
    });

    it('preserves an @handle verbatim, including internal spaces (no stripping in this branch)', () => {
      const result = service.normalizeToYoutubeUrl('@some channel');
      expect(result).toBe('https://www.youtube.com/@some channel');
    });

    it('prefixes https:// onto a bare youtube.com path without a protocol', () => {
      const result = service.normalizeToYoutubeUrl('youtube.com/@somechannel');
      expect(result).toBe('https://youtube.com/@somechannel');
    });

    it('returns the value unchanged when it already starts with "http" (but not the full "http://"/"https://" prefix check above)', () => {
      // Does not start with 'http://' or 'https://', so bypasses the
      // full-URL branch; still starts with 'http' and contains
      // 'youtube.com', hitting the true side of the startsWith('http') ternary.
      const result = service.normalizeToYoutubeUrl('httpxyoutube.com/channel');
      expect(result).toBe('httpxyoutube.com/channel');
    });

    it('builds a youtube.com URL from a bare handle, stripping leading @ and whitespace', () => {
      const result = service.normalizeToYoutubeUrl(' some channel ');
      expect(result).toBe('https://www.youtube.com/@somechannel');
    });

    it('builds a youtube.com URL from a bare handle that already starts with @ but has surrounding text', () => {
      const result = service.normalizeToYoutubeUrl('  @already-prefixed  ');
      // Starts with '@' after trim -> handled by the startsWith('@') branch.
      expect(result).toBe('https://www.youtube.com/@already-prefixed');
    });
  });

  describe('resolveChannel', () => {
    it('returns oEmbed data when the fetch succeeds', async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        json: async () => ({ author_name: 'Cool Channel', thumbnail_url: 'thumb.jpg' }),
      });

      const result = await service.resolveChannel('@coolchannel');
      expect(result).toEqual({
        channel_url: 'https://www.youtube.com/@coolchannel',
        channel_name: 'Cool Channel',
        thumbnail_url: 'thumb.jpg',
      });
    });

    it('falls back to the handle-derived name when oEmbed omits author_name', async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        json: async () => ({}),
      });

      const result = await service.resolveChannel('@coolchannel');
      expect(result.channel_name).toBe('coolchannel');
      expect(result.thumbnail_url).toBeUndefined();
    });

    it('falls back to handle-based resolution when the response is not ok', async () => {
      fetchMock.mockResolvedValue({ ok: false });

      const result = await service.resolveChannel('@coolchannel');
      expect(result).toEqual({
        channel_url: 'https://www.youtube.com/@coolchannel',
        channel_name: 'coolchannel',
      });
    });

    it('falls back to handle-based resolution when fetch throws', async () => {
      fetchMock.mockRejectedValue(new Error('network down'));

      const result = await service.resolveChannel('@coolchannel');
      expect(result.channel_name).toBe('coolchannel');
    });

    it('throws BadRequestException when no handle can be derived at all', async () => {
      fetchMock.mockResolvedValue({ ok: false });
      jest.spyOn(service as unknown as { handleFromUrl: (u: string) => string }, 'handleFromUrl').mockReturnValue('');

      await expect(service.resolveChannel('@coolchannel')).rejects.toThrow(
        'Could not find that YouTube channel',
      );
    });

    it('replaces dashes with spaces for @handle-derived names', async () => {
      fetchMock.mockResolvedValue({ ok: false });
      const result = await service.resolveChannel('@cool-channel-name');
      expect(result.channel_name).toBe('cool channel name');
    });

    it('derives "Channel <id>" for legacy /channel/ URLs', async () => {
      fetchMock.mockResolvedValue({ ok: false });
      const result = await service.resolveChannel('https://www.youtube.com/channel/UC1234567890');
      expect(result.channel_name).toBe('Channel UC123456');
    });

    it('falls back to "YouTube Channel" when the URL matches neither pattern', async () => {
      fetchMock.mockResolvedValue({ ok: false });
      const result = await service.resolveChannel('https://www.youtube.com/somepage');
      expect(result.channel_name).toBe('YouTube Channel');
    });
  });

  describe('connect', () => {
    const dto = { channel_url: 'https://www.youtube.com/@x', channel_name: 'X' };

    it('returns the created channel on success', async () => {
      channelsRepo.create.mockResolvedValue({ id: 'ch1' } as never);
      const result = await service.connect('u1', dto);
      expect(channelsRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: 'u1',
          channel_url: dto.channel_url,
          channel_name: dto.channel_name,
          is_trial_channel: true,
        }),
      );
      expect(result).toEqual({ id: 'ch1' });
    });

    it('respects an explicit is_trial_channel value', async () => {
      channelsRepo.create.mockResolvedValue({ id: 'ch1' } as never);
      await service.connect('u1', { ...dto, is_trial_channel: false });
      expect(channelsRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ is_trial_channel: false }),
      );
    });

    it.each(['duplicate key value violates unique constraint', 'error code 23505', 'this is a duplicate'])(
      'throws BadRequestException for a duplicate-channel error: %s',
      async (message) => {
        channelsRepo.create.mockRejectedValue(new Error(message));
        await expect(service.connect('u1', dto)).rejects.toThrow(
          'This channel is already connected',
        );
      },
    );

    it('rethrows a generic Error unchanged', async () => {
      channelsRepo.create.mockRejectedValue(new Error('totally different failure'));
      await expect(service.connect('u1', dto)).rejects.toThrow('totally different failure');
    });

    it('rethrows a non-Error rejection unchanged', async () => {
      channelsRepo.create.mockRejectedValue('plain string failure');
      await expect(service.connect('u1', dto)).rejects.toBe('plain string failure');
    });
  });

  describe('disconnect', () => {
    it('throws NotFoundException when nothing was removed', async () => {
      channelsRepo.delete.mockResolvedValue(false);
      await expect(service.disconnect('u1', 'ch1')).rejects.toThrow(NotFoundException);
    });

    it('returns removed: true on success', async () => {
      channelsRepo.delete.mockResolvedValue(true);
      const result = await service.disconnect('u1', 'ch1');
      expect(result).toEqual({ removed: true });
    });
  });
});
