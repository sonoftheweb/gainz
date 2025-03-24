/**
 * Enum representing the different fitness levels a user can have.
 * These values correspond to the FitnessLevel enum in the Prisma schema.
 */
export const FitnessLevel = {
  /** For users who are new to fitness or have minimal experience */
  BEGINNER: 'BEGINNER',
  /** For users with moderate fitness experience and knowledge */
  INTERMEDIATE: 'INTERMEDIATE',
  /** For users with substantial fitness experience and knowledge */
  ADVANCED: 'ADVANCED'
} as const;

/**
 * Type representing valid fitness level values that can be used for type safety.
 */
export type FitnessLevelType = typeof FitnessLevel[keyof typeof FitnessLevel];
