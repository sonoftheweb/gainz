import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import path from 'path';
import prisma from '../lib/prisma';
const GRPC_PORT = process.env.GRPC_PORT || 5003;

export const initializeGrpcServer = () => {
  const packageDefinition = protoLoader.loadSync(
    path.resolve(__dirname, '../proto/user.proto'),
    {
      keepCase: true,
      longs: String,
      enums: String,
      defaults: true,
      oneofs: true,
    }
  );

  const protoDescriptor = grpc.loadPackageDefinition(packageDefinition);
  
  // Access the service definition using proper type assertion
  const userProto: any = protoDescriptor.user;

  const server = new grpc.Server();

  // Register user service
  server.addService(userProto.UserService.service, {
    getProfile: getProfile,
    updateProfile: updateProfile,
    getFollowers: getFollowers,
    getFollowing: getFollowing
  });

  // Start the gRPC server
  server.bindAsync(
    `0.0.0.0:${GRPC_PORT}`,
    grpc.ServerCredentials.createInsecure(),
    (error, port) => {
      if (error) {
        console.error('Failed to start gRPC server:', error);
        return;
      }
      server.start();
      console.log(`User gRPC server running on port ${port}`);
    }
  );
};

// Implementation of gRPC methods
const getProfile = async (call: any, callback: any) => {
  try {
    const { userId } = call.request;

    if (!userId) {
      return callback(null, {
        success: false,
        error: 'User ID is required',
      });
    }

    // Find profile by userId
    const profile = await prisma.profile.findUnique({
      where: { userId },
    });

    if (!profile) {
      return callback(null, {
        success: false,
        error: 'Profile not found',
      });
    }

    callback(null, {
      success: true,
      profile: {
        id: profile.id,
        userId: profile.userId,
        firstName: profile.firstName || '',
        lastName: profile.lastName || '',
        bio: profile.bio || '',
        profilePicture: profile.profilePicture || '',
        dateOfBirth: profile.dateOfBirth ? profile.dateOfBirth.toISOString() : '',
        gender: profile.gender || '',
        weight: profile.weight || 0,
        height: profile.height || 0,
        fitnessLevel: profile.fitnessLevel || '',
        createdAt: profile.createdAt.toISOString(),
        updatedAt: profile.updatedAt.toISOString()
      },
    });
  } catch (error) {
    console.error('gRPC getProfile error:', error);
    callback(null, {
      success: false,
      error: 'Internal server error',
    });
  }
};

const updateProfile = async (call: any, callback: any) => {
  try {
    const {
      userId,
      firstName,
      lastName,
      bio,
      profilePicture,
      dateOfBirth,
      gender,
      weight,
      height,
      fitnessLevel
    } = call.request;

    if (!userId) {
      return callback(null, {
        success: false,
        error: 'User ID is required',
      });
    }

    // Check if profile exists
    let profile = await prisma.profile.findUnique({
      where: { userId },
    });

    // Update profile data
    const profileData: any = {
      firstName,
      lastName,
      bio,
      profilePicture,
      gender,
      weight,
      height,
      fitnessLevel
    };

    if (dateOfBirth) {
      profileData.dateOfBirth = new Date(dateOfBirth);
    }

    // Create or update profile
    if (profile) {
      profile = await prisma.profile.update({
        where: { userId },
        data: profileData,
      });
    } else {
      profile = await prisma.profile.create({
        data: {
          userId,
          ...profileData,
        },
      });
    }

    callback(null, {
      success: true,
      profile: {
        id: profile.id,
        userId: profile.userId,
        firstName: profile.firstName || '',
        lastName: profile.lastName || '',
        bio: profile.bio || '',
        profilePicture: profile.profilePicture || '',
        dateOfBirth: profile.dateOfBirth ? profile.dateOfBirth.toISOString() : '',
        gender: profile.gender || '',
        weight: profile.weight || 0,
        height: profile.height || 0,
        fitnessLevel: profile.fitnessLevel || '',
        createdAt: profile.createdAt.toISOString(),
        updatedAt: profile.updatedAt.toISOString()
      },
    });
  } catch (error) {
    console.error('gRPC updateProfile error:', error);
    callback(null, {
      success: false,
      error: 'Internal server error',
    });
  }
};

const getFollowers = async (call: any, callback: any) => {
  try {
    const { userId, page = 1, limit = 10 } = call.request;

    if (!userId) {
      return callback(null, {
        success: false,
        error: 'User ID is required',
      });
    }

    // Get profile ID for the user
    const profile = await prisma.profile.findUnique({
      where: { userId },
      select: { id: true }
    });

    if (!profile) {
      return callback(null, {
        success: false,
        error: 'Profile not found',
      });
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
    });

    // Get total count
    const total = await prisma.follow.count({
      where: { followingId: profile.id },
    });

    // Transform followers
    const transformedFollowers = followers.map((follow: any) => ({
      id: follow.id,
      profile: {
        id: follow.follower.id,
        userId: follow.follower.userId,
        firstName: follow.follower.firstName || '',
        lastName: follow.follower.lastName || '',
        bio: follow.follower.bio || '',
        profilePicture: follow.follower.profilePicture || '',
        dateOfBirth: follow.follower.dateOfBirth ? follow.follower.dateOfBirth.toISOString() : '',
        gender: follow.follower.gender || '',
        weight: follow.follower.weight || 0,
        height: follow.follower.height || 0,
        fitnessLevel: follow.follower.fitnessLevel || '',
        createdAt: follow.follower.createdAt.toISOString(),
        updatedAt: follow.follower.updatedAt.toISOString()
      },
      createdAt: follow.createdAt.toISOString()
    }));

    callback(null, {
      success: true,
      followers: transformedFollowers,
      total,
    });
  } catch (error) {
    console.error('gRPC getFollowers error:', error);
    callback(null, {
      success: false,
      error: 'Internal server error',
    });
  }
};

const getFollowing = async (call: any, callback: any) => {
  try {
    const { userId, page = 1, limit = 10 } = call.request;

    if (!userId) {
      return callback(null, {
        success: false,
        error: 'User ID is required',
      });
    }

    // Get profile ID for the user
    const profile = await prisma.profile.findUnique({
      where: { userId },
      select: { id: true }
    });

    if (!profile) {
      return callback(null, {
        success: false,
        error: 'Profile not found',
      });
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
    });

    // Get total count
    const total = await prisma.follow.count({
      where: { followerId: profile.id },
    });

    // Transform following
    const transformedFollowing = following.map((follow: any) => ({
      id: follow.id,
      profile: {
        id: follow.following.id,
        userId: follow.following.userId,
        firstName: follow.following.firstName || '',
        lastName: follow.following.lastName || '',
        bio: follow.following.bio || '',
        profilePicture: follow.following.profilePicture || '',
        dateOfBirth: follow.following.dateOfBirth ? follow.following.dateOfBirth.toISOString() : '',
        gender: follow.following.gender || '',
        weight: follow.following.weight || 0,
        height: follow.following.height || 0,
        fitnessLevel: follow.following.fitnessLevel || '',
        createdAt: follow.following.createdAt.toISOString(),
        updatedAt: follow.following.updatedAt.toISOString()
      },
      createdAt: follow.createdAt.toISOString()
    }));

    callback(null, {
      success: true,
      following: transformedFollowing,
      total,
    });
  } catch (error) {
    console.error('gRPC getFollowing error:', error);
    callback(null, {
      success: false,
      error: 'Internal server error',
    });
  }
};
