import { Request, Response } from 'express';
import { transformProfile, transformFitnessGoal, transformWorkoutStat } from '../transformers/userTransformers';
import prisma from '../lib/prisma';

// Get user profile
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

// Update user profile
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
// Test comment Mon Mar  3 00:25:34 AST 2025
