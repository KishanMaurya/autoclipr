import { NewsletterController } from './newsletter.controller';
import { NewsletterService } from './newsletter.service';

describe('NewsletterController', () => {
  let controller: NewsletterController;
  let service: jest.Mocked<NewsletterService>;

  beforeEach(() => {
    service = { subscribe: jest.fn() } as unknown as jest.Mocked<NewsletterService>;
    controller = new NewsletterController(service);
  });

  it('subscribes an anonymous visitor and returns a success envelope', async () => {
    service.subscribe.mockResolvedValue({ alreadySubscribed: false });

    const result = await controller.subscribe({ email: 'jane@example.com' });

    expect(service.subscribe).toHaveBeenCalledWith({ email: 'jane@example.com' }, undefined);
    expect(result).toEqual({
      success: true,
      data: { subscribed: true, already_subscribed: false },
    });
  });

  it('passes the signed-in user id through to the service', async () => {
    service.subscribe.mockResolvedValue({ alreadySubscribed: false });

    await controller.subscribe({ email: 'jane@example.com' }, { sub: 'user-1' } as never);

    expect(service.subscribe).toHaveBeenCalledWith({ email: 'jane@example.com' }, 'user-1');
  });

  it('still reports success for an address that was already subscribed', async () => {
    service.subscribe.mockResolvedValue({ alreadySubscribed: true });

    const result = await controller.subscribe({ email: 'jane@example.com' });

    expect(result).toEqual({
      success: true,
      data: { subscribed: true, already_subscribed: true },
    });
  });

  it('propagates a service failure', async () => {
    service.subscribe.mockRejectedValue(new Error('db down'));

    await expect(controller.subscribe({ email: 'jane@example.com' })).rejects.toThrow('db down');
  });
});
