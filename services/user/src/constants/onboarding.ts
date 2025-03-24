/**
 * Enum representing the different states of the user onboarding process.
 */
export const OnboardingStatus = {
  /** User has not started the onboarding process */
  NOT_STARTED: 'NOT_STARTED',
  /** User has started but not completed all onboarding steps */
  IN_PROGRESS: 'IN_PROGRESS',
  /** User has completed all onboarding steps */
  COMPLETED: 'COMPLETED'
} as const;

export type OnboardingStatusType = typeof OnboardingStatus[keyof typeof OnboardingStatus];
