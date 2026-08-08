import { inferPhoneAvatarGender, resolvePhoneAvatar } from './phone-avatar';

describe('inferPhoneAvatarGender', () => {
  it('returns "boy" when the phone has no digits at all', () => {
    expect(inferPhoneAvatarGender('')).toBe('boy');
    expect(inferPhoneAvatarGender('abc')).toBe('boy');
    expect(inferPhoneAvatarGender('+()- ')).toBe('boy');
  });

  it.each([
    ['+1-555-123-4561', 'boy'],
    ['+1-555-123-4563', 'boy'],
    ['+1-555-123-4569', 'boy'],
  ])('classifies a phone ending in an odd digit (%s) as boy', (phone, expected) => {
    expect(inferPhoneAvatarGender(phone)).toBe(expected);
  });

  it.each([
    ['+1-555-123-4560', 'girl'],
    ['+1-555-123-4562', 'girl'],
    ['+1-555-123-4568', 'girl'],
  ])('classifies a phone ending in an even digit (%s) as girl', (phone, expected) => {
    expect(inferPhoneAvatarGender(phone)).toBe(expected);
  });

  it('treats a trailing digit of 0 as even (girl), not falsy', () => {
    expect(inferPhoneAvatarGender('5550')).toBe('girl');
  });
});

describe('resolvePhoneAvatar', () => {
  it('returns the trimmed custom avatar URL when one is provided', () => {
    expect(resolvePhoneAvatar('5551234561', '  https://example.com/a.png  ')).toBe(
      'https://example.com/a.png',
    );
  });

  it('falls back to a gender emoji when avatarUrl is omitted', () => {
    expect(resolvePhoneAvatar('5551234561')).toBe('👦');
    expect(resolvePhoneAvatar('5551234560')).toBe('👧');
  });

  it('falls back to a gender emoji when avatarUrl is whitespace-only', () => {
    expect(resolvePhoneAvatar('5551234561', '   ')).toBe('👦');
  });

  it('falls back to a gender emoji when avatarUrl is the placeholder phone emoji', () => {
    expect(resolvePhoneAvatar('5551234560', '📱')).toBe('👧');
  });
});
