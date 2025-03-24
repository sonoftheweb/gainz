import { Request, Response } from 'express';
import { transformProfile, transformFitnessGoal, transformWorkoutStat, transformUser } from '../transformers/userTransformers';
import prisma from '../lib/prisma';
import { OnboardingStatus } from '../constants/onboarding';
import { 
  biometricsValidationSchema,
  genderValidationSchema,
  fitnessLevelValidationSchema,
} from '../validations/profileValidation';

/**
 * Retrieves the authenticated user's profile information.
 * 
 * This endpoint returns the complete profile of the currently authenticated user,
 * including personal details, biometric information, and associated fitness goals.
 * If the profile doesn't exist, it returns a 404 error.
 * 
 * @route GET /profile
 * @auth Requires user authentication
 * 
 * @returns {Object} 200 - Success response
 * @returns {string} 200.message - Success message
 * @returns {Object} 200.profile - User profile information
 * @returns {string} 200.profile.id - Profile ID
 * @returns {string} 200.profile.userId - User ID
 * @returns {string} 200.profile.firstName - User's first name
 * @returns {string} 200.profile.lastName - User's last name
 * @returns {string} 200.profile.bio - User's biography
 * @returns {string} 200.profile.profilePicture - URL to profile picture
 * @returns {string} 200.profile.dateOfBirth - User's date of birth
 * @returns {string} 200.profile.gender - User's gender
 * @returns {number} 200.profile.weight - User's weight
 * @returns {number} 200.profile.height - User's height
 * @returns {string} 200.profile.phoneNumber - User's phone number for 2FA
 * @returns {Object[]} 200.fitnessGoals - Array of user's fitness goals
 * 
 * @returns {Object} 401 - Unauthorized if user isn't authenticated
 * @returns {Object} 404 - Not found if profile doesn't exist
 * @returns {Object} 500 - Server error
 */
export const getProfile = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    // Find profile by userId
    const profile = await prisma.profile.findUnique({
      where: { userId },
    });

    if (!profile) {
      // Create an empty profile if it doesn't exist
      const newProfile = await prisma.profile.create({
        data: { userId },
      });
      
      return res.status(200).json({ 
        message: 'Profile created',
        profile: transformProfile(newProfile)
      });
    }

    res.status(200).json({ 
      message: 'Profile retrieved successfully',
      profile: transformProfile(profile)
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};



/**
 * Updates the authenticated user's profile information.
 * 
 * This endpoint allows updating various aspects of a user's profile. If the profile
 * doesn't exist, it creates a new one. This endpoint validates required fields and
 * returns the updated profile information.
 * 
 * @route PUT /profile
 * @auth Requires user authentication
 * 
 * @param {Object} req.body - The request body containing profile data
 * @param {string} req.body.firstName - User's first name (required)
 * @param {string} req.body.lastName - User's last name (required)
 * @param {string} [req.body.bio] - Optional user biography
 * @param {string} [req.body.profilePicture] - Optional URL to profile picture
 * @param {string} [req.body.dateOfBirth] - Optional date of birth (ISO format)
 * @param {string} [req.body.gender] - Optional gender
 * @param {number|string} [req.body.weight] - Optional weight
 * @param {number|string} [req.body.height] - Optional height
 * @param {string} [req.body.phoneNumber] - Optional phone number for 2FA
 * 
 * @returns {Object} 200 - Success response
 * @returns {string} 200.message - Success message
 * @returns {Object} 200.profile - Updated profile information
 * 
 * @returns {Object} 400 - Bad request when validation fails
 * @returns {string} 400.message - Error message
 * @returns {Object} 400.errors - Validation errors
 * 
 * @returns {Object} 401 - Unauthorized if user isn't authenticated
 * @returns {Object} 500 - Server error
 */
export const updateProfile = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const {
      firstName,
      lastName,
      bio,
      profilePicture,
      dateOfBirth,
      gender,
      weight,
      height,
      fitnessLevel
    } = req.body;

    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    // Validate weight and height if provided
    if (weight !== undefined || height !== undefined) {
      const { error } = biometricsValidationSchema.validate(
        { 
          weight: weight || null, 
          height: height || null 
        },
        { abortEarly: false }
      );
      if (error) {
        return res.status(400).json({ 
          message: 'Validation error', 
          errors: error.details.map(d => d.message)
        });
      }
    }
    
    // Validate gender if provided
    if (gender !== undefined) {
      const { error: genderError } = genderValidationSchema.validate(
        { gender }, 
        { allowUnknown: true }
      );
      if (genderError) {
        return res.status(400).json({
          message: 'Gender validation error',
          error: genderError.details[0].message
        });
      }
    }
    
    // Validate fitnessLevel if provided
    if (fitnessLevel !== undefined) {
      const { error: fitnessError } = fitnessLevelValidationSchema.validate(
        { fitnessLevel }, 
        { allowUnknown: true }
      );
      if (fitnessError) {
        return res.status(400).json({
          message: 'Fitness level validation error',
          error: fitnessError.details[0].message
        });
      }
    }

    // Build update data
    const updateData: any = {};
    
    if (firstName !== undefined) updateData.firstName = firstName;
    if (lastName !== undefined) updateData.lastName = lastName;
    if (bio !== undefined) updateData.bio = bio;
    if (profilePicture !== undefined) updateData.profilePicture = profilePicture;
    if (dateOfBirth !== undefined) updateData.dateOfBirth = new Date(dateOfBirth);
    if (gender !== undefined) updateData.gender = gender;
    if (weight !== undefined) updateData.weight = parseFloat(weight);
    if (height !== undefined) updateData.height = parseFloat(height);
    if (fitnessLevel !== undefined) updateData.fitnessLevel = fitnessLevel;

    // Find profile by userId
    let profile = await prisma.profile.findUnique({
      where: { userId },
    });

    if (!profile) {
      // Create profile if it doesn't exist
      profile = await prisma.profile.create({
        data: {
          userId,
          ...updateData,
        },
      });
    } else {
      // Update existing profile
      profile = await prisma.profile.update({
        where: { userId },
        data: updateData,
      });
    }

    res.status(200).json({ 
      message: 'Profile updated successfully',
      profile: transformProfile(profile)
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get followers
export const getFollowers = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;

    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    // Get profile ID for the user
    const profile = await prisma.profile.findUnique({
      where: { userId },
      select: { id: true }
    });

    if (!profile) {
      return res.status(404).json({ message: 'Profile not found' });
    }

    // Calculate pagination
    const skip = (page - 1) * limit;

    // Get followers
    const followers = await prisma.follow.findMany({
      where: { followingId: profile.id },
      include: {
        follower: true,
      },
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
    });

    // Get total count
    const total = await prisma.follow.count({
      where: { followingId: profile.id },
    });

    // Transform followers
    const transformedFollowers = followers.map((follow: any) => ({
      id: follow.id,
      profile: transformProfile(follow.follower),
      createdAt: follow.createdAt
    }));

    res.status(200).json({
      message: 'Followers retrieved successfully',
      followers: transformedFollowers,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get followers error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get following
export const getFollowing = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;

    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    // Get profile ID for the user
    const profile = await prisma.profile.findUnique({
      where: { userId },
      select: { id: true }
    });

    if (!profile) {
      return res.status(404).json({ message: 'Profile not found' });
    }

    // Calculate pagination
    const skip = (page - 1) * limit;

    // Get following
    const following = await prisma.follow.findMany({
      where: { followerId: profile.id },
      include: {
        following: true,
      },
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
    });

    // Get total count
    const total = await prisma.follow.count({
      where: { followerId: profile.id },
    });

    // Transform following
    const transformedFollowing = following.map((follow: any) => ({
      id: follow.id,
      profile: transformProfile(follow.following),
      createdAt: follow.createdAt
    }));

    res.status(200).json({
      message: 'Following retrieved successfully',
      following: transformedFollowing,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get following error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Follow user
export const followUser = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const targetUserId = req.params.userId;

    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    if (userId === targetUserId) {
      return res.status(400).json({ message: 'Cannot follow yourself' });
    }

    // Get profile IDs
    const followerProfile = await prisma.profile.findUnique({
      where: { userId },
      select: { id: true }
    });

    const followingProfile = await prisma.profile.findUnique({
      where: { userId: targetUserId },
      select: { id: true }
    });

    if (!followerProfile || !followingProfile) {
      return res.status(404).json({ message: 'Profile not found' });
    }

    // Check if already following
    const existingFollow = await prisma.follow.findFirst({
      where: {
        followerId: followerProfile.id,
        followingId: followingProfile.id
      }
    });

    if (existingFollow) {
      return res.status(400).json({ message: 'Already following this user' });
    }

    // Create follow relationship
    const follow = await prisma.follow.create({
      data: {
        followerId: followerProfile.id,
        followingId: followingProfile.id
      },
      include: {
        following: true
      }
    });

    res.status(201).json({
      message: 'User followed successfully',
      follow: {
        id: follow.id,
        profile: transformProfile(follow.following),
        createdAt: follow.createdAt
      }
    });
  } catch (error) {
    console.error('Follow user error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Unfollow user
export const unfollowUser = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const targetUserId = req.params.userId;

    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    // Get profile IDs
    const followerProfile = await prisma.profile.findUnique({
      where: { userId },
      select: { id: true }
    });

    const followingProfile = await prisma.profile.findUnique({
      where: { userId: targetUserId },
      select: { id: true }
    });

    if (!followerProfile || !followingProfile) {
      return res.status(404).json({ message: 'Profile not found' });
    }

    // Find follow relationship
    const follow = await prisma.follow.findFirst({
      where: {
        followerId: followerProfile.id,
        followingId: followingProfile.id
      }
    });

    if (!follow) {
      return res.status(404).json({ message: 'Not following this user' });
    }

    // Delete follow relationship
    await prisma.follow.delete({
      where: { id: follow.id }
    });

    res.status(200).json({
      message: 'User unfollowed successfully'
    });
  } catch (error) {
    console.error('Unfollow user error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get fitness goals
export const getFitnessGoals = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    // Get fitness goals
    const goals = await prisma.fitnessGoal.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' }
    });

    // Transform goals
    const transformedGoals = goals.map(transformFitnessGoal);

    res.status(200).json({
      message: 'Fitness goals retrieved successfully',
      goals: transformedGoals
    });
  } catch (error) {
    console.error('Get fitness goals error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Add fitness goal
export const addFitnessGoal = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const { title, description, targetDate, achieved } = req.body;

    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    if (!title) {
      return res.status(400).json({ message: 'Title is required' });
    }

    // Create fitness goal
    const goal = await prisma.fitnessGoal.create({
      data: {
        userId,
        title,
        description,
        targetDate: targetDate ? new Date(targetDate) : null,
        achieved: achieved || false
      }
    });

    res.status(201).json({
      message: 'Fitness goal created successfully',
      goal: transformFitnessGoal(goal)
    });
  } catch (error) {
    console.error('Add fitness goal error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Update fitness goal
export const updateFitnessGoal = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const goalId = req.params.goalId;
    const { title, description, targetDate, achieved } = req.body;

    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    // Check if goal exists and belongs to user
    const existingGoal = await prisma.fitnessGoal.findFirst({
      where: {
        id: goalId,
        userId
      }
    });

    if (!existingGoal) {
      return res.status(404).json({ message: 'Fitness goal not found' });
    }

    // Build update data
    const updateData: any = {};
    
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (targetDate !== undefined) updateData.targetDate = targetDate ? new Date(targetDate) : null;
    if (achieved !== undefined) updateData.achieved = achieved;

    // Update goal
    const goal = await prisma.fitnessGoal.update({
      where: { id: goalId },
      data: updateData
    });

    res.status(200).json({
      message: 'Fitness goal updated successfully',
      goal: transformFitnessGoal(goal)
    });
  } catch (error) {
    console.error('Update fitness goal error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Delete fitness goal
export const deleteFitnessGoal = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const goalId = req.params.goalId;

    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    // Check if goal exists and belongs to user
    const existingGoal = await prisma.fitnessGoal.findFirst({
      where: {
        id: goalId,
        userId
      }
    });

    if (!existingGoal) {
      return res.status(404).json({ message: 'Fitness goal not found' });
    }

    // Delete goal
    await prisma.fitnessGoal.delete({
      where: { id: goalId }
    });

    res.status(200).json({
      message: 'Fitness goal deleted successfully'
    });
  } catch (error) {
    console.error('Delete fitness goal error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Add workout stat
export const addWorkoutStat = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const { workout, duration, caloriesBurned, date } = req.body;

    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    if (!workout || !duration) {
      return res.status(400).json({ message: 'Workout and duration are required' });
    }

    // Create workout stat
    const workoutStat = await prisma.workoutStat.create({
      data: {
        userId,
        workout,
        duration: parseInt(duration),
        caloriesBurned: caloriesBurned ? parseInt(caloriesBurned) : null,
        date: date ? new Date(date) : new Date()
      }
    });

    res.status(201).json({
      message: 'Workout stat added successfully',
      workoutStat: transformWorkoutStat(workoutStat)
    });
  } catch (error) {
    console.error('Add workout stat error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get workout stats
export const getWorkoutStats = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
    const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;

    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    // Build filter
    const filter: any = { userId };
    
    if (startDate || endDate) {
      filter.date = {};
      if (startDate) filter.date.gte = startDate;
      if (endDate) filter.date.lte = endDate;
    }

    // Get workout stats
    const workoutStats = await prisma.workoutStat.findMany({
      where: filter,
      orderBy: { date: 'desc' }
    });

    // Transform workout stats
    const transformedStats = workoutStats.map(transformWorkoutStat);

    res.status(200).json({
      message: 'Workout stats retrieved successfully',
      workoutStats: transformedStats
    });
  } catch (error) {
    console.error('Get workout stats error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Retrieves the current onboarding status and completion information for the authenticated user.
 * 
 * This endpoint provides detailed information about the user's progress through the onboarding
 * flow, including whether they have a profile, if their profile is complete, and if their
 * required biometric information has been provided.
 * 
 * @route GET /onboarding/status
 * @auth Requires user authentication
 * 
 * @returns {Object} 200 - Success response
 * @returns {string} 200.message - Success message
 * @returns {Object} 200.onboarding - Detailed onboarding information
 * @returns {string} 200.onboarding.status - Current status (NOT_STARTED, IN_PROGRESS, or COMPLETED)
 * @returns {boolean} 200.onboarding.isComplete - Whether onboarding is fully completed
 * @returns {boolean} 200.onboarding.hasProfile - Whether the user has created a profile
 * @returns {boolean} 200.onboarding.profileComplete - Whether all profile fields are completed
 * @returns {boolean} 200.onboarding.biometricsComplete - Whether all biometric fields are completed
 * @returns {Object} 200.user - Basic user information including onboarding status
 * 
 * @returns {Object} 401 - Unauthorized if user isn't authenticated
 * @returns {Object} 404 - Not found if user doesn't exist
 * @returns {Object} 500 - Server error
 */
export const getOnboardingStatus = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    // Using type assertion to avoid TypeScript errors until IDE fully recognizes the schema changes
    const user = await (prisma as any).user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        onboardingStatus: true
      }
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if profile exists
    const profile = await prisma.profile.findUnique({
      where: { userId }
    });

    // Return onboarding status with additional context
    res.status(200).json({
      message: 'Onboarding status retrieved successfully',
      onboarding: {
        status: user.onboardingStatus,
        isComplete: user.onboardingStatus === OnboardingStatus.COMPLETED,
        hasProfile: !!profile,
        profileComplete: profile && profile.firstName && profile.lastName && profile.gender && profile.dateOfBirth && profile.weight && profile.height,
        biometricsComplete: profile && profile.gender && profile.dateOfBirth && profile.weight && profile.height
      },
      user: transformUser(user)
    });
  } catch (error) {
    console.error('Get onboarding status error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Updates a user's biometric information and tracks their onboarding progress.
 * 
 * This endpoint handles the biometrics step of the user onboarding process, collecting
 * essential physical metrics like height, weight, gender, and date of birth. When these
 * metrics are provided, the user's onboarding status is automatically updated to
 * IN_PROGRESS or maintained as COMPLETED if already completed.
 * 
 * @route POST /onboarding/biometrics
 * @auth Requires user authentication
 * 
 * @param {Object} req.body - The request body containing biometric data
 * @param {string} req.body.dateOfBirth - The user's date of birth in ISO format (YYYY-MM-DD)
 * @param {string} req.body.gender - The user's gender (must match Gender enum in schema)
 * @param {number|string} req.body.weight - The user's weight (will be converted to number)
 * @param {number|string} req.body.height - The user's height (will be converted to number)
 * 
 * @returns {Object} 200 - Success response
 * @returns {string} 200.message - Success message
 * @returns {Object} 200.profile - The updated user profile with biometric data
 * @returns {string} 200.onboardingStatus - The current onboarding status
 * 
 * @returns {Object} 400 - Bad request when required fields are missing
 * @returns {string} 400.message - Error message
 * @returns {string[]} 400.required - List of missing required fields
 * 
 * @returns {Object} 401 - Unauthorized if user isn't authenticated
 * @returns {Object} 500 - Server error
 */
export const completeBiometricsStep = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const { dateOfBirth, gender, weight, height } = req.body;

    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    // Validate required biometrics data
    if (!dateOfBirth || !gender || !weight || !height) {
      return res.status(400).json({ 
        message: 'Missing required fields', 
        required: ['dateOfBirth', 'gender', 'weight', 'height'] 
      });
    }
    
    // Validate gender using schema
    const { error: genderError } = genderValidationSchema.validate({ gender });
    if (genderError) {
      return res.status(400).json({
        message: 'Gender validation error',
        error: genderError.details[0].message
      });
    }

    // Check or create profile
    let profile = await prisma.profile.findUnique({
      where: { userId }
    });

    if (!profile) {
      profile = await prisma.profile.create({
        data: {
          userId,
          dateOfBirth: new Date(dateOfBirth),
          gender,
          weight: parseFloat(weight),
          height: parseFloat(height)
        }
      });
    } else {
      profile = await prisma.profile.update({
        where: { userId },
        data: {
          dateOfBirth: new Date(dateOfBirth),
          gender,
          weight: parseFloat(weight),
          height: parseFloat(height)
        }
      });
    }

    // Get current user to check onboarding status
    // Using type assertion to avoid TypeScript errors until IDE fully recognizes the schema changes
    const currentUser = await (prisma as any).user.findUnique({
      where: { id: userId },
      select: { onboardingStatus: true }
    });

    // Update user onboarding status to at least IN_PROGRESS
    // Using type assertion to avoid TypeScript errors until IDE fully recognizes the schema changes
    const user = await (prisma as any).user.update({
      where: { id: userId },
      data: {
        onboardingStatus: currentUser?.onboardingStatus === OnboardingStatus.COMPLETED ? OnboardingStatus.COMPLETED : OnboardingStatus.IN_PROGRESS
      }
    });

    res.status(200).json({
      message: 'Biometrics updated successfully',
      profile: transformProfile(profile),
      onboardingStatus: user.onboardingStatus
    });
  } catch (error) {
    console.error('Update biometrics error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Updates a user's profile information and potentially completes their onboarding process.
 * 
 * This endpoint handles the profile completion step of the user onboarding flow, collecting
 * personal information like name, bio, and profile picture. If the user has also completed
 * their biometrics (gender, date of birth, weight, height), this endpoint will automatically
 * set their onboarding status to COMPLETED.
 * 
 * @route POST /onboarding/profile
 * @auth Requires user authentication
 * 
 * @param {Object} req.body - The request body containing profile data
 * @param {string} req.body.firstName - The user's first name (required)
 * @param {string} req.body.lastName - The user's last name (required)
 * @param {string} [req.body.bio] - Optional user biography/description
 * @param {string} [req.body.profilePicture] - Optional URL or path to profile picture
 * @param {string} [req.body.phoneNumber] - Optional phone number for 2FA
 * 
 * @returns {Object} 200 - Success response
 * @returns {string} 200.message - Success message
 * @returns {Object} 200.profile - The updated user profile
 * @returns {string} 200.onboardingStatus - Current onboarding status (IN_PROGRESS or COMPLETED)
 * @returns {boolean} 200.onboardingComplete - Whether onboarding is fully completed
 * 
 * @returns {Object} 400 - Bad request when required fields are missing
 * @returns {string} 400.message - Error message
 * @returns {string[]} 400.required - List of missing required fields
 * 
 * @returns {Object} 401 - Unauthorized if user isn't authenticated
 * @returns {Object} 500 - Server error
 */
export const completeProfileStep = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const { firstName, lastName, bio, profilePicture, phoneNumber } = req.body;

    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    // Validate required profile data
    if (!firstName || !lastName) {
      return res.status(400).json({ 
        message: 'Missing required fields', 
        required: ['firstName', 'lastName'] 
      });
    }

    // Check or create profile
    let profile = await prisma.profile.findUnique({
      where: { userId }
    });

    if (!profile) {
      // Using type assertion to overcome the TypeScript issues with newly added fields
      profile = await prisma.profile.create({
        data: {
          userId,
          firstName,
          lastName,
          bio: bio || '',
          profilePicture: profilePicture || '',
          // Type assertion to allow phoneNumber until TypeScript recognizes the updated schema
          ...(phoneNumber ? { phoneNumber } : {})
        } as any
      });
    } else {
      // Using type assertion to overcome the TypeScript issues with newly added fields
      profile = await prisma.profile.update({
        where: { userId },
        data: {
          firstName,
          lastName,
          bio: bio || profile.bio,
          profilePicture: profilePicture || profile.profilePicture,
          // Type assertion to allow phoneNumber until TypeScript recognizes the updated schema
          ...(phoneNumber ? { phoneNumber } : {})
        } as any
      });
    }

    // Check if user has completed biometrics
    const biometricsComplete = profile.gender && profile.dateOfBirth && profile.weight && profile.height;

    // Update user onboarding status
    const newStatus = biometricsComplete ? OnboardingStatus.COMPLETED : OnboardingStatus.IN_PROGRESS;
    
    // Using type assertion to avoid TypeScript errors until IDE fully recognizes the schema changes
    const user = await (prisma as any).user.update({
      where: { id: userId },
      data: {
        onboardingStatus: newStatus
      }
    });

    res.status(200).json({
      message: 'Profile updated successfully',
      profile: transformProfile(profile),
      onboardingStatus: user.onboardingStatus,
      onboardingComplete: user.onboardingStatus === 'COMPLETED'
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};
