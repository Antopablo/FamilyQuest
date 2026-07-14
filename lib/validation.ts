import { z } from 'zod';

/** Upper bound for points to reject absurd values. */
export const POINTS_MAX = 1_000_000;

/**
 * A positive whole number of points, coerced from the string values used by the
 * form inputs. Rejects empty/NaN ('' , 'abc'), zero, negatives, decimals and
 * values above POINTS_MAX.
 */
export const pointsSchema = z.coerce.number().int().positive().max(POINTS_MAX);

const titleSchema = z.string().trim().min(1).max(100);

/**
 * Optional http(s) URL. An empty string is allowed and means "no URL"; any other
 * value must be a valid http/https URL.
 */
export const optionalUrlSchema = z
  .string()
  .trim()
  .url()
  .refine((v) => /^https?:\/\//i.test(v))
  .or(z.literal(''))
  .optional();

/** Create/edit a mission: a title and a valid points reward are required. */
export const missionInputSchema = z.object({
  title: titleSchema,
  points_reward: pointsSchema,
});

/** Create a gift: title + points cost required, image/link URLs optional. */
export const giftInputSchema = z.object({
  title: titleSchema,
  points_cost: pointsSchema,
  image_url: optionalUrlSchema,
  link_url: optionalUrlSchema,
});

/** Edit a gift: the points cost may be cleared (empty string → no cost). */
export const giftEditSchema = z.object({
  title: titleSchema,
  points_cost: z.union([z.literal(''), pointsSchema]),
  image_url: optionalUrlSchema,
  link_url: optionalUrlSchema,
});

/**
 * Maps the first issue of a ZodError to an i18n key, for a user-facing message.
 */
export function validationErrorKey(error: z.ZodError): string {
  const field = String(error.issues[0]?.path[0] ?? '');
  if (field === 'points_reward' || field === 'points_cost') return 'validation.invalidPoints';
  if (field === 'image_url' || field === 'link_url') return 'validation.invalidUrl';
  if (field === 'title') return 'validation.titleRequired';
  return 'validation.invalidInput';
}
