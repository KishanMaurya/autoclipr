import { getSourceLabel, parseVideoUrl } from './video-url.util';

describe('parseVideoUrl', () => {
  it('returns an unsupported/invalid result for an empty string', () => {
    expect(parseVideoUrl('')).toEqual({
      sourceType: 'unknown',
      normalizedUrl: '',
      displayName: 'Invalid URL',
      isSupported: false,
    });
  });

  it('returns an unsupported/invalid result for whitespace-only input', () => {
    expect(parseVideoUrl('   ')).toEqual({
      sourceType: 'unknown',
      normalizedUrl: '',
      displayName: 'Invalid URL',
      isSupported: false,
    });
  });

  it('returns an unsupported/invalid result for a string that is not a valid URL', () => {
    const result = parseVideoUrl('not a url at all!!');
    expect(result.sourceType).toBe('unknown');
    expect(result.isSupported).toBe(false);
    expect(result.displayName).toBe('Invalid URL');
  });

  it('defaults to https:// when no protocol is given', () => {
    const result = parseVideoUrl('youtube.com/watch?v=abc123');
    expect(result.normalizedUrl.startsWith('https://')).toBe(true);
    expect(result.sourceType).toBe('youtube');
  });

  it.each([
    ['https://www.youtube.com/watch?v=abc123', 'youtube'],
    ['https://youtube.com/watch?v=abc123', 'youtube'],
    ['https://youtu.be/abc123', 'youtube'],
    ['https://www.youtube-nocookie.com/embed/abc123', 'youtube'],
    ['https://vimeo.com/12345', 'vimeo'],
    ['https://www.vimeo.com/12345', 'vimeo'],
    ['https://loom.com/share/abc123', 'loom'],
    ['https://www.loom.com/share/abc123', 'loom'],
    ['https://drive.google.com/file/d/abc123/view', 'google_drive'],
    ['https://docs.google.com/document/d/abc123', 'google_drive'],
  ])('classifies %s as %s and marks it supported', (input, expected) => {
    const result = parseVideoUrl(input);
    expect(result.sourceType).toBe(expected);
    expect(result.isSupported).toBe(true);
  });

  it.each([
    'https://example.com/video.mp4',
    'https://example.com/video.MP4',
    'https://example.com/clip.mov',
    'https://example.com/clip.webm',
  ])('classifies a direct video file URL (%s) as direct_mp4', (input) => {
    const result = parseVideoUrl(input);
    expect(result.sourceType).toBe('direct_mp4');
    expect(result.isSupported).toBe(true);
  });

  it('strips a leading www. when matching known hosts', () => {
    const result = parseVideoUrl('https://www.youtube.com/watch?v=abc');
    expect(result.sourceType).toBe('youtube');
  });

  it('classifies an unrecognized but valid URL as unknown/unsupported', () => {
    const result = parseVideoUrl('https://example.com/some/random/page');
    expect(result.sourceType).toBe('unknown');
    expect(result.isSupported).toBe(false);
    expect(result.displayName).toBe('Unknown');
    expect(result.normalizedUrl).toBe('https://example.com/some/random/page');
  });
});

describe('getSourceLabel', () => {
  it.each([
    ['youtube', 'YouTube'],
    ['vimeo', 'Vimeo'],
    ['loom', 'Loom'],
    ['google_drive', 'Google Drive'],
    ['direct_mp4', 'Direct MP4'],
    ['upload', 'Uploaded Video'],
    ['unknown', 'Unknown'],
  ] as const)('returns the display label for %s', (type, label) => {
    expect(getSourceLabel(type)).toBe(label);
  });

  it('falls back to "Video" for an unrecognized type', () => {
    // @ts-expect-error deliberately testing an invalid enum value at the JS boundary
    expect(getSourceLabel('something-else')).toBe('Video');
  });
});
