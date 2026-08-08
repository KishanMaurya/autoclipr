import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SupabaseAdminService } from './supabase-admin.service';
import { createServerSupabaseClient } from '../common/supabase-client';

jest.mock('../common/supabase-client', () => ({
  createServerSupabaseClient: jest.fn(),
}));

const mockedCreateServerSupabaseClient = createServerSupabaseClient as jest.Mock;

function makeJwt(payload: Record<string, unknown>): string {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `${header}.${body}.signature`;
}

describe('SupabaseAdminService', () => {
  let config: { get: jest.Mock };
  let configValues: Record<string, string | undefined>;
  let service: SupabaseAdminService;
  let warnSpy: jest.SpyInstance;
  let errorSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    configValues = {};
    config = { get: jest.fn((key: string) => configValues[key]) };
    service = new SupabaseAdminService(config as unknown as ConfigService);
    warnSpy = jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
    errorSpy = jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    mockedCreateServerSupabaseClient.mockReturnValue({ marker: 'supabase-client' });
  });

  afterEach(() => {
    warnSpy.mockRestore();
    errorSpy.mockRestore();
  });

  describe('onModuleInit', () => {
    it('warns and leaves the client unconfigured when both url and key are missing', () => {
      service.onModuleInit();

      expect(warnSpy).toHaveBeenCalledWith('SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY missing');
      expect(service.isConfigured).toBe(false);
      expect(mockedCreateServerSupabaseClient).not.toHaveBeenCalled();
    });

    it('warns and leaves the client unconfigured when only the url is missing', () => {
      configValues.supabaseServiceKey = 'some-key';
      service.onModuleInit();

      expect(warnSpy).toHaveBeenCalledWith('SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY missing');
      expect(service.isConfigured).toBe(false);
    });

    it('warns and leaves the client unconfigured when only the key is missing', () => {
      configValues.supabaseUrl = 'https://proj.supabase.co';
      service.onModuleInit();

      expect(warnSpy).toHaveBeenCalledWith('SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY missing');
      expect(service.isConfigured).toBe(false);
    });

    it('creates the client and does not log an anon-key warning when the key looks like a service_role key', () => {
      configValues.supabaseUrl = 'https://proj.supabase.co';
      configValues.supabaseServiceKey = makeJwt({ role: 'service_role' });

      service.onModuleInit();

      expect(errorSpy).not.toHaveBeenCalled();
      expect(mockedCreateServerSupabaseClient).toHaveBeenCalledWith(
        'https://proj.supabase.co',
        configValues.supabaseServiceKey,
      );
      expect(service.isConfigured).toBe(true);
    });

    it('logs an error but still creates the client when the key looks like the anon key', () => {
      configValues.supabaseUrl = 'https://proj.supabase.co';
      configValues.supabaseServiceKey = makeJwt({ role: 'anon' });

      service.onModuleInit();

      expect(errorSpy).toHaveBeenCalledWith(
        'SUPABASE_SERVICE_ROLE_KEY looks like the anon key. Use the service_role secret from Supabase → Settings → API.',
      );
      expect(mockedCreateServerSupabaseClient).toHaveBeenCalledWith(
        'https://proj.supabase.co',
        configValues.supabaseServiceKey,
      );
      expect(service.isConfigured).toBe(true);
    });

    it('treats a malformed (non-JWT) key as not anon-like, logs no error, and still creates the client', () => {
      configValues.supabaseUrl = 'https://proj.supabase.co';
      configValues.supabaseServiceKey = 'not-a-real-jwt';

      service.onModuleInit();

      expect(errorSpy).not.toHaveBeenCalled();
      expect(mockedCreateServerSupabaseClient).toHaveBeenCalledWith(
        'https://proj.supabase.co',
        'not-a-real-jwt',
      );
      expect(service.isConfigured).toBe(true);
    });

    it('treats a JWT-shaped key with a non-JSON payload as not anon-like without throwing', () => {
      configValues.supabaseUrl = 'https://proj.supabase.co';
      configValues.supabaseServiceKey = `header.${Buffer.from('not-json').toString('base64url')}.sig`;

      expect(() => service.onModuleInit()).not.toThrow();
      expect(errorSpy).not.toHaveBeenCalled();
      expect(service.isConfigured).toBe(true);
    });
  });

  describe('isConfigured', () => {
    it('is false before onModuleInit has run', () => {
      expect(service.isConfigured).toBe(false);
    });

    it('is true after a successful onModuleInit', () => {
      configValues.supabaseUrl = 'https://proj.supabase.co';
      configValues.supabaseServiceKey = makeJwt({ role: 'service_role' });
      service.onModuleInit();

      expect(service.isConfigured).toBe(true);
    });
  });

  describe('getClient', () => {
    it('throws a descriptive error when Supabase has not been configured', () => {
      expect(() => service.getClient()).toThrow(
        'Supabase is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env',
      );
    });

    it('returns the created client once configured', () => {
      configValues.supabaseUrl = 'https://proj.supabase.co';
      configValues.supabaseServiceKey = makeJwt({ role: 'service_role' });
      mockedCreateServerSupabaseClient.mockReturnValue({ marker: 'the-client' });
      service.onModuleInit();

      expect(service.getClient()).toEqual({ marker: 'the-client' });
    });
  });
});
