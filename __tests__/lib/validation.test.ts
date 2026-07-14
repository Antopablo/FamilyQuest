import {
  pointsSchema,
  missionInputSchema,
  giftInputSchema,
  giftEditSchema,
  validationErrorKey,
  POINTS_MAX,
} from '@/lib/validation';

describe('validation', () => {
  describe('pointsSchema', () => {
    it('accepts positive integers (coerced from strings)', () => {
      const r = pointsSchema.safeParse('10');
      expect(r.success).toBe(true);
      if (r.success) expect(r.data).toBe(10);
    });

    it('rejects zero, negatives, decimals, NaN, empty and too-large values', () => {
      for (const v of ['0', '-5', '3.5', 'abc', '', '   ', String(POINTS_MAX + 1)]) {
        expect(pointsSchema.safeParse(v).success).toBe(false);
      }
    });
  });

  describe('missionInputSchema', () => {
    it('accepts a valid mission and trims the title', () => {
      const r = missionInputSchema.safeParse({ title: '  Devoirs  ', points_reward: '20' });
      expect(r.success).toBe(true);
      if (r.success) {
        expect(r.data.title).toBe('Devoirs');
        expect(r.data.points_reward).toBe(20);
      }
    });

    it('rejects an empty title', () => {
      expect(missionInputSchema.safeParse({ title: '   ', points_reward: '20' }).success).toBe(false);
    });

    it('rejects invalid points', () => {
      expect(missionInputSchema.safeParse({ title: 'X', points_reward: '-1' }).success).toBe(false);
    });
  });

  describe('giftInputSchema', () => {
    it('accepts optional empty URLs', () => {
      expect(
        giftInputSchema.safeParse({ title: 'Jouet', points_cost: '50', image_url: '', link_url: '' }).success
      ).toBe(true);
    });

    it('accepts valid http(s) URLs', () => {
      expect(
        giftInputSchema.safeParse({
          title: 'J',
          points_cost: '5',
          image_url: 'https://x.com/a.png',
          link_url: 'http://y.com',
        }).success
      ).toBe(true);
    });

    it('rejects a malformed URL', () => {
      expect(
        giftInputSchema.safeParse({ title: 'J', points_cost: '5', image_url: 'not a url', link_url: '' }).success
      ).toBe(false);
    });

    it('rejects a non-http(s) URL', () => {
      expect(
        giftInputSchema.safeParse({ title: 'J', points_cost: '5', image_url: 'ftp://x.com', link_url: '' }).success
      ).toBe(false);
    });
  });

  describe('giftEditSchema', () => {
    it('allows clearing the points cost (empty string)', () => {
      const r = giftEditSchema.safeParse({ title: 'J', points_cost: '', image_url: '', link_url: '' });
      expect(r.success).toBe(true);
      if (r.success) expect(r.data.points_cost).toBe('');
    });

    it('validates a provided points cost', () => {
      expect(giftEditSchema.safeParse({ title: 'J', points_cost: '0', image_url: '', link_url: '' }).success).toBe(false);
    });
  });

  describe('validationErrorKey', () => {
    it('maps the failing field to an i18n key', () => {
      const pts = missionInputSchema.safeParse({ title: 'X', points_reward: 'abc' });
      expect(pts.success).toBe(false);
      if (!pts.success) expect(validationErrorKey(pts.error)).toBe('validation.invalidPoints');

      const title = missionInputSchema.safeParse({ title: '', points_reward: '10' });
      expect(title.success).toBe(false);
      if (!title.success) expect(validationErrorKey(title.error)).toBe('validation.titleRequired');

      const url = giftInputSchema.safeParse({ title: 'X', points_cost: '10', image_url: 'bad', link_url: '' });
      expect(url.success).toBe(false);
      if (!url.success) expect(validationErrorKey(url.error)).toBe('validation.invalidUrl');
    });
  });
});
