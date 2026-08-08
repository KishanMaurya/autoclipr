import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { DeleteAccountDto } from './delete-account.dto';

describe('DeleteAccountDto', () => {
  it('is valid when confirm is exactly "DELETE"', async () => {
    const dto = plainToInstance(DeleteAccountDto, { confirm: 'DELETE' });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it.each(['delete', 'Delete', 'CONFIRM', '', ' DELETE', 'DELETE '])(
    'rejects confirm=%p (must equal "DELETE" exactly)',
    async (value) => {
      const dto = plainToInstance(DeleteAccountDto, { confirm: value });
      const errors = await validate(dto);
      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('confirm');
      expect(errors[0].constraints).toHaveProperty('equals');
      expect(errors[0].constraints?.equals).toBe('Type DELETE to confirm account deletion.');
    },
  );

  it('rejects a missing confirm field', async () => {
    const dto = plainToInstance(DeleteAccountDto, {});
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].property).toBe('confirm');
  });

  it('rejects a non-string confirm value', async () => {
    const dto = plainToInstance(DeleteAccountDto, { confirm: 12345 });
    const errors = await validate(dto);
    const properties = errors.map((e) => e.property);
    expect(properties).toContain('confirm');
  });
});
