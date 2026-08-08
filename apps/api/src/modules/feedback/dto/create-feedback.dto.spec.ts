import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { CreateFeedbackDto, FEEDBACK_CATEGORIES } from './create-feedback.dto';

function validDto(): Record<string, unknown> {
  return {
    name: 'Alice Doe',
    email: 'alice@example.com',
    category: 'bug',
    message: 'This is a sufficiently long feedback message.',
    page_url: 'https://example.com/contact',
  };
}

async function validateDto(payload: Record<string, unknown>) {
  const instance = plainToInstance(CreateFeedbackDto, payload);
  return validate(instance);
}

describe('CreateFeedbackDto', () => {
  it('passes validation with a fully valid payload', async () => {
    const errors = await validateDto(validDto());
    expect(errors).toHaveLength(0);
  });

  it('passes validation without the optional page_url', async () => {
    const { page_url, ...rest } = validDto();
    const errors = await validateDto(rest);
    expect(errors).toHaveLength(0);
  });

  describe('name', () => {
    it.each([
      ['missing', undefined],
      ['too short', 'A'],
      ['too long', 'A'.repeat(121)],
      ['not a string', 123],
    ])('rejects name that is %s', async (_label, value) => {
      const errors = await validateDto({ ...validDto(), name: value });
      expect(errors.some((e) => e.property === 'name')).toBe(true);
    });

    it('accepts the minimum length boundary (2 chars)', async () => {
      const errors = await validateDto({ ...validDto(), name: 'Al' });
      expect(errors.filter((e) => e.property === 'name')).toHaveLength(0);
    });

    it('accepts the maximum length boundary (120 chars)', async () => {
      const errors = await validateDto({ ...validDto(), name: 'A'.repeat(120) });
      expect(errors.filter((e) => e.property === 'name')).toHaveLength(0);
    });
  });

  describe('email', () => {
    it.each([
      ['missing', undefined],
      ['malformed', 'not-an-email'],
      ['too long', `${'a'.repeat(315)}@x.com`],
    ])('rejects email that is %s', async (_label, value) => {
      const errors = await validateDto({ ...validDto(), email: value });
      expect(errors.some((e) => e.property === 'email')).toBe(true);
    });
  });

  describe('category', () => {
    it.each(FEEDBACK_CATEGORIES)('accepts the category "%s"', async (category) => {
      const errors = await validateDto({ ...validDto(), category });
      expect(errors.filter((e) => e.property === 'category')).toHaveLength(0);
    });

    it('rejects a category outside the allowed set', async () => {
      const errors = await validateDto({ ...validDto(), category: 'not-a-real-category' });
      expect(errors.some((e) => e.property === 'category')).toBe(true);
    });

    it('rejects a missing category', async () => {
      const { category, ...rest } = validDto();
      const errors = await validateDto(rest);
      expect(errors.some((e) => e.property === 'category')).toBe(true);
    });
  });

  describe('message', () => {
    it.each([
      ['missing', undefined],
      ['too short', 'short'],
      ['too long', 'A'.repeat(5001)],
      ['not a string', 42],
    ])('rejects message that is %s', async (_label, value) => {
      const errors = await validateDto({ ...validDto(), message: value });
      expect(errors.some((e) => e.property === 'message')).toBe(true);
    });

    it('accepts the minimum length boundary (10 chars)', async () => {
      const errors = await validateDto({ ...validDto(), message: '0123456789' });
      expect(errors.filter((e) => e.property === 'message')).toHaveLength(0);
    });
  });

  describe('page_url', () => {
    it('rejects a page_url without a protocol', async () => {
      const errors = await validateDto({ ...validDto(), page_url: 'example.com/contact' });
      expect(errors.some((e) => e.property === 'page_url')).toBe(true);
    });

    it('rejects a page_url exceeding the max length', async () => {
      const errors = await validateDto({ ...validDto(), page_url: `https://example.com/${'a'.repeat(2048)}` });
      expect(errors.some((e) => e.property === 'page_url')).toBe(true);
    });

    it('accepts a well-formed https page_url', async () => {
      const errors = await validateDto({ ...validDto(), page_url: 'https://example.com/pricing' });
      expect(errors.filter((e) => e.property === 'page_url')).toHaveLength(0);
    });
  });
});
