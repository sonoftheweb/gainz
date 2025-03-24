// Transform user data for API responses
export const transformUser = (user: any) => {
  return {
    id: user.id,
    email: user.email,
    onboardingStatus: user.onboardingStatus || 'NOT_STARTED',
    createdAt: user.createdAt,
    updatedAt: user.updatedAt
  };
};

// Transform profile data for API responses
export const transformProfile = (profile: any) => {
  return {
    id: profile.id,
    userId: profile.userId,
    firstName: profile.firstName || '',
    lastName: profile.lastName || '',
    fullName: profile.firstName && profile.lastName 
      ? `${profile.firstName} ${profile.lastName}` 
      : profile.firstName || profile.lastName || '',
    bio: profile.bio || '',
    profilePicture: profile.profilePicture || '',
    phoneNumber: profile.phoneNumber || '',
    dateOfBirth: profile.dateOfBirth ? profile.dateOfBirth.toISOString() : null,
    gender: profile.gender || '',
    weight: profile.weight || null,
    height: profile.height || null,
    fitnessLevel: profile.fitnessLevel || '',
    createdAt: profile.createdAt,
    updatedAt: profile.updatedAt
  };
};

// Transform fitness goal data for API responses
export const transformFitnessGoal = (goal: any) => {
  return {
    id: goal.id,
    userId: goal.userId,
    title: goal.title,
    description: goal.description || '',
    targetDate: goal.targetDate ? goal.targetDate.toISOString() : null,
    achieved: goal.achieved,
    createdAt: goal.createdAt,
    updatedAt: goal.updatedAt
  };
};

// Transform workout stat data for API responses
export const transformWorkoutStat = (stat: any) => {
  return {
    id: stat.id,
    userId: stat.userId,
    workout: stat.workout,
    duration: stat.duration,
    caloriesBurned: stat.caloriesBurned || null,
    date: stat.date.toISOString(),
    createdAt: stat.createdAt,
    updatedAt: stat.updatedAt
  };
};
