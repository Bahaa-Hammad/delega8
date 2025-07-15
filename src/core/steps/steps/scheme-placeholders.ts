import { z } from 'zod';

// -------------------------
// 1) Placeholder-Friendly Types
// -------------------------

/**
 * Accepts any string at config time (including placeholders like "{someVar}").
 */
export const placeholderFriendlyString = z.string();

/**
 * Accepts either a literal number or a string (placeholder) at config time.
 * Example: 10 or "{someNumber}".
 */
export const placeholderFriendlyNumber = z.union([z.number(), z.string()]);

/**
 * Accepts either a literal boolean or a string (placeholder) at config time.
 * Example: true, false, or "{someBoolean}".
 */
export const placeholderFriendlyBoolean = z.union([z.boolean(), z.string()]);

/**
 * Helper for enumerations that may also be placeholders at config time.
 * Example usage: placeholderFriendlyEnum(["domcontentloaded", "networkidle", ...])
 */
export function placeholderFriendlyEnum<T extends [string, ...string[]]>(
  values: T,
) {
  return z.union([z.enum(values), z.string()]);
}
