import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { SubscribeNewsletterDto } from './subscribe.dto';

async function validateDto(payload: Record<string, unknown>) {
  return validate(plainToInstance(SubscribeNewsletterDto, payload));
}

function fieldsWithErrors(errors: Awaited<ReturnType<typeof validateDto>>) {
  return errors.map((e) => e.property);
}

describe('SubscribeNewsletterDto', () => {
  it('passes with only an email', async () => {
    expect(await validateDto({ email: 'jane@example.com' })).toHaveLength(0);
  });

  it('passes with every optional field supplied', async () => {
    const errors = await validateDto({
      email: 'jane@example.com',
      source: 'blog',
      page_url: 'https://autoclipr.com/blog',
    });
    expect(errors).toHaveLength(0);
  });

  it('rejects a missing email', async () => {
    expect(fieldsWithErrors(await validateDto({}))).toContain('email');
  });

  it.each(['not-an-email', 'jane@', '@example.com', ''])(
    'rejects the malformed email %p',
    async (email) => {
      expect(fieldsWithErrors(await validateDto({ email }))).toContain('email');
    },
  );

  it('rejects an email longer than 320 characters', async () => {
    const email = `${'a'.repeat(320)}@example.com`;
    expect(fieldsWithErrors(await validateDto({ email }))).toContain('email');
  });

  it('rejects a source longer than 60 characters', async () => {
    const errors = await validateDto({ email: 'jane@example.com', source: 'a'.repeat(61) });
    expect(fieldsWithErrors(errors)).toContain('source');
  });

  it('rejects a non-string source', async () => {
    const errors = await validateDto({ email: 'jane@example.com', source: 42 });
    expect(fieldsWithErrors(errors)).toContain('source');
  });

  it('rejects a page_url without a protocol', async () => {
    const errors = await validateDto({ email: 'jane@example.com', page_url: 'autoclipr.com/blog' });
    expect(fieldsWithErrors(errors)).toContain('page_url');
  });

  it('accepts an absent page_url and source', async () => {
    const errors = await validateDto({ email: 'jane@example.com' });
    expect(fieldsWithErrors(errors)).not.toContain('page_url');
    expect(fieldsWithErrors(errors)).not.toContain('source');
  });
});
