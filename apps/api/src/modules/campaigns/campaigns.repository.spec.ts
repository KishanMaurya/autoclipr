import { Test } from '@nestjs/testing';
import { SupabaseAdminService } from '../../database/supabase-admin.service';
import { CampaignsRepository } from './campaigns.repository';
import {
  createMockSupabaseClient,
  mockQueryBuilder,
  mockSupabaseAdminService,
} from '../../test-utils/supabase-mock';

describe('CampaignsRepository', () => {
  let repo: CampaignsRepository;
  let client: ReturnType<typeof createMockSupabaseClient>;

  beforeEach(async () => {
    client = createMockSupabaseClient();
    const moduleRef = await Test.createTestingModule({
      providers: [
        CampaignsRepository,
        { provide: SupabaseAdminService, useValue: mockSupabaseAdminService(client) },
      ],
    }).compile();
    repo = moduleRef.get(CampaignsRepository);
  });

  describe('findOrCreateForDate', () => {
    it('returns the existing campaign rather than creating a rival', async () => {
      client.from.mockReturnValue(mockQueryBuilder({ data: { id: 'camp-1' }, error: null }));

      await expect(repo.findOrCreateForDate('saturday_offer', '2026-09-05', 'X', null))
        .resolves.toEqual({ id: 'camp-1' });
    });

    it('creates one when none exists for that date', async () => {
      const created = mockQueryBuilder({ data: { id: 'camp-new' }, error: null });
      client.from
        .mockReturnValueOnce(mockQueryBuilder({ data: null, error: null }))
        .mockReturnValueOnce(created);

      await expect(repo.findOrCreateForDate('saturday_offer', '2026-09-05', 'X', null))
        .resolves.toEqual({ id: 'camp-new' });
      expect(created.insert).toHaveBeenCalled();
    });

    it('throws when the lookup fails', async () => {
      client.from.mockReturnValue(mockQueryBuilder({ data: null, error: { message: 'read fail' } }));

      await expect(repo.findOrCreateForDate('t', 'd', 'n', null)).rejects.toThrow('read fail');
    });

    it('throws when the insert fails', async () => {
      client.from
        .mockReturnValueOnce(mockQueryBuilder({ data: null, error: null }))
        .mockReturnValueOnce(mockQueryBuilder({ data: null, error: { message: 'dupe' } }));

      await expect(repo.findOrCreateForDate('t', 'd', 'n', null)).rejects.toThrow('dupe');
    });
  });

  describe('findEligibleUsers', () => {
    it('filters to free tiers with a usable email and no opt-out', async () => {
      const b = mockQueryBuilder({ data: [{ id: 'u1' }], error: null });
      client.from.mockReturnValue(b);

      await repo.findEligibleUsers(0, 100);

      expect(client.from).toHaveBeenCalledWith('profiles');
      expect(b.in).toHaveBeenCalledWith('subscription_tier', ['starter', 'free']);
      expect(b.neq).toHaveBeenCalledWith('email', '');
      // NULL means never set, which is not an opt-out.
      expect(b.or).toHaveBeenCalledWith(
        'email_notifications_enabled.is.null,email_notifications_enabled.eq.true',
      );
      expect(b.range).toHaveBeenCalledWith(0, 99);
    });

    it('throws on a query error', async () => {
      client.from.mockReturnValue(mockQueryBuilder({ data: null, error: { message: 'x' } }));
      await expect(repo.findEligibleUsers(0, 10)).rejects.toThrow('x');
    });

    it('returns an empty page when there is nothing', async () => {
      client.from.mockReturnValue(mockQueryBuilder({ data: null, error: null }));
      await expect(repo.findEligibleUsers(0, 10)).resolves.toEqual([]);
    });
  });

  describe('unsubscribedEmails', () => {
    it('lowercases for comparison', async () => {
      client.from.mockReturnValue(
        mockQueryBuilder({ data: [{ email: 'A@B.COM' }], error: null }),
      );

      const set = await repo.unsubscribedEmails();

      expect(set.has('a@b.com')).toBe(true);
    });

    it('throws on a query error', async () => {
      client.from.mockReturnValue(mockQueryBuilder({ data: null, error: { message: 'y' } }));
      await expect(repo.unsubscribedEmails()).rejects.toThrow('y');
    });
  });

  describe('claimRecipients', () => {
    it('ignores duplicates so a re-run cannot enrol anyone twice', async () => {
      const b = mockQueryBuilder({ data: [{ id: 'r1', user_id: 'u1', email: 'a@b.com' }], error: null });
      client.from.mockReturnValue(b);

      const claimed = await repo.claimRecipients('camp-1', [
        { id: 'u1', email: 'a@b.com', full_name: 'Ada' },
      ]);

      expect(b.upsert).toHaveBeenCalledWith(
        expect.any(Array),
        { onConflict: 'campaign_id,user_id', ignoreDuplicates: true },
      );
      expect(claimed[0].full_name).toBe('Ada');
    });

    it('does not touch the database for an empty batch', async () => {
      await expect(repo.claimRecipients('camp-1', [])).resolves.toEqual([]);
      expect(client.from).not.toHaveBeenCalled();
    });

    it('throws when the claim fails', async () => {
      client.from.mockReturnValue(mockQueryBuilder({ data: null, error: { message: 'z' } }));
      await expect(
        repo.claimRecipients('c', [{ id: 'u1', email: 'a@b.com', full_name: null }]),
      ).rejects.toThrow('z');
    });
  });

  describe('markSent / markFailed / markClicked', () => {
    it('stamps sent_at and clears any previous error', async () => {
      const b = mockQueryBuilder({ data: null, error: null });
      client.from.mockReturnValue(b);

      await repo.markSent('r1');

      expect(b.update).toHaveBeenCalledWith(
        expect.objectContaining({ sent_at: expect.any(String), error: null }),
      );
    });

    it('truncates a long failure message', async () => {
      const b = mockQueryBuilder({ data: null, error: null });
      client.from.mockReturnValue(b);

      await repo.markFailed('r1', 'x'.repeat(900));

      expect(b.update.mock.calls[0][0].error.length).toBe(500);
    });

    it('only stamps the first click', async () => {
      const b = mockQueryBuilder({ data: null, error: null });
      client.from.mockReturnValue(b);

      await repo.markClicked('camp-1', 'u1');

      expect(b.is).toHaveBeenCalledWith('clicked_at', null);
    });

    it.each([
      ['markSent', () => repo.markSent('r1')],
      ['markFailed', () => repo.markFailed('r1', 'e')],
      ['markClicked', () => repo.markClicked('c', 'u')],
    ])('%s throws on failure', async (_n, call) => {
      client.from.mockReturnValue(mockQueryBuilder({ data: null, error: { message: 'w' } }));
      await expect(call()).rejects.toThrow('w');
    });
  });

  describe('findUnsent', () => {
    it('returns only rows with no sent_at, unwrapping the joined name', async () => {
      const b = mockQueryBuilder({
        data: [{ id: 'r1', user_id: 'u1', email: 'a@b.com', profiles: { full_name: 'Ada' } }],
        error: null,
      });
      client.from.mockReturnValue(b);

      const rows = await repo.findUnsent('camp-1', 10);

      expect(b.is).toHaveBeenCalledWith('sent_at', null);
      expect(rows[0]).toMatchObject({ id: 'r1', full_name: 'Ada' });
    });

    it('handles the join arriving as an array', async () => {
      client.from.mockReturnValue(
        mockQueryBuilder({
          data: [{ id: 'r1', user_id: 'u1', email: 'a@b.com', profiles: [{ full_name: 'Ada' }] }],
          error: null,
        }),
      );

      const [row] = await repo.findUnsent('camp-1', 10);
      expect(row.full_name).toBe('Ada');
    });

    it('tolerates a missing join', async () => {
      client.from.mockReturnValue(
        mockQueryBuilder({ data: [{ id: 'r1', user_id: 'u1', email: 'a@b.com' }], error: null }),
      );

      const [row] = await repo.findUnsent('camp-1', 10);
      expect(row.full_name).toBeNull();
    });

    it('throws on a query error', async () => {
      client.from.mockReturnValue(mockQueryBuilder({ data: null, error: { message: 'q' } }));
      await expect(repo.findUnsent('c', 5)).rejects.toThrow('q');
    });
  });

  describe('getStats / listCampaigns / updateCampaign', () => {
    it('counts each funnel stage', async () => {
      client.from.mockReturnValue(
        mockQueryBuilder({
          data: [
            { sent_at: 'x', delivered_at: 'x', opened_at: 'x', clicked_at: 'x', redeemed_at: null, converted_at: null },
            { sent_at: 'x', delivered_at: null, opened_at: null, clicked_at: null, redeemed_at: 'x', converted_at: 'x' },
          ],
          error: null,
        }),
      );

      await expect(repo.getStats('camp-1')).resolves.toEqual({
        recipients: 2, sent: 2, delivered: 1, opened: 1, clicked: 1, redeemed: 1, converted: 1,
      });
    });

    it('returns zeroes when there are no recipients', async () => {
      client.from.mockReturnValue(mockQueryBuilder({ data: null, error: null }));
      await expect(repo.getStats('c')).resolves.toMatchObject({ recipients: 0, sent: 0 });
    });

    it('lists newest first', async () => {
      const b = mockQueryBuilder({ data: [{ id: 'c1' }], error: null });
      client.from.mockReturnValue(b);

      await repo.listCampaigns();

      expect(b.order).toHaveBeenCalledWith('scheduled_for', { ascending: false });
    });

    it('returns an empty list when there are none', async () => {
      client.from.mockReturnValue(mockQueryBuilder({ data: null, error: null }));
      await expect(repo.listCampaigns()).resolves.toEqual([]);
    });

    it('updates a campaign', async () => {
      const b = mockQueryBuilder({ data: null, error: null });
      client.from.mockReturnValue(b);

      await repo.updateCampaign('c1', { status: 'completed' });

      expect(b.update).toHaveBeenCalledWith({ status: 'completed' });
    });

    it.each([
      ['getStats', () => repo.getStats('c')],
      ['listCampaigns', () => repo.listCampaigns()],
      ['updateCampaign', () => repo.updateCampaign('c', {})],
    ])('%s throws on failure', async (_n, call) => {
      client.from.mockReturnValue(mockQueryBuilder({ data: null, error: { message: 'v' } }));
      await expect(call()).rejects.toThrow('v');
    });
  });
});
