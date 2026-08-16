import { Test } from '@nestjs/testing';
import { SupabaseAdminService } from '../../database/supabase-admin.service';
import { InsufficientCreditsError, UsersRepository } from './users.repository';
import { createQueryBuilderMock, createSupabaseAdminServiceMock } from '../../test-utils/supabase-mock';

describe('UsersRepository', () => {
  let repo: UsersRepository;
  let supabaseMock: ReturnType<typeof createSupabaseAdminServiceMock>;

  beforeEach(async () => {
    supabaseMock = createSupabaseAdminServiceMock();

    const moduleRef = await Test.createTestingModule({
      providers: [UsersRepository, { provide: SupabaseAdminService, useValue: supabaseMock }],
    }).compile();

    repo = moduleRef.get(UsersRepository);
  });

  describe('getById', () => {
    it('returns the profile when found', async () => {
      const profile = { id: 'user-1', email: 'jane@example.com' };
      const builder = createQueryBuilderMock({ data: profile, error: null });
      supabaseMock.__client.from.mockReturnValue(builder);

      const result = await repo.getById('user-1');

      expect(supabaseMock.__client.from).toHaveBeenCalledWith('profiles');
      expect(builder.eq).toHaveBeenCalledWith('id', 'user-1');
      expect(result).toEqual(profile);
    });

    it('returns null when no row is found', async () => {
      const builder = createQueryBuilderMock({ data: null, error: null });
      supabaseMock.__client.from.mockReturnValue(builder);

      const result = await repo.getById('missing-user');

      expect(result).toBeNull();
    });

    it('throws when Supabase returns an error', async () => {
      const builder = createQueryBuilderMock({ data: null, error: { message: 'db exploded' } });
      supabaseMock.__client.from.mockReturnValue(builder);

      await expect(repo.getById('user-1')).rejects.toThrow('db exploded');
    });
  });

  describe('upsertFromAuth', () => {
    it('upserts on id conflict and returns the row', async () => {
      const profile = { id: 'user-1', email: 'jane@example.com' };
      const builder = createQueryBuilderMock({ data: profile, error: null });
      supabaseMock.__client.from.mockReturnValue(builder);

      const result = await repo.upsertFromAuth('user-1', 'jane@example.com', 'Jane', 'https://cdn/a.png', '+123');

      expect(builder.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'user-1',
          email: 'jane@example.com',
          full_name: 'Jane',
          avatar_url: 'https://cdn/a.png',
          phone: '+123',
        }),
        { onConflict: 'id' },
      );
      expect(result).toEqual(profile);
    });

    it('nulls out empty full_name/avatar_url/phone', async () => {
      const builder = createQueryBuilderMock({ data: { id: 'user-1' }, error: null });
      supabaseMock.__client.from.mockReturnValue(builder);

      await repo.upsertFromAuth('user-1', '', '', '');

      expect(builder.upsert).toHaveBeenCalledWith(
        expect.objectContaining({ email: '', full_name: null, avatar_url: null, phone: null }),
        { onConflict: 'id' },
      );
    });

    it('throws when Supabase returns an error', async () => {
      const builder = createQueryBuilderMock({ data: null, error: { message: 'insert failed' } });
      supabaseMock.__client.from.mockReturnValue(builder);

      await expect(repo.upsertFromAuth('user-1', 'jane@example.com', '', '')).rejects.toThrow('insert failed');
    });

    it('throws when Supabase returns neither data nor error', async () => {
      const builder = createQueryBuilderMock({ data: null, error: null });
      supabaseMock.__client.from.mockReturnValue(builder);

      await expect(repo.upsertFromAuth('user-1', 'jane@example.com', '', '')).rejects.toThrow(
        'Failed to upsert profile',
      );
    });
  });

  describe('ensureProfile', () => {
    it('does nothing when a profile already exists', async () => {
      const builder = createQueryBuilderMock({ data: { id: 'user-1' }, error: null });
      supabaseMock.__client.from.mockReturnValue(builder);

      await repo.ensureProfile('user-1', 'jane@example.com');

      expect(builder.upsert).not.toHaveBeenCalled();
    });

    it('upserts a blank profile when none exists', async () => {
      const selectBuilder = createQueryBuilderMock({ data: null, error: null });
      const upsertBuilder = createQueryBuilderMock({ data: { id: 'user-1' }, error: null });
      supabaseMock.__client.from
        .mockReturnValueOnce(selectBuilder)
        .mockReturnValueOnce(upsertBuilder);

      await repo.ensureProfile('user-1', 'jane@example.com');

      expect(upsertBuilder.upsert).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'user-1', email: 'jane@example.com', full_name: null, avatar_url: null }),
        { onConflict: 'id' },
      );
    });

    it('swallows an upsert failure when creating the missing profile', async () => {
      const selectBuilder = createQueryBuilderMock({ data: null, error: null });
      const upsertBuilder = createQueryBuilderMock({ data: null, error: { message: 'insert failed' } });
      supabaseMock.__client.from
        .mockReturnValueOnce(selectBuilder)
        .mockReturnValueOnce(upsertBuilder);

      await expect(repo.ensureProfile('user-1', 'jane@example.com')).resolves.toBeUndefined();
    });

    it('defaults email to an empty string', async () => {
      const selectBuilder = createQueryBuilderMock({ data: null, error: null });
      const upsertBuilder = createQueryBuilderMock({ data: { id: 'user-1' }, error: null });
      supabaseMock.__client.from
        .mockReturnValueOnce(selectBuilder)
        .mockReturnValueOnce(upsertBuilder);

      await repo.ensureProfile('user-1');

      expect(upsertBuilder.upsert).toHaveBeenCalledWith(
        expect.objectContaining({ email: '' }),
        { onConflict: 'id' },
      );
    });
  });

  describe('updateProfile', () => {
    it('only includes patched fields plus updated_at', async () => {
      const profile = { id: 'user-1', full_name: 'New Name' };
      const builder = createQueryBuilderMock({ data: profile, error: null });
      supabaseMock.__client.from.mockReturnValue(builder);

      const result = await repo.updateProfile('user-1', { full_name: 'New Name' });

      expect(builder.update).toHaveBeenCalledWith(
        expect.objectContaining({ full_name: 'New Name', updated_at: expect.any(String) }),
      );
      const updateArg = builder.update.mock.calls[0][0];
      expect(updateArg).not.toHaveProperty('email');
      expect(updateArg).not.toHaveProperty('phone');
      expect(updateArg).not.toHaveProperty('avatar_url');
      expect(updateArg).not.toHaveProperty('email_notifications_enabled');
      expect(builder.eq).toHaveBeenCalledWith('id', 'user-1');
      expect(result).toEqual(profile);
    });

    it('includes email in the update when patched', async () => {
      const builder = createQueryBuilderMock({ data: { id: 'user-1' }, error: null });
      supabaseMock.__client.from.mockReturnValue(builder);

      await repo.updateProfile('user-1', { email: 'new@example.com' });

      expect(builder.update).toHaveBeenCalledWith(expect.objectContaining({ email: 'new@example.com' }));
    });

    it('nulls out an empty-string full_name/phone/avatar_url patch', async () => {
      const builder = createQueryBuilderMock({ data: { id: 'user-1' }, error: null });
      supabaseMock.__client.from.mockReturnValue(builder);

      await repo.updateProfile('user-1', { full_name: '', phone: '', avatar_url: '' });

      expect(builder.update).toHaveBeenCalledWith(
        expect.objectContaining({ full_name: null, phone: null, avatar_url: null }),
      );
    });

    it('passes avatar_url=null through unchanged', async () => {
      const builder = createQueryBuilderMock({ data: { id: 'user-1' }, error: null });
      supabaseMock.__client.from.mockReturnValue(builder);

      await repo.updateProfile('user-1', { avatar_url: null });

      expect(builder.update).toHaveBeenCalledWith(expect.objectContaining({ avatar_url: null }));
    });

    it('includes email_notifications_enabled=false when explicitly patched', async () => {
      const builder = createQueryBuilderMock({ data: { id: 'user-1' }, error: null });
      supabaseMock.__client.from.mockReturnValue(builder);

      await repo.updateProfile('user-1', { email_notifications_enabled: false });

      expect(builder.update).toHaveBeenCalledWith(expect.objectContaining({ email_notifications_enabled: false }));
    });

    it('throws when Supabase returns an error', async () => {
      const builder = createQueryBuilderMock({ data: null, error: { message: 'update failed' } });
      supabaseMock.__client.from.mockReturnValue(builder);

      await expect(repo.updateProfile('user-1', { full_name: 'X' })).rejects.toThrow('update failed');
    });

    it('throws "Profile not found" when no row comes back', async () => {
      const builder = createQueryBuilderMock({ data: null, error: null });
      supabaseMock.__client.from.mockReturnValue(builder);

      await expect(repo.updateProfile('user-1', { full_name: 'X' })).rejects.toThrow('Profile not found');
    });
  });

  describe('deductCredits', () => {
    it('delegates to the atomic RPC and returns the new balance', async () => {
      supabaseMock.__client.rpc.mockResolvedValue({ data: 40, error: null });

      const newBalance = await repo.deductCredits('user-1', 10, 'clip_generation', 'clip-1');

      expect(newBalance).toBe(40);
      expect(supabaseMock.__client.rpc).toHaveBeenCalledWith('deduct_credits_atomic', {
        p_user_id: 'user-1',
        p_amount: 10,
        p_reason: 'clip_generation',
        p_reference_id: 'clip-1',
      });
    });

    it('never issues a separate read-then-write against profiles', async () => {
      // The whole point of the RPC is that the check and the debit are one
      // locked statement — a client-side read/update pair would reintroduce
      // the race this replaced.
      supabaseMock.__client.rpc.mockResolvedValue({ data: 40, error: null });

      await repo.deductCredits('user-1', 10, 'clip_generation');

      expect(supabaseMock.__client.from).not.toHaveBeenCalled();
    });

    it('defaults p_reference_id to null when not provided', async () => {
      supabaseMock.__client.rpc.mockResolvedValue({ data: 40, error: null });

      await repo.deductCredits('user-1', 10, 'clip_generation');

      expect(supabaseMock.__client.rpc).toHaveBeenCalledWith(
        'deduct_credits_atomic',
        expect.objectContaining({ p_reference_id: null }),
      );
    });

    it('throws InsufficientCreditsError when the RPC returns null (balance too low)', async () => {
      supabaseMock.__client.rpc.mockResolvedValue({ data: null, error: null });

      await expect(repo.deductCredits('user-1', 10, 'clip_generation')).rejects.toThrow(
        InsufficientCreditsError,
      );
    });

    it('carries the required amount on InsufficientCreditsError', async () => {
      supabaseMock.__client.rpc.mockResolvedValue({ data: null, error: null });

      await expect(repo.deductCredits('user-1', 25, 'clip_generation')).rejects.toMatchObject({
        required: 25,
      });
    });

    it('throws InsufficientCreditsError when the RPC returns undefined', async () => {
      supabaseMock.__client.rpc.mockResolvedValue({ data: undefined, error: null });

      await expect(repo.deductCredits('user-1', 10, 'clip_generation')).rejects.toThrow(
        InsufficientCreditsError,
      );
    });

    it('surfaces a database error rather than treating it as insufficient credits', async () => {
      supabaseMock.__client.rpc.mockResolvedValue({ data: null, error: { message: 'rpc failed' } });

      await expect(repo.deductCredits('user-1', 10, 'clip_generation')).rejects.toThrow('rpc failed');
    });

    it('allows spending exactly the full balance down to zero', async () => {
      supabaseMock.__client.rpc.mockResolvedValue({ data: 0, error: null });

      await expect(repo.deductCredits('user-1', 10, 'clip_generation')).resolves.toBe(0);
    });
  });

  describe('refundCredits', () => {
    it('delegates to the refund RPC and returns the new balance', async () => {
      supabaseMock.__client.rpc.mockResolvedValue({ data: 60, error: null });

      const newBalance = await repo.refundCredits('user-1', 10, 'pipeline_failed', 'video-1');

      expect(newBalance).toBe(60);
      expect(supabaseMock.__client.rpc).toHaveBeenCalledWith('refund_credits', {
        p_user_id: 'user-1',
        p_amount: 10,
        p_reason: 'pipeline_failed',
        p_reference_id: 'video-1',
      });
    });

    it('defaults p_reference_id to null when not provided', async () => {
      supabaseMock.__client.rpc.mockResolvedValue({ data: 60, error: null });

      await repo.refundCredits('user-1', 10, 'pipeline_failed');

      expect(supabaseMock.__client.rpc).toHaveBeenCalledWith(
        'refund_credits',
        expect.objectContaining({ p_reference_id: null }),
      );
    });

    it('returns null when the user row is missing', async () => {
      supabaseMock.__client.rpc.mockResolvedValue({ data: null, error: null });

      await expect(repo.refundCredits('ghost', 10, 'pipeline_failed')).resolves.toBeNull();
    });

    it('throws when the RPC errors', async () => {
      supabaseMock.__client.rpc.mockResolvedValue({ data: null, error: { message: 'rpc failed' } });

      await expect(repo.refundCredits('user-1', 10, 'pipeline_failed')).rejects.toThrow('rpc failed');
    });
  });

  describe('listCreditTransactions', () => {
    it('returns transactions ordered by most recent, limited to the given count', async () => {
      const rows = [{ id: 'tx-1' }];
      const builder = createQueryBuilderMock({ data: rows, error: null });
      supabaseMock.__client.from.mockReturnValue(builder);

      const result = await repo.listCreditTransactions('user-1', 5);

      expect(builder.order).toHaveBeenCalledWith('created_at', { ascending: false });
      expect(builder.limit).toHaveBeenCalledWith(5);
      expect(result).toEqual(rows);
    });

    it('defaults the limit to 50', async () => {
      const builder = createQueryBuilderMock({ data: [], error: null });
      supabaseMock.__client.from.mockReturnValue(builder);

      await repo.listCreditTransactions('user-1');

      expect(builder.limit).toHaveBeenCalledWith(50);
    });

    it('returns an empty array when data is null', async () => {
      const builder = createQueryBuilderMock({ data: null, error: null });
      supabaseMock.__client.from.mockReturnValue(builder);

      const result = await repo.listCreditTransactions('user-1');

      expect(result).toEqual([]);
    });

    it('throws when Supabase returns an error', async () => {
      const builder = createQueryBuilderMock({ data: null, error: { message: 'query failed' } });
      supabaseMock.__client.from.mockReturnValue(builder);

      await expect(repo.listCreditTransactions('user-1')).rejects.toThrow('query failed');
    });
  });

  describe('getSubscription', () => {
    it('returns the subscription row', async () => {
      const sub = { id: 'sub-1', user_id: 'user-1' };
      const builder = createQueryBuilderMock({ data: sub, error: null });
      supabaseMock.__client.from.mockReturnValue(builder);

      const result = await repo.getSubscription('user-1');

      expect(result).toEqual(sub);
    });

    it('returns null when no subscription exists', async () => {
      const builder = createQueryBuilderMock({ data: null, error: null });
      supabaseMock.__client.from.mockReturnValue(builder);

      const result = await repo.getSubscription('user-1');

      expect(result).toBeNull();
    });

    it('throws when Supabase returns an error', async () => {
      const builder = createQueryBuilderMock({ data: null, error: { message: 'query failed' } });
      supabaseMock.__client.from.mockReturnValue(builder);

      await expect(repo.getSubscription('user-1')).rejects.toThrow('query failed');
    });
  });

  describe('heartbeat', () => {
    it('updates last_seen_at for the user', async () => {
      const builder = createQueryBuilderMock({ data: null, error: null });
      supabaseMock.__client.from.mockReturnValue(builder);

      await repo.heartbeat('user-1');

      expect(supabaseMock.__client.from).toHaveBeenCalledWith('profiles');
      expect(builder.update).toHaveBeenCalledWith(expect.objectContaining({ last_seen_at: expect.any(String) }));
      expect(builder.eq).toHaveBeenCalledWith('id', 'user-1');
    });
  });

  describe('markWelcomeSent', () => {
    it('sets welcome_sent to true', async () => {
      const builder = createQueryBuilderMock({ data: null, error: null });
      supabaseMock.__client.from.mockReturnValue(builder);

      await repo.markWelcomeSent('user-1');

      expect(builder.update).toHaveBeenCalledWith({ welcome_sent: true });
      expect(builder.eq).toHaveBeenCalledWith('id', 'user-1');
    });
  });

  describe('listPlans', () => {
    it('returns active plans ordered by price ascending', async () => {
      const plans = [{ id: 'starter' }, { id: 'creator' }];
      const builder = createQueryBuilderMock({ data: plans, error: null });
      supabaseMock.__client.from.mockReturnValue(builder);

      const result = await repo.listPlans();

      expect(builder.eq).toHaveBeenCalledWith('active', true);
      expect(builder.order).toHaveBeenCalledWith('price_cents', { ascending: true });
      expect(result).toEqual(plans);
    });

    it('returns an empty array when data is null', async () => {
      const builder = createQueryBuilderMock({ data: null, error: null });
      supabaseMock.__client.from.mockReturnValue(builder);

      const result = await repo.listPlans();

      expect(result).toEqual([]);
    });

    it('throws when Supabase returns an error', async () => {
      const builder = createQueryBuilderMock({ data: null, error: { message: 'query failed' } });
      supabaseMock.__client.from.mockReturnValue(builder);

      await expect(repo.listPlans()).rejects.toThrow('query failed');
    });
  });
});
