import { Router } from 'express';
import {
  getProfile,
  updateProfile,
  getFollowers,
  getFollowing,
  followUser,
  unfollowUser,
  addFitnessGoal,
  updateFitnessGoal,
  deleteFitnessGoal,
  getFitnessGoals,
  addWorkoutStat,
  getWorkoutStats,
  getOnboardingStatus,
  completeBiometricsStep,
  completeProfileStep
} from '../controllers/userController';

const router = Router();

// Profile routes
router.get('/profile', getProfile);
router.put('/profile', updateProfile);

// Social routes
router.get('/followers', getFollowers);
router.get('/following', getFollowing);
router.post('/follow/:userId', followUser);
router.delete('/follow/:userId', unfollowUser);

// Fitness goals routes
router.get('/goals', getFitnessGoals);
router.post('/goals', addFitnessGoal);
router.put('/goals/:goalId', updateFitnessGoal);
router.delete('/goals/:goalId', deleteFitnessGoal);

// Workout stats routes
router.get('/stats', getWorkoutStats);
router.post('/stats', addWorkoutStat);

// Onboarding routes
router.get('/onboarding/status', getOnboardingStatus);
router.post('/onboarding/biometrics', completeBiometricsStep);
router.post('/onboarding/profile', completeProfileStep);

export default router;
