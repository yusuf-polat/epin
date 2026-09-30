import { describe, expect, it } from 'vitest';
import { extractYoutubeId } from '@/features/disputes/constants';
import { safeRedirect } from '@/features/auth/utils';

describe('extractYoutubeId', () => {
  it.each([
    ['https://www.youtube.com/watch?v=dQw4w9WgXcQ', 'dQw4w9WgXcQ'],
    ['https://youtu.be/dQw4w9WgXcQ', 'dQw4w9WgXcQ'],
    ['  https://youtube.com/shorts/dQw4w9WgXcQ  ', 'dQw4w9WgXcQ'],
  ])('%s → video kimliği', (url, id) => {
    expect(extractYoutubeId(url)).toBe(id);
  });

  it('YouTube dışı adresleri reddeder', () => {
    expect(extractYoutubeId('https://example.com/watch?v=dQw4w9WgXcQ')).toBeNull();
  });
});

describe('safeRedirect', () => {
  it('yalnızca site içi yolları kabul eder (open redirect koruması)', () => {
    expect(safeRedirect('/sepet')).toBe('/sepet');
    expect(safeRedirect('//evil.com')).toBe('/hesabim');
    expect(safeRedirect('https://evil.com')).toBe('/hesabim');
    expect(safeRedirect(null)).toBe('/hesabim');
  });
});
