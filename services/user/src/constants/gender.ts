/**
 * Enum representing the gender options available to users.
 * These values correspond to the Gender enum in the Prisma schema.
 */
export const Gender = {
  /** Male gender identity */
  MALE: 'MALE',
  /** Female gender identity */
  FEMALE: 'FEMALE',
  /** Non-binary gender identity */
  NON_BINARY: 'NON_BINARY',
  /** Other gender identity not covered by the above options */
  OTHER: 'OTHER'
} as const;

/**
 * Type representing valid gender values that can be used for type safety.
 */
export type GenderType = typeof Gender[keyof typeof Gender];
